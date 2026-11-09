/**
 * Visual Inspection Zone (VIZ) Text Extraction and Field Parsing
 * Handles standard English and bilingual (English + Bengali) passport layouts.
 */

const BANGLADESH_DISTRICTS = new Set([
  "BAGERHAT", "BANDARBAN", "BARGUNA", "BARISAL", "BHOLA", "BOGRA", "BRAHMANBARIA",
  "CHANDPUR", "CHAPAINAWABGANJ", "CHITTAGONG", "CHUADANGA", "COMILLA", "COXS BAZAR",
  "DHAKA", "DINAJPUR", "FARIDPUR", "FENI", "GAIBANDHA", "GAZIPUR", "GOPALGANJ",
  "HABIGANJ", "JAMALPUR", "JESSORE", "JHALOKATI", "JHENAIDAH", "JOYPURHAT",
  "KHAGRACHARI", "KHULNA", "KISHOREGANJ", "KURIGRAM", "KUSHTIA", "LAKSHMIPUR",
  "LALMONIRHAT", "MADARIPUR", "MAGURA", "MANIKGANJ", "MEHERPUR", "MOULVIBAZAR",
  "MUNSHIGANJ", "MYMENSINGH", "NAOGAON", "NARAIL", "NARAYANGANJ", "NARSINGDI",
  "NATORE", "NETROKONA", "NILPHAMARI", "NOAKHALI", "PABNA", "PANCHAGARH",
  "PATUAKHALI", "PIROJPUR", "RAJBARI", "RAJSHAHI", "RANGAMATI", "RANGPUR",
  "SATKHIRA", "SHARIATPUR", "SHERPUR", "SIRAJGANJ", "SUNAMGANJ", "SYLHET",
  "TANGHAIL", "THAKURGAON",
]);

const MONTHS: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

/**
 * Strict calendar date validation (verifies day count per month and leap year rules)
 */
export function isValidISODate(dateStr: string): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [yStr, mStr, dStr] = dateStr.split("-");
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);

  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  const isLeap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d <= daysInMonth[m - 1];
}

export function normalizeDate(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.trim().replace(/[,\.]/g, "/").replace(/\s+/g, " ");

  // DD MMM YYYY (e.g. 01 JAN 1995, 29-OCT-2023, 29 0CT 2023)
  const dMmmY = cleaned.match(/(\d{1,2})[\s\-\/]*([A-Za-z0-9]{3,4})[\s\-\/]*(\d{4})/i);
  if (dMmmY) {
    const day = dMmmY[1].padStart(2, "0");
    let mStr = dMmmY[2].slice(0, 3).toUpperCase().replace(/0/g, "O").replace(/1/g, "I");
    if (mStr === "IAN") mStr = "JAN";
    const month = MONTHS[mStr];
    const year = parseInt(dMmmY[3], 10);
    if (month && year >= 1920 && year <= 2055) {
      const candidate = `${year}-${month}-${day}`;
      if (isValidISODate(candidate)) return candidate;
    }
  }

  // DD/MM/YYYY
  const dmy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const year = parseInt(dmy[3], 10);
    if (year >= 1920 && year <= 2055) {
      const candidate = `${year}-${month}-${day}`;
      if (isValidISODate(candidate)) return candidate;
    }
  }

  // YYYY/MM/DD
  const ymd = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = ymd[2].padStart(2, "0");
    const day = ymd[3].padStart(2, "0");
    if (year >= 1920 && year <= 2055) {
      const candidate = `${year}-${month}-${day}`;
      if (isValidISODate(candidate)) return candidate;
    }
  }

  return "";
}

/**
 * Strips Bengali script characters, non-alphabetic noise, and trailing symbols to retain clean Latin names
 */
