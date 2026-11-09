import { createWorker, PSM } from "tesseract.js";
import { preprocessPassportImage } from "./preprocessor.ts";
import { parseTD3MRZ, findMRZLines, verifyCheckDigit, isChevronFillerToken } from "./mrz.ts";
import { parseVIZText, isValidISODate } from "./viz.ts";
import type { PassportOCRData, PassportFieldDetail, PassportFieldStatus } from "./types.ts";

const OCR_TIMEOUT_MS = 9000;

function createField(
  value: string,
  status: PassportFieldStatus,
  source: "mrz" | "viz" | "inferred",
  confidence?: number,
  notes?: string
): PassportFieldDetail {
  return {
    value: value || "",
    status: value ? status : "not_found",
    source,
    confidence,
    notes,
  };
}

/**
 * Executes a promise with an enforced timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Core Passport OCR Engine
 * Combines high-resolution MRZ crop OCR with whole-image VIZ extraction.
 */
export async function processPassportOCR(
  primaryBuffer: Buffer,
  secondaryBuffer?: Buffer
): Promise<PassportOCRData> {
  let mrzWorker: any = null;
  let vizWorker: any = null;

  try {
    // 1. Preprocess the primary image
    const preprocessed = await preprocessPassportImage(primaryBuffer);

    // 2. Initialize Tesseract workers
    mrzWorker = await createWorker("eng");
    vizWorker = await createWorker("eng");

    // Configure MRZ worker for single block with strict MRZ character set
    await mrzWorker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
    });

    // 3. Parallel OCR execution with safety timeout
    // For dual-page spreads, use the biodata page (bottomPage or leftPage) for primary VIZ
    const primaryVizImage = preprocessed.bottomPage || preprocessed.leftPage || preprocessed.fullImage;
    const mrzPromise = withTimeout(
      mrzWorker.recognize(preprocessed.mrzCrop),
      OCR_TIMEOUT_MS,
      "MRZ OCR"
    );
    const vizPromise = withTimeout(
      vizWorker.recognize(primaryVizImage),
      OCR_TIMEOUT_MS,
      "VIZ OCR"
    );

    const [mrzResult, vizResult] = (await Promise.all([mrzPromise, vizPromise])) as [any, any];

    const mrzText = mrzResult?.data?.text || "";
    const vizText = vizResult?.data?.text || "";
    let combinedRawText = `${vizText}\n${mrzText}`;

    // 4. Parse MRZ
    // Look for MRZ lines in dedicated crop first; fallback to full VIZ text
    const mrzCropLines = mrzText.split("\n").map((l: string) => l.trim()).filter(Boolean);
    const vizLines = vizText.split("\n").map((l: string) => l.trim()).filter(Boolean);

    let mrzCandidateLines = findMRZLines(mrzCropLines);
    if (!mrzCandidateLines) {
      mrzCandidateLines = findMRZLines(vizLines);
    }

    const mrzData = mrzCandidateLines
      ? parseTD3MRZ(mrzCandidateLines[0], mrzCandidateLines[1])
      : null;

    // 5. Parse VIZ
    let vizData = parseVIZText(vizText);

    // 6. Handle optional secondary buffer (e.g. Back / Address page) or dual-page spread
    // For horizontal spread, rightPage is Page 2. For vertical spread, topPage is Page 2.
    const secBuf =
      secondaryBuffer ||
      (preprocessed.isWideSpread ? preprocessed.rightPage : undefined) ||
      (preprocessed.isVerticalSpread ? preprocessed.topPage : undefined);

    if (secBuf) {
      try {
        const secPre = await preprocessPassportImage(secBuf);
        const secRes = (await withTimeout(
          vizWorker.recognize(secPre.fullImage),
          OCR_TIMEOUT_MS,
          "Page 2 VIZ OCR"
        )) as any;
        const secText = secRes?.data?.text || "";
        combinedRawText = `${secText}\n${combinedRawText}`;
        const secViz = parseVIZText(secText);

        // Merge Page 2 fields if Page 1 didn't have them
        if (!vizData.fatherName && secViz.fatherName) vizData.fatherName = secViz.fatherName;
        if (!vizData.motherName && secViz.motherName) vizData.motherName = secViz.motherName;
        if (!vizData.spouseName && secViz.spouseName) vizData.spouseName = secViz.spouseName;
        if (!vizData.address && secViz.address) vizData.address = secViz.address;
        if (!vizData.phone && secViz.phone) vizData.phone = secViz.phone;
        if (!vizData.placeOfBirth && secViz.placeOfBirth) vizData.placeOfBirth = secViz.placeOfBirth;
      } catch (secErr) {
        // Non-fatal if secondary page fails
      }
    }

    // 7. Harmonize MRZ and VIZ with validation statuses
    const fields: Record<string, PassportFieldDetail> = {};

    // Passport Number: Prefer validated MRZ
    let passportNo = "";
    if (mrzData?.passportNo && mrzData.docNumberValid) {
      passportNo = mrzData.passportNo;
      fields.passportNo = createField(
        passportNo,
        "validated",
        "mrz",
        100,
        "Validated with ICAO Doc 9303 check digit"
      );
    } else if (vizData.passportNo && mrzData?.rawLine2 && verifyCheckDigit(vizData.passportNo, mrzData.rawLine2.charAt(9))) {
      passportNo = vizData.passportNo;
      fields.passportNo = createField(passportNo, "validated", "viz", 95, "Validated with ICAO check digit");
    } else if (mrzData?.passportNo) {
      passportNo = mrzData.passportNo;
      fields.passportNo = createField(passportNo, "needs_review", "mrz", 70, "Check digit could not be verified");
    } else if (vizData.passportNo) {
      passportNo = vizData.passportNo;
      fields.passportNo = createField(passportNo, "extracted", "viz", 70);
    } else {
      fields.passportNo = createField("", "not_found", "inferred");
    }

    // Names: Cross-reference MRZ and VIZ
    // MRZ names do not carry check digits. Check for chevron noise or trailing fillers.
    const mrzSurnameClean = mrzData?.surname && !isChevronFillerToken(mrzData.surname) ? mrzData.surname : "";
    let mrzGivenClean = mrzData?.givenName && !isChevronFillerToken(mrzData.givenName) ? mrzData.givenName : "";

    let surname = "";
    let givenName = "";
    let nameStatus: PassportFieldStatus = "extracted";
    let nameSource: "mrz" | "viz" = "mrz";

    // If MRZ given name has chevron noise (e.g. "S ROBINS") and VIZ has clean "ROBIN"
    if (vizData.givenName && mrzGivenClean) {
      if (mrzGivenClean.includes(vizData.givenName) && vizData.givenName.length >= 3) {
        mrzGivenClean = vizData.givenName;
      }
    }

    if (mrzSurnameClean && mrzGivenClean) {
      // MRZ has clean names without chevron noise
      surname = mrzSurnameClean;
      givenName = mrzGivenClean;
      nameSource = "mrz";
      nameStatus = "validated";
    } else if (vizData.surname && vizData.givenName) {
      surname = vizData.surname;
      givenName = vizData.givenName;
      nameSource = "viz";
      nameStatus = "validated";
    } else if (vizData.surname || vizData.givenName) {
      surname = vizData.surname || mrzSurnameClean || "";
      givenName = vizData.givenName || mrzGivenClean || "";
      nameSource = "viz";
      nameStatus = "extracted";
    } else if (mrzSurnameClean || mrzGivenClean) {
      surname = mrzSurnameClean || "";
      givenName = mrzGivenClean || "";
      nameSource = "mrz";
      nameStatus = "extracted";
    }

    // Fallback if full combined text has additional VIZ details
    if (!vizData.fatherName || !vizData.motherName || !vizData.placeOfBirth || !vizData.spouseName) {
      const fallbackViz = parseVIZText(combinedRawText);
      if (!vizData.fatherName && fallbackViz.fatherName) vizData.fatherName = fallbackViz.fatherName;
      if (!vizData.motherName && fallbackViz.motherName) vizData.motherName = fallbackViz.motherName;
      if (!vizData.spouseName && fallbackViz.spouseName) vizData.spouseName = fallbackViz.spouseName;
      if (!vizData.placeOfBirth && fallbackViz.placeOfBirth) vizData.placeOfBirth = fallbackViz.placeOfBirth;
      if (!vizData.address && fallbackViz.address) vizData.address = fallbackViz.address;
    }

    const fullName = givenName && surname ? `${givenName} ${surname}` : givenName || surname || vizData.fullName || "";

    fields.givenName = createField(givenName, givenName ? nameStatus : "not_found", nameSource);
    fields.surname = createField(surname, surname ? nameStatus : "not_found", nameSource);
    fields.fullName = createField(fullName, fullName ? nameStatus : "not_found", nameSource);

    // Dates: Prefer validated MRZ, apply strict calendar validation
    let dob = "";
    if (mrzData?.dob && mrzData.dobValid && isValidISODate(mrzData.dob)) {
      dob = mrzData.dob;
      fields.dob = createField(dob, "validated", "mrz", 100);
    } else if (vizData.dob && isValidISODate(vizData.dob)) {
      dob = vizData.dob;
      fields.dob = createField(dob, "extracted", "viz", 85);
    } else if (mrzData?.dob && isValidISODate(mrzData.dob)) {
      dob = mrzData.dob;
      fields.dob = createField(dob, "needs_review", "mrz", 65);
    } else {
      fields.dob = createField("", "not_found", "inferred");
    }

    let expiryDate = "";
    if (mrzData?.expiryDate && mrzData.expiryValid && isValidISODate(mrzData.expiryDate)) {
      expiryDate = mrzData.expiryDate;
      fields.expiryDate = createField(expiryDate, "validated", "mrz", 100);
    } else if (vizData.expiryDate && isValidISODate(vizData.expiryDate)) {
      expiryDate = vizData.expiryDate;
      fields.expiryDate = createField(expiryDate, "extracted", "viz", 85);
    } else if (mrzData?.expiryDate && isValidISODate(mrzData.expiryDate)) {
      expiryDate = mrzData.expiryDate;
      fields.expiryDate = createField(expiryDate, "needs_review", "mrz", 65);
    } else {
      fields.expiryDate = createField("", "not_found", "inferred");
    }

    // Issue Date: Only present in VIZ (or inferred from expiry date)
    let issueDate = "";
    if (vizData.issueDate && isValidISODate(vizData.issueDate)) {
      // Validate chronology: issue date must be before expiry date
      if (!expiryDate || vizData.issueDate < expiryDate) {
        issueDate = vizData.issueDate;
        fields.issueDate = createField(issueDate, "extracted", "viz", 85);
      }
    }
    if (!issueDate && expiryDate && isValidISODate(expiryDate)) {
      const expY = parseInt(expiryDate.slice(0, 4), 10);
      const expM = parseInt(expiryDate.slice(5, 7), 10);
      const expD = parseInt(expiryDate.slice(8, 10), 10);
      // For standard 10-year passport, validity is 10 years minus 1 day
      const estDate = new Date(Date.UTC(expY - 10, expM - 1, expD + 1));
      const estY = estDate.getUTCFullYear();
      const estM = String(estDate.getUTCMonth() + 1).padStart(2, "0");
      const estD = String(estDate.getUTCDate()).padStart(2, "0");
      const candidateIssue = `${estY}-${estM}-${estD}`;
      if (isValidISODate(candidateIssue)) {
        issueDate = candidateIssue;
        fields.issueDate = createField(issueDate, "needs_review", "inferred", 60, "Estimated from 10-year validity");
      }
    }
    if (!issueDate) {
      fields.issueDate = createField("", "not_found", "inferred");
    }

    // Sex: Prefer MRZ
    const sex = mrzData?.sex || vizData.sex || "";
    fields.sex = createField(sex, mrzData?.sex ? "validated" : sex ? "extracted" : "not_found", mrzData?.sex ? "mrz" : "viz");

    // Nationality: Prefer MRZ
    const nationality = mrzData?.nationality || vizData.nationality || "";
    fields.nationality = createField(nationality, nationality ? "validated" : "not_found", mrzData?.nationality ? "mrz" : "viz");

    // Place of Birth
    const placeOfBirth = vizData.placeOfBirth || "";
    fields.placeOfBirth = createField(placeOfBirth, placeOfBirth ? "extracted" : "not_found", "viz");

    // Emergency Contact & Family (Page 2)
    const fatherName = vizData.fatherName || "";
    fields.fatherName = createField(fatherName, fatherName ? "extracted" : "not_found", "viz");

    const motherName = vizData.motherName || "";
    fields.motherName = createField(motherName, motherName ? "extracted" : "not_found", "viz");

    const spouseName = vizData.spouseName || "";
    fields.spouseName = createField(spouseName, spouseName ? "extracted" : "not_found", "viz");

    // NID / Personal No
    const nid = mrzData?.nid || vizData.nid || "";
    fields.nid = createField(nid, nid ? "extracted" : "not_found", mrzData?.nid ? "mrz" : "viz");

    // Phone & Address
    const phone = vizData.phone || "";
    fields.phone = createField(phone, phone ? "extracted" : "not_found", "viz");

    const address = vizData.address || "";
    fields.address = createField(address, address ? "extracted" : "not_found", "viz");

    return {
      passportNo,
      givenName,
      surname,
      fullName,
      dob,
      issueDate,
      expiryDate,
      sex,
      nationality,
      placeOfBirth,
      fatherName,
      motherName,
      spouseName,
      nid,
      phone,
      address,
      alreadyExists: false,
      fields,
      mrzValidation: {
        found: Boolean(mrzData),
        docNumberValid: Boolean(mrzData?.docNumberValid),
        dobValid: Boolean(mrzData?.dobValid),
        expiryValid: Boolean(mrzData?.expiryValid),
        compositeValid: Boolean(mrzData?.compositeValid),
        rawLines: mrzCandidateLines || [],
      },
      rawText: combinedRawText,
    };
  } finally {
    // Terminate workers safely
    if (mrzWorker) {
      try {
        await mrzWorker.terminate();
      } catch {}
    }
    if (vizWorker) {
      try {
        await vizWorker.terminate();
      } catch {}
    }
  }
}
