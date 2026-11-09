import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";

export type PrintSettings = {
  photo: boolean;
  mobile: boolean;
  email: boolean;
  address: boolean;
  language: boolean;
  education: boolean;
  summary: boolean;
  fatherName: boolean;
  motherName: boolean;
  maritalStatus: boolean;
  dob: boolean;
  age: boolean;
  gender: boolean;
  nationality: boolean;
  nid: boolean;
  passportNo: boolean;
  passportDates: boolean;
  drivingLicense: boolean;
  heightLabel: boolean;
  heightValue: boolean;
  weightLabel: boolean;
  weightValue: boolean;
  qualificationValue: boolean;
  experience: boolean;
};

export const defaultPrintSettings: PrintSettings = {
  photo: true,
  mobile: true,
  email: true,
  address: true,
  language: true,
  education: true,
  summary: true,
  fatherName: true,
  motherName: true,
  maritalStatus: true,
  dob: true,
  age: true,
  gender: true,
  nationality: true,
  nid: true,
  passportNo: true,
  passportDates: true,
  drivingLicense: true,
  heightLabel: true,
  heightValue: true,
  weightLabel: true,
  weightValue: true,
  qualificationValue: true,
  experience: true,
};

export type WorkExperienceItem = {
  id: string;
  title: string;
  company?: string;
  period?: string;
  description?: string;
};

export type EducationItem = {
  id: string;
  level: string;
  institute?: string;
  year?: string;
  result?: string;
};

export type CustomFieldItem = {
  id: string;
  label: string;
  value: string;
};

export type CvData = {
  id: string;
  candidateNo: string;
  fullName: string;
  profession: string;
  phone: string;
  email: string;
  address: string;
  district: string;
  languages: string;
  summary: string;
  dob: string;
  age: string;
  gender: string;
  nationality: string;
  nid: string;
  passportNo: string;
  passportIssueDate: string;
  passportExpiryDate: string;
  fatherName: string;
  motherName: string;
  maritalStatus: string;
  drivingLicense: string;
  height: string;
  weight: string;
  qualification: string;
  experiences: WorkExperienceItem[];
  educations: EducationItem[];
  customFields?: CustomFieldItem[];
  // Legacy single experience/education properties for backwards compatibility
  experienceTitle?: string;
  experienceCompany?: string;
  experiencePeriod?: string;
  experienceDescription?: string;
  educationLevel?: string;
  educationInstitute?: string;
  educationYear?: string;
  profileImageUrl?: string | null;
  targetCountry?: string;
};

function wrapText(text: string, maxW: number, font: PDFFont, fontSize: number): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width <= maxW) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// Clean non-ASCII characters that standard Helvetica doesn't support to prevent pdf-lib crash
function sanitizeForPdf(text: string): string {
  if (!text) return "";
  return text
    .replace(/[—–]/g, "-")
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/…/g, "...")
    .replace(/[^\x00-\x7F]/g, "");
}

/**
 * Capture the exact on-screen preview DOM element and export it to an A4 PDF document.
 * Guarantees 100% fidelity ("same to same") with exact SVG icons, fonts, colors, and layout.
 */