export function cleanLatinName(str: string): string {
  if (!str) return "";
  let base = str;
  if (base.includes("=")) {
    base = base.split("=")[0];
  }

  let cleaned = base
    .replace(/[\u0980-\u09FF]+/g, " ") // strip Bengali script
    .replace(/[^A-Za-z\s\.\-]/g, " ")  // keep only Latin letters, spaces, dots, hyphens
    .replace(/\s+/g, " ")
    .trim();

  // Strip trailing isolated single-letter noise, numbers, or lowercase OCR noise tokens (e.g. "A C ST", "4 my")
  const tokens = cleaned.split(" ").filter(Boolean);
  while (
    tokens.length > 1 &&
    (tokens[tokens.length - 1].length <= 2 || tokens[tokens.length - 1] === tokens[tokens.length - 1].toLowerCase()) &&
    !/[AEIOUY]/i.test(tokens[tokens.length - 1])
  ) {
    tokens.pop();
  }
  while (tokens.length > 1 && tokens[tokens.length - 1].length === 1) {
    tokens.pop();
  }
  if (tokens.length > 1 && tokens[tokens.length - 1].length === 2 && tokens[tokens.length - 1] === tokens[tokens.length - 1].toLowerCase()) {
    tokens.pop();
  }
  return tokens.join(" ").trim();
}

export function cleanAddressLine(line: string): string {
  if (!line) return "";
  let cleaned = line
    .replace(/[\u0980-\u09FF]+/g, " ")
    .replace(/^[\s:\-\=\>\.\/—–_]+/, "")
    .replace(/[\s:\-\=\>\.\/—–_]+$/, "")
    .replace(/\s*—\s*[a-z]{1,2}$/i, "") // strip trailing "— ie" or "—c"
    .replace(/\s+/g, " ")
    .trim();

  // If line contains no words or is just 1 single letter and symbols (like "J : — /"), ignore
  const words = cleaned.split(/[\s,]+/).filter((w) => /[A-Za-z0-9]{2,}/.test(w));
  if (words.length === 0) return "";

  return cleaned;
}

export interface VIZParseResult {
  passportNo: string;
  surname: string;
  givenName: string;
  fullName: string;
  dob: string;
  issueDate: string;
  expiryDate: string;
  sex: string;
  nationality: string;
  placeOfBirth: string;
  fatherName: string;
  motherName: string;
  spouseName: string;
  nid: string;
  phone: string;
  address: string;
}