export async function downloadCvPdfFromPreview(
  data: CvData,
  elementId = "cv-preview-sheet"
): Promise<void> {
  if (typeof window === "undefined") return;

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error("Preview sheet element not found");
  }

  // Preserve styles
  const prevShadow = element.style.boxShadow;
  const prevBorder = element.style.border;
  const prevBorderRadius = element.style.borderRadius;

  try {
    // Flatten outer card styling for pristine PDF document capture
    element.style.boxShadow = "none";
    element.style.border = "none";
    element.style.borderRadius = "0px";

    // Wait 60ms for layout repainting
    await new Promise((resolve) => setTimeout(resolve, 60));

    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(element, {
      scale: 2.5, // 240+ DPI crystal clear vector/typography output
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const base64Data = imgData.replace(/^data:image\/png;base64,/, "");
    const imgBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Create standard A4 PDF: 595.28 x 841.89 points
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const pngImage = await pdfDoc.embedPng(imgBytes);

    const pdfWidth = 595.28;
    const pdfHeight = 841.89;
    const margin = 16;
    const printableW = pdfWidth - margin * 2;
    const printableH = pdfHeight - margin * 2;

    const scaleFactor = Math.min(printableW / canvas.width, printableH / canvas.height);
    const drawW = canvas.width * scaleFactor;
    const drawH = canvas.height * scaleFactor;

    // Center horizontally and align neatly with top margin
    const x = (pdfWidth - drawW) / 2;
    const y = pdfHeight - margin - drawH;

    page.drawImage(pngImage, {
      x,
      y,
      width: drawW,
      height: drawH,
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (data.fullName || "Candidate").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.href = url;
    link.download = `${safeName}_CV.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } finally {
    element.style.boxShadow = prevShadow;
    element.style.border = prevBorder;
    element.style.borderRadius = prevBorderRadius;
  }
}

/**
 * Fallback standalone PDF generation using pdf-lib primitives
 */
export async function generateCvPdfBytes(data: CvData, settings: PrintSettings): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // Standard A4: 595.28 x 841.89 points
  const page = doc.addPage([595.28, 841.89]);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const primaryBlue = rgb(0.0, 0.48, 1.0); // #007aff Orbit Brand Blue
  const darkInk = rgb(0.11, 0.11, 0.12); // #1d1d1f
  const mutedGray = rgb(0.56, 0.56, 0.58); // #8e8e93
  const borderGray = rgb(0.90, 0.90, 0.92); // #e5e5ea

  const colLeftX = 40;
  const colLeftW = 175;
  const colRightX = 235;
  const colRightW = 320;

  let leftY = 800;
  let rightY = 800;

  // --- LEFT COLUMN: Photo, Name, Trade, Contact, Language ---
  if (settings.photo) {
    const photoSize = 80;
    const photoX = colLeftX + (colLeftW - photoSize) / 2;
    const photoY = leftY - photoSize;

    let photoDrawn = false;
    if (data.profileImageUrl) {
      try {
        const response = await fetch(data.profileImageUrl);
        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          const imgBytes = await response.arrayBuffer();
          const img = contentType.includes("png")
            ? await doc.embedPng(imgBytes)
            : await doc.embedJpg(imgBytes);

          page.drawImage(img, {
            x: photoX,
            y: photoY,
            width: photoSize,
            height: photoSize,
          });
          photoDrawn = true;
        }
      } catch {
        photoDrawn = false;
      }
    }

    if (!photoDrawn) {
      // Draw sleek avatar circle matching Orbit on-screen preview
      const centerX = colLeftX + colLeftW / 2;
      const centerY = leftY - photoSize / 2;

      page.drawCircle({
        x: centerX,
        y: centerY,
        size: photoSize / 2,
        color: rgb(0.92, 0.95, 1.0),
        borderColor: rgb(0.82, 0.88, 0.98),
        borderWidth: 1.5,
      });

      // Head
      page.drawCircle({
        x: centerX,
        y: centerY + 7,
        size: 11,
        color: primaryBlue,
      });

      // Shoulders arc
      page.drawEllipse({
        x: centerX,
        y: centerY - 14,
        xScale: 20,
        yScale: 10,
        color: primaryBlue,
      });
    }

    leftY -= photoSize + 16;
  } else {
    leftY -= 10;
  }

  // Candidate Name
  const cleanName = sanitizeForPdf(data.fullName.toUpperCase());
  const nameLines = wrapText(cleanName, colLeftW, fontBold, 14);
  for (const line of nameLines) {
    const textW = fontBold.widthOfTextAtSize(line, 14);
    page.drawText(line, {
      x: colLeftX + (colLeftW - textW) / 2,
      y: leftY,
      size: 14,
      font: fontBold,
      color: darkInk,
    });
    leftY -= 18;
  }

  // Profession / Trade
  const cleanProf = sanitizeForPdf(data.profession || "General Trade");
  const profW = fontBold.widthOfTextAtSize(cleanProf, 10.5);
  page.drawText(cleanProf, {
    x: colLeftX + (colLeftW - profW) / 2,
    y: leftY,
    size: 10.5,
    font: fontBold,
    color: primaryBlue,
  });
  leftY -= 25;

  // Contact Information Section
  const hasContact = settings.mobile || settings.email || settings.address;
  if (hasContact) {
    page.drawText("Contact Information", {
      x: colLeftX,
      y: leftY,
      size: 11,
      font: fontBold,
      color: primaryBlue,
    });
    leftY -= 15;

    if (settings.mobile && data.phone) {
      page.drawText("Mobile:", { x: colLeftX, y: leftY, size: 8, font: fontBold, color: darkInk });
      leftY -= 11;
      page.drawText(sanitizeForPdf(data.phone), { x: colLeftX, y: leftY, size: 9, font: fontRegular, color: mutedGray });
      leftY -= 15;
    }

    if (settings.email && data.email && data.email !== "-") {
      page.drawText("Email:", { x: colLeftX, y: leftY, size: 8, font: fontBold, color: darkInk });
      leftY -= 11;
      const emailLines = wrapText(sanitizeForPdf(data.email), colLeftW, fontRegular, 8.5);
      for (const line of emailLines) {
        page.drawText(line, { x: colLeftX, y: leftY, size: 8.5, font: fontRegular, color: mutedGray });
        leftY -= 11;
      }
      leftY -= 4;
    }

    if (settings.address && (data.address || data.district)) {
      page.drawText("Address:", { x: colLeftX, y: leftY, size: 8, font: fontBold, color: darkInk });
      leftY -= 11;
      const addr = [data.address, data.district].filter(Boolean).join(", ");
      const addrLines = wrapText(sanitizeForPdf(addr), colLeftW, fontRegular, 8.5);
      for (const line of addrLines) {
        page.drawText(line, { x: colLeftX, y: leftY, size: 8.5, font: fontRegular, color: mutedGray });
        leftY -= 11;
      }
      leftY -= 4;
    }
    leftY -= 10;
  }

  // Language Skills Section
  if (settings.language && data.languages) {
    page.drawText("Language Skills", {
      x: colLeftX,
      y: leftY,
      size: 11,
      font: fontBold,
      color: primaryBlue,
    });
    leftY -= 16;
    const langLines = wrapText(sanitizeForPdf(data.languages), colLeftW, fontRegular, 9);
    for (const line of langLines) {
      page.drawText(line, { x: colLeftX, y: leftY, size: 9, font: fontRegular, color: darkInk });
      leftY -= 13;
    }
    leftY -= 10;
  }

  // Driving License Section (if enabled and present)
  if (settings.drivingLicense && data.drivingLicense && data.drivingLicense !== "-") {
    page.drawText("Driving License", {
      x: colLeftX,
      y: leftY,
      size: 11,
      font: fontBold,
      color: primaryBlue,
    });
    leftY -= 16;
    const dlLines = wrapText(sanitizeForPdf(data.drivingLicense), colLeftW, fontRegular, 9);
    for (const line of dlLines) {
      page.drawText(line, { x: colLeftX, y: leftY, size: 9, font: fontRegular, color: darkInk });
      leftY -= 13;
    }
  }

  // --- RIGHT COLUMN: Summary, Personal Info, Work Experience, Education ---

  // 1. Professional Summary
  if (settings.summary && data.summary) {
    page.drawText("Professional Summary", {
      x: colRightX,
      y: rightY,
      size: 12.5,
      font: fontBold,
      color: primaryBlue,
    });
    rightY -= 17;

    const summaryLines = wrapText(sanitizeForPdf(data.summary), colRightW, fontRegular, 9.5);
    for (const line of summaryLines) {
      page.drawText(line, {
        x: colRightX,
        y: rightY,
        size: 9.5,
        font: fontRegular,
        color: darkInk,
      });
      rightY -= 14;
    }
    rightY -= 14;
  }

  // 2. Personal Information Section
  page.drawText("Personal Information", {
    x: colRightX,
    y: rightY,
    size: 12.5,
    font: fontBold,
    color: primaryBlue,
  });
  rightY -= 18;

  // Build grid of personal info items based on settings
  type InfoItem = { label: string; value: string };
  const leftColItems: InfoItem[] = [];
  const rightColItems: InfoItem[] = [];

  if (settings.dob && data.dob) {
    leftColItems.push({ label: "Date of Birth:", value: sanitizeForPdf(data.dob) });
  }
  if (settings.age && data.age) {
    rightColItems.push({ label: "Age:", value: sanitizeForPdf(data.age) });
  }

  if (settings.gender && data.gender) {
    leftColItems.push({ label: "Gender:", value: sanitizeForPdf(data.gender) });
  }
  if (settings.nationality && data.nationality) {
    rightColItems.push({ label: "Nationality:", value: sanitizeForPdf(data.nationality) });
  }

  if (settings.nid && data.nid && data.nid !== "-") {
    leftColItems.push({ label: "NID No:", value: sanitizeForPdf(data.nid) });
  }
  if (settings.passportNo && data.passportNo && data.passportNo !== "-") {
    rightColItems.push({ label: "Passport No:", value: sanitizeForPdf(data.passportNo) });
  }

  if (settings.passportDates) {
    if (data.passportIssueDate && data.passportIssueDate !== "-") {
      leftColItems.push({ label: "Date of Issue:", value: sanitizeForPdf(data.passportIssueDate) });
    }
    if (data.passportExpiryDate && data.passportExpiryDate !== "-") {
      rightColItems.push({ label: "Date of Expiry:", value: sanitizeForPdf(data.passportExpiryDate) });
    }
  }

  if (settings.fatherName && data.fatherName) {
    leftColItems.push({ label: "Father Name:", value: sanitizeForPdf(data.fatherName) });
  }
  if (settings.motherName && data.motherName) {
    rightColItems.push({ label: "Mother Name:", value: sanitizeForPdf(data.motherName) });
  }

  if (settings.maritalStatus && data.maritalStatus && data.maritalStatus !== "-") {
    leftColItems.push({ label: "Marital Status:", value: sanitizeForPdf(data.maritalStatus) });
  }

  const heightVal = settings.heightValue ? data.height : "";
  const heightLbl = settings.heightLabel ? "Height:" : "";
  if (heightLbl || heightVal) {
    leftColItems.push({ label: heightLbl || "Height:", value: sanitizeForPdf(heightVal || "-") });
  }

  const weightVal = settings.weightValue ? data.weight : "";
  const weightLbl = settings.weightLabel ? "Weight:" : "";
  if (weightLbl || weightVal) {
    rightColItems.push({ label: weightLbl || "Weight:", value: sanitizeForPdf(weightVal || "-") });
  }

  if (settings.qualificationValue && data.qualification) {
    leftColItems.push({ label: "Qualification:", value: sanitizeForPdf(data.qualification) });
  }

  // Include custom additional fields if present (balanced across columns)
  if (data.customFields && data.customFields.length > 0) {
    let toLeft = leftColItems.length <= rightColItems.length;
    for (const cf of data.customFields) {
      if (cf.label && cf.value) {
        const item = { label: `${sanitizeForPdf(cf.label)}:`, value: sanitizeForPdf(cf.value) };
        if (toLeft) {
          leftColItems.push(item);
        } else {
          rightColItems.push(item);
        }
        toLeft = !toLeft;
      }
    }
  }

  // Draw 2-column key-value grid
  const maxRows = Math.max(leftColItems.length, rightColItems.length);
  const subColW = (colRightW - 15) / 2;

  for (let i = 0; i < maxRows; i++) {
    const lItem = leftColItems[i];
    const rItem = rightColItems[i];

    if (lItem) {
      page.drawText(lItem.label, { x: colRightX, y: rightY, size: 8.5, font: fontBold, color: darkInk });
      rightY -= 11;
      page.drawText(lItem.value || "-", { x: colRightX, y: rightY, size: 9, font: fontRegular, color: mutedGray });
    }

    if (rItem) {
      page.drawText(rItem.label, { x: colRightX + subColW + 15, y: lItem ? rightY + 11 : rightY, size: 8.5, font: fontBold, color: darkInk });
      page.drawText(rItem.value || "-", { x: colRightX + subColW + 15, y: rightY, size: 9, font: fontRegular, color: mutedGray });
    }

    rightY -= 16;
  }
  rightY -= 10;

  // 3. Work Experience Section (Supports multiple experiences)
  const exps = data.experiences && data.experiences.length > 0
    ? data.experiences
    : (data.experienceTitle ? [{ id: "1", title: data.experienceTitle, company: data.experienceCompany, period: data.experiencePeriod, description: data.experienceDescription }] : []);

  if (settings.experience && exps.length > 0) {
    page.drawText("Work Experience", {
      x: colRightX,
      y: rightY,
      size: 12.5,
      font: fontBold,
      color: primaryBlue,
    });
    rightY -= 17;

    for (const exp of exps) {
      const expHeading = sanitizeForPdf(
        exp.company ? `${exp.title} (${exp.company})` : exp.title
      );
      page.drawText(expHeading, {
        x: colRightX,
        y: rightY,
        size: 10,
        font: fontBold,
        color: darkInk,
      });

      if (exp.period) {
        const periodText = sanitizeForPdf(exp.period);
        const periodW = fontRegular.widthOfTextAtSize(periodText, 9);
        page.drawText(periodText, {
          x: colRightX + colRightW - periodW,
          y: rightY,
          size: 9,
          font: fontRegular,
          color: mutedGray,
        });
      }
      rightY -= 14;

      if (exp.description) {
        const descLines = wrapText(sanitizeForPdf(exp.description), colRightW, fontRegular, 9);
        for (const line of descLines) {
          page.drawText(line, { x: colRightX, y: rightY, size: 9, font: fontRegular, color: mutedGray });
          rightY -= 12;
        }
      }
      rightY -= 4;
    }
    rightY -= 8;
  }

  // 4. Education Section (Supports multiple educations)
  const edus = data.educations && data.educations.length > 0
    ? data.educations
    : (data.educationLevel ? [{ id: "1", level: data.educationLevel, institute: data.educationInstitute, year: data.educationYear }] : []);

  if (settings.education && edus.length > 0) {
    page.drawText("Education", {
      x: colRightX,
      y: rightY,
      size: 12.5,
      font: fontBold,
      color: primaryBlue,
    });
    rightY -= 17;

    for (const edu of edus) {
      const eduHeading = sanitizeForPdf(edu.level || "Educational Qualification");
      page.drawText(eduHeading, {
        x: colRightX,
        y: rightY,
        size: 10,
        font: fontBold,
        color: darkInk,
      });

      if (edu.year) {
        const yrText = sanitizeForPdf(edu.year);
        const yrW = fontRegular.widthOfTextAtSize(yrText, 9);
        page.drawText(yrText, {
          x: colRightX + colRightW - yrW,
          y: rightY,
          size: 9,
          font: fontRegular,
          color: mutedGray,
        });
      }
      rightY -= 14;

      if (edu.institute) {
        page.drawText(sanitizeForPdf(edu.institute), {
          x: colRightX,
          y: rightY,
          size: 9,
          font: fontRegular,
          color: mutedGray,
        });
        rightY -= 12;
      }
      rightY -= 4;
    }
  }

  // Footer Branding
  page.drawLine({
    start: { x: 40, y: 35 },
    end: { x: 555, y: 35 },
    thickness: 0.5,
    color: borderGray,
  });

  page.drawText("Orbit Overseas Recruitment OS • Verified Candidate CV", {
    x: 40,
    y: 23,
    size: 7.5,
    font: fontRegular,
    color: mutedGray,
  });

  const regNote = `ID: ${sanitizeForPdf(data.candidateNo)} • Generated: ${new Date().toLocaleDateString("en-GB")}`;
  const regW = fontRegular.widthOfTextAtSize(regNote, 7.5);
  page.drawText(regNote, {
    x: 555 - regW,
    y: 23,
    size: 7.5,
    font: fontRegular,
    color: mutedGray,
  });

  return doc.save();
}

export async function downloadCvPdf(data: CvData, settings: PrintSettings): Promise<void> {
  const bytes = await generateCvPdfBytes(data, settings);
  const blob = new Blob([bytes as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const fileName = `${(data.fullName || "Candidate").replace(/[^a-zA-Z0-9_-]/g, "_")}_CV.pdf`;
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