export function parseVIZText(text: string): VIZParseResult {
  let passportNo = "";
  let surname = "";
  let givenName = "";
  let dob = "";
  let issueDate = "";
  let expiryDate = "";
  let sex = "";
  let nationality = "";
  let placeOfBirth = "";
  let fatherName = "";
  let motherName = "";
  let spouseName = "";
  let nid = "";
  let phone = "";
  let address = "";

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Passport Number
  const ppLabelMatch = text.match(/(?:Passport\s*(?:No|Number)|Pass\s*No)[^\w\n]*([A-Z0-9]{7,10})/i);
  if (ppLabelMatch) {
    passportNo = ppLabelMatch[1].toUpperCase().trim();
  } else {
    const standalonePp = text.match(/\b([A-Z][0-9]{8}|[A-Z]{2}[0-9]{7}|[B-Z][0-9]{7})\b/);
    if (standalonePp) {
      passportNo = standalonePp[1].toUpperCase();
    }
  }

  // 2. Nationality
  if (/(?:Nationality|জাতীয়তা)[^\w\n]*(?:BANGLADESHI|BANGLADESH|BGD)/i.test(text) || /PEOPLE'?S REPUBLIC OF BANGLADESH/i.test(text)) {
    nationality = "BANGLADESHI";
  }

  // 3. Surname
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Surname|পদবী)/i.test(line)) {
      // Check text after label on the same line
      const afterLabel = line.replace(/.*?(?:Surname|পদবী)[^\w]*/i, "");
      const cleanedSameLine = cleanLatinName(afterLabel);
      if (cleanedSameLine.length >= 2 && !/^(Given|Name|Nationality|Date|Country|Bangladeshi)/i.test(cleanedSameLine)) {
        surname = cleanedSameLine;
        break;
      }
      // Or on the immediate next lines
      for (let j = 1; j <= 2 && i + j < lines.length; j++) {
        const nextClean = cleanLatinName(lines[i + j]);
        if (nextClean.length >= 2 && !/^(Given|Name|Nationality|Date|Country|Bangladeshi|Place|Sex)/i.test(nextClean)) {
          surname = nextClean;
          break;
        }
      }
      if (surname) break;
    }
  }

  // 4. Given Name
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Given\s*Name[s]?|প্রদত্ত\s*নাম)/i.test(line)) {
      const afterLabel = line.replace(/.*?(?:Given\s*Name[s]?|প্রদত্ত\s*নাম)[^\w]*/i, "");
      const cleanedSameLine = cleanLatinName(afterLabel);
      const isWeakSameLine =
        !cleanedSameLine ||
        !/[AEIOUY]/i.test(cleanedSameLine) ||
        cleanedSameLine === cleanedSameLine.toLowerCase();

      if (!isWeakSameLine && !/^(Nationality|Date|Sex|Place|Country|Bangladeshi|Personal)/i.test(cleanedSameLine)) {
        givenName = cleanedSameLine;
        break;
      }
      for (let j = 1; j <= 2 && i + j < lines.length; j++) {
        const nextRaw = lines[i + j].split(/[\s=©HLANMBRT]+/)[0];
        const nextClean = cleanLatinName(nextRaw || lines[i + j]);
        if (nextClean.length >= 2 && !/^(Nationality|Date|Sex|Place|Country|Bangladeshi|Personal)/i.test(nextClean)) {
          givenName = nextClean;
          break;
        }
      }
      if (givenName) break;
    }
  }

  const fullName = givenName && surname ? `${givenName} ${surname}` : givenName || surname;

  // 5. Date of Birth (Look within 3 lines of label)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Date\s*of\s*Birth|DOB|জন্ম\s*তারিখ)/i.test(line)) {
      const block = lines.slice(i, i + 3).join(" ");
      const match = block.match(/(\d{1,2}[\s\-\/]*[A-Za-z0-9]{3,4}[\s\-\/]*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/);
      if (match) {
        const norm = normalizeDate(match[1]);
        if (norm) { dob = norm; break; }
      }
    }
  }

  // 6. Dates of Issue and Expiry (Multi-column / multi-line aware)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasIssue = /(?:Date\s*of\s*Issue|প্রদানের\s*তারিখ)/i.test(line);
    const hasExpiry = /(?:Date\s*of\s*Expiry|মেয়াদোত্তীর্ণের\s*তারিখ)/i.test(line);

    if (hasIssue || hasExpiry) {
      // Gather text from this line and the next 3 lines
      const windowText = lines.slice(i, i + 4).join(" ");
      const foundDates = [...windowText.matchAll(/(\d{1,2}[\s\-\/]*[A-Za-z0-9]{3,4}[\s\-\/]*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/g)]
        .map((m) => normalizeDate(m[1]))
        .filter((d): d is string => Boolean(d));

      const uniqueDates = Array.from(new Set(foundDates)).sort();

      if (uniqueDates.length >= 2) {
        issueDate = uniqueDates[0];
        expiryDate = uniqueDates[uniqueDates.length - 1];
        break;
      } else if (uniqueDates.length === 1) {
        if (hasIssue && !issueDate) issueDate = uniqueDates[0];
        if (hasExpiry && !expiryDate) expiryDate = uniqueDates[0];
      }
    }
  }

  // Final fallback date regexes if lines didn't capture them
  if (!dob) {
    const dobFallback = text.match(/(?:Date\s*of\s*Birth|DOB|জন্ম\s*তারিখ)[\s\S]{0,80}?(\d{1,2}[\s\-\/]*[A-Za-z0-9]{3,4}[\s\-\/]*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i);
    if (dobFallback) dob = normalizeDate(dobFallback[1]);
  }
  if (!issueDate) {
    const issueFallback = text.match(/(?:Date\s*of\s*Issue|প্রদানের\s*তারিখ)[\s\S]{0,80}?(\d{1,2}[\s\-\/]*[A-Za-z0-9]{3,4}[\s\-\/]*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i);
    if (issueFallback) issueDate = normalizeDate(issueFallback[1]);
  }
  if (!expiryDate) {
    const expFallback = text.match(/(?:Date\s*of\s*Expiry|মেয়াদোত্তীর্ণের\s*তারিখ)[\s\S]{0,80}?(\d{1,2}[\s\-\/]*[A-Za-z0-9]{3,4}[\s\-\/]*\d{4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i);
    if (expFallback) expiryDate = normalizeDate(expFallback[1]);
  }

  // 7. Sex
  const sexMatch = text.match(/Sex[\s\S]*?\b(Male|Female|M|F)\b/i);
  if (sexMatch) {
    const s = sexMatch[1].toUpperCase();
    sex = s.startsWith("F") ? "Female" : "Male";
  }

  // 8. Place of Birth
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Place\s*of\s*Birth|জন্মস্থান)/i.test(line)) {
      for (let j = 0; j <= 3 && i + j < lines.length; j++) {
        const candidateLine = cleanLatinName(lines[i + j]).toUpperCase();
        for (const dist of BANGLADESH_DISTRICTS) {
          if (new RegExp(`\\b${dist}\\b`).test(candidateLine)) {
            placeOfBirth = dist;
            break;
          }
        }
        if (placeOfBirth) break;
      }
      if (placeOfBirth) break;
    }
  }
  if (!placeOfBirth) {
    // Scan biodata lines for any recognized Bangladesh District
    for (const l of lines) {
      const upper = l.toUpperCase();
      for (const dist of BANGLADESH_DISTRICTS) {
        if (new RegExp(`\\b${dist}\\b`).test(upper)) {
          if (
            !upper.includes("REPUBLIC") &&
            !upper.includes("WARD") &&
            !upper.includes("BARI") &&
            !upper.includes("EMERGENCY") &&
            !upper.includes("ADDRESS") &&
            !upper.includes("SHARIF") &&
            !upper.includes("RAJOIR")
          ) {
            placeOfBirth = dist;
            break;
          }
        }
      }
      if (placeOfBirth) break;
    }
  }

  // 9. NID / Personal No
  const nidMatch = text.match(/(?:Personal\s*No|National\s*ID|NID)[^0-9\n]*([0-9]{10,17})/i);
  if (nidMatch) {
    nid = nidMatch[1].trim();
  }

  // 10. Father's Name (Page 2 - handles "Fathers Namo:", "Father's Name:", "Father Name:")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/Father(?:s|'s)?\s*Nam[eo]|পিতার\s*নাম/i.test(line)) {
      const after = line.replace(/.*?(?:Father(?:s|'s)?\s*Nam[eo]|পিতার\s*নাম)[^\w]*/i, "");
      const cleanSame = cleanLatinName(after);
      if (cleanSame.length >= 2 && !/^(Mother|Spouse|Name|Address|Permanent)/i.test(cleanSame)) {
        fatherName = cleanSame;
        break;
      }
      for (let j = 1; j <= 2 && i + j < lines.length; j++) {
        const nextClean = cleanLatinName(lines[i + j]);
        if (nextClean.length >= 2 && !/^(Father|Mother|Spouse|Name|Address|Permanent|Emergency)/i.test(nextClean)) {
          fatherName = nextClean;
          break;
        }
      }
      if (fatherName) break;
    }
  }
  if (!fatherName) {
    const relFather =
      text.match(/(?:Name|Meme|Nam[eo]):\s*([A-Za-z\s]+)[\n\r]+\s*Relationship:\s*FATHER/i) ||
      text.match(/Relationship:\s*FATHER[\s\S]*?(?:Name|Meme|Nam[eo]):\s*([A-Za-z\s]+)/i);
    if (relFather) {
      fatherName = cleanLatinName(relFather[1]);
    }
  }

  // 11. Mother's Name (Page 2 - handles "Mothers Name:", "Mother's Name:")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/Mother(?:s|'s)?\s*Nam[eo]|মাতার\s*নাম/i.test(line)) {
      const after = line.replace(/.*?(?:Mother(?:s|'s)?\s*Nam[eo]|মাতার\s*নাম)[^\w]*/i, "");
      const cleanSame = cleanLatinName(after);
      if (cleanSame.length >= 2 && !/^(Father|Spouse|Name|Address|Permanent)/i.test(cleanSame)) {
        motherName = cleanSame;
        break;
      }
      for (let j = 1; j <= 2 && i + j < lines.length; j++) {
        const nextClean = cleanLatinName(lines[i + j]);
        if (nextClean.length >= 2 && !/^(Father|Mother|Spouse|Name|Address|Permanent|Emergency|Relationship)/i.test(nextClean)) {
          motherName = nextClean;
          break;
        }
      }
      if (motherName) break;
    }
  }
  if (!motherName) {
    const relMother =
      text.match(/(?:Name|Meme|Nam[eo]):\s*([A-Za-z\s]+)[\n\r]+\s*Relationship:\s*MOTHER/i) ||
      text.match(/Relationship:\s*MOTHER[\s\S]*?(?:Name|Meme|Nam[eo]):\s*([A-Za-z\s]+)/i);
    if (relMother) {
      motherName = cleanLatinName(relMother[1]);
    }
  }

  // 12. Spouse's Name (Page 2 - handles "Spouses Name:", "Spouse's Name:")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/Spouse(?:s|'s)?\s*Nam[eo]|স্বামী\s*বা\s*স্ত্রীর\s*নাম/i.test(line)) {
      const after = line.replace(/.*?(?:Spouse(?:s|'s)?\s*Nam[eo]|স্বামী\s*বা\s*স্ত্রীর\s*নাম)[^\w]*/i, "");
      const cleanSame = cleanLatinName(after);
      if (cleanSame.length >= 2 && !/^(Permanent|Address|Name|Emergency)/i.test(cleanSame)) {
        spouseName = cleanSame;
        break;
      }
      for (let j = 1; j <= 2 && i + j < lines.length; j++) {
        const nextClean = cleanLatinName(lines[i + j]);
        if (nextClean.length >= 2 && !/^(Permanent|Address|Name|Emergency|Relationship)/i.test(nextClean)) {
          spouseName = nextClean;
          break;
        }
      }
      if (spouseName) break;
    }
  }

  // 13. Permanent Address (Page 2) - Multi-line extraction with noise cleaning
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Permanent\s*Address|Address|ponmanont\s*Address|স্থায়ী\s*ঠিকানা)/i.test(line)) {
      const addrLines: string[] = [];
      const after = line.replace(/.*?(?:Permanent\s*Address|Address|ponmanont\s*Address|স্থায়ী\s*ঠিকানা)[^\w]*/i, "");
      const cleanAfter = cleanAddressLine(after);
      if (cleanAfter.length >= 5) {
        addrLines.push(cleanAfter);
      }
      for (let j = 1; j <= 3 && i + j < lines.length; j++) {
        const nextLine = lines[i + j];
        if (/(?:Emergency|Telephone|Contact|Relationship|Spouse|Father|Mother|National|NID|Signature|Issuing)/i.test(nextLine)) {
          break;
        }
        const cleanNext = cleanAddressLine(nextLine);
        if (cleanNext) {
          addrLines.push(cleanNext);
        }
      }
      if (addrLines.length > 0) {
        address = addrLines.join(", ").replace(/,\s*,+/g, ",");
        break;
      }
    }
  }

  // 14. Phone (Mobile number)
  const phoneMatch = text.match(/(?:\+?8801|01)[3-9]\d{8}/);
  if (phoneMatch) {
    phone = phoneMatch[0];
  }

  return {
    passportNo,
    surname,
    givenName,
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
  };
}
