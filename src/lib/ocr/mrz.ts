import type { PassportFieldDetail } from "./types.ts";
import { isValidISODate } from "./viz.ts";

/**
 * ICAO Doc 9303 Character Values:
 * 0-9 => 0-9
 * A-Z => 10-35
 * <   => 0
 */
export function mrzCharValue(char: string): number {
  const upper = char.toUpperCase();
  if (upper >= "0" && upper <= "9") return upper.charCodeAt(0) - 48;
  if (upper >= "A" && upper <= "Z") return upper.charCodeAt(0) - 65 + 10;
  return 0; // '<' and other fillers count as 0
}

/**
 * Computes the ICAO Doc 9303 check digit with repeating weights [7, 3, 1]
 */
export function computeCheckDigit(input: string): string {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += mrzCharValue(input[i]) * weights[i % 3];
  }
  return String(sum % 10);
}

export function verifyCheckDigit(input: string, checkDigit: string): boolean {
  if (!checkDigit || checkDigit.length !== 1) return false;
  return computeCheckDigit(input) === checkDigit;
}

/**
 * Corrects typical OCR confusions in digits
 */
export function disambiguateDigits(str: string): string {
  return str
    .replace(/[OQDU]/g, "0")
    .replace(/[ILl|/!\\]/g, "1")
    .replace(/[Z]/g, "2")
    .replace(/[S]/g, "5")
    .replace(/[B]/g, "8");
}

/**
 * Corrects typical OCR confusions in letters
 */
export function disambiguateLetters(str: string): string {
  return str
    .replace(/[0]/g, "O")
    .replace(/[1]/g, "I")
    .replace(/[2]/g, "Z")
    .replace(/[5]/g, "S")
    .replace(/[8]/g, "B");
}

export interface MRZParseResult {
  passportNo: string;
  docNumberValid: boolean;
  surname: string;
  givenName: string;
  fullName: string;
  nationality: string;
  dob: string;
  dobValid: boolean;
  expiryDate: string;
  expiryValid: boolean;
  estimatedIssueDate: string;
  sex: string;
  nid: string;
  compositeValid: boolean;
  rawLine1: string;
  rawLine2: string;
}

/**
 * Cleans an MRZ line: converts to uppercase, replaces spaces or noise with '<',
 * strips anything that cannot exist in standard MRZ characters.
 */
export function cleanMRZLine(line: string): string {
  return line
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9<]/g, "<")
    .replace(/«/g, "<")
    .replace(/\s+/g, "<");
}

/**
 * Searches a list of OCR lines for the 2 lines of a TD3 passport MRZ.
 */
export function findMRZLines(lines: string[]): [string, string] | null {
  const cleaned = lines.map(cleanMRZLine).filter((l) => l.length >= 30);

  // First check if there is an exact match for line 1 starting with 'P<' or 'P' followed by country code
  for (let i = 0; i < cleaned.length - 1; i++) {
    const l1 = cleaned[i];
    const l2 = cleaned[i + 1];

    const isL1Candidate =
      (l1.startsWith("P<") || (l1.startsWith("P") && l1.length >= 40)) &&
      (l1.match(/</g) || []).length >= 4;

    const isL2Candidate =
      (l2.match(/</g) || []).length >= 3 &&
      (l2.includes("BGD") || /[0-9]{6}/.test(l2));

    if (isL1Candidate && isL2Candidate) {
      return [padOrTrimMRZ(l1), padOrTrimMRZ(l2)];
    }
  }

  // Fallback: look for any 2 consecutive lines with high chevron frequency
  for (let i = 0; i < cleaned.length - 1; i++) {
    const l1 = cleaned[i];
    const l2 = cleaned[i + 1];
    if (l1.length >= 38 && l2.length >= 38) {
      const c1 = (l1.match(/</g) || []).length;
      const c2 = (l2.match(/</g) || []).length;
      if (c1 >= 5 && c2 >= 3) {
        return [padOrTrimMRZ(l1), padOrTrimMRZ(l2)];
      }
    }
  }

  return null;
}

function padOrTrimMRZ(line: string): string {
  if (line.length === 44) return line;
  if (line.length > 44) return line.slice(0, 44);
  return line.padEnd(44, "<");
}

/**
 * Disambiguates passport number by testing common OCR substitutions against check digit
 */
function resolvePassportNumber(rawDocNum: string, rawCheck: string): { docNum: string; isValid: boolean } {
  const checkDigit = disambiguateDigits(rawCheck);
  let cleanDoc = rawDocNum.replace(/<+$/, "").trim();

  // Test as is
  if (verifyCheckDigit(cleanDoc, checkDigit)) {
    return { docNum: cleanDoc, isValid: true };
  }

  // Try typical corrections:
  // First character is always letter (e.g. A, B)
  const firstChar = disambiguateLetters(cleanDoc.charAt(0));
  // Subsequent characters in standard Bangladeshi passport are digits
  const restChars = disambiguateDigits(cleanDoc.slice(1));
  const candidate = `${firstChar}${restChars}`;

  if (verifyCheckDigit(candidate, checkDigit)) {
    return { docNum: candidate, isValid: true };
  }

  // Return cleaned candidate even if check digit failed, but mark invalid
  return { docNum: candidate.length >= 7 ? candidate : cleanDoc, isValid: false };
}

/**
 * Determines if a token is pure chevron filler noise (e.g. "KK", "CLCLCLL", "K", "<<")
 */
export function isChevronFillerToken(token: string): boolean {
  if (!token) return true;
  const clean = token.replace(/[^A-Z]/g, "");
  if (clean.length === 0) return true;
  // If token is composed entirely of common chevron misrecognitions (K, C, L, X, S) without vowels
  if (/^[KCLXS]+$/.test(clean) && !/[AEIOUY]/.test(clean)) {
    return true;
  }
  return false;
}

/**
 * Extracts and disambiguates surname and given name from MRZ Line 1 name section (Pos 5-43).
 * Robustly handles chevron OCR misrecognitions (where chevrons become K, C, L, S, spaces),
 * drops trailing filler garbage, and handles single-chevron drops and mononyms.
 */
export function parseMRZNameSection(rawNameSection: string): { surname: string; givenName: string; fullName: string } {
  // Strip trailing literal chevrons
  let section = rawNameSection.replace(/<+$/, "").trim();

  // Tokenize by chevrons and whitespace
  let rawTokens = section
    .split(/[<\s]+/)
    .map((t) => disambiguateLetters(t.trim().toUpperCase()))
    .filter(Boolean);

  // Strip trailing filler noise tokens (e.g. "KK", "CLCLCLLCLCLCLLC", "L", "LCLL...")
  while (rawTokens.length > 0 && isChevronFillerToken(rawTokens[rawTokens.length - 1])) {
    rawTokens.pop();
  }

  // Handle chevron OCR artifacts where chevrons were read as "K", "S", "C", "L" touching words
  // e.g. "KROBIN", "SROBIN"
  const cleanedTokens: string[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    let cur = rawTokens[i];
    if (isChevronFillerToken(cur)) {
      if (
        i + 1 < rawTokens.length &&
        /^[KSCL]/.test(rawTokens[i + 1]) &&
        rawTokens[i + 1].length > 2 &&
        /[AEIOUY]/.test(rawTokens[i + 1].slice(1))
      ) {
        rawTokens[i + 1] = rawTokens[i + 1].slice(1);
      }
      continue;
    }
    cleanedTokens.push(cur);
  }

  if (cleanedTokens.length === 0) {
    return { surname: "", givenName: "", fullName: "" };
  }

  let surname = "";
  let givenName = "";

  // If the raw line had "<<" between tokens before trailing fillers:
  if (rawNameSection.includes("<<")) {
    const rawParts = rawNameSection.split("<<");
    const rawSurname = rawParts[0] || "";
    const surnameTokens = rawSurname
      .split(/[<\s]+/)
      .map((t) => disambiguateLetters(t.trim().toUpperCase()))
      .filter((t) => !isChevronFillerToken(t));

    if (surnameTokens.length > 0) {
      surname = surnameTokens.join(" ");
      const givenTokens = cleanedTokens.slice(surnameTokens.length);
      givenName = givenTokens.join(" ");
    }
  }

  // If "<<" was not cleanly present or degraded (read as spaces / K K / S / single chevron):
  if (!surname || (!givenName && cleanedTokens.length >= 2)) {
    surname = cleanedTokens[0];
    givenName = cleanedTokens.slice(1).join(" ");
  } else if (!surname && cleanedTokens.length === 1) {
    surname = cleanedTokens[0];
    givenName = "";
  }

  const fullName = givenName && surname ? `${givenName} ${surname}` : givenName || surname;
  return { surname, givenName, fullName };
}

/**
 * Parses full ICAO Doc 9303 TD3 standard passport MRZ
 */
export function parseTD3MRZ(line1: string, line2: string): MRZParseResult | null {
  if (!line1 || !line2 || line1.length < 40 || line2.length < 40) return null;

  // Ensure 44 chars
  const l1 = padOrTrimMRZ(line1);
  const l2 = padOrTrimMRZ(line2);

  // Line 1:
  // Pos 0-1: Document Code ('P<')
  // Pos 2-4: Issuing State (e.g. 'BGD')
  const countryCode = disambiguateLetters(l1.slice(2, 5)).replace(/</g, "");
  const nationality = countryCode === "BGD" ? "BANGLADESHI" : countryCode || "BANGLADESHI";

  // Pos 5-43: Name section
  const { surname, givenName, fullName } = parseMRZNameSection(l1.slice(5));

  // Line 2:
  // Pos 0-8: Document Number (9 chars)
  const rawDocNum = l2.slice(0, 9);
  // Pos 9: Doc Number Check Digit
  const rawDocCheck = l2.charAt(9);
  const { docNum: passportNo, isValid: docNumberValid } = resolvePassportNumber(rawDocNum, rawDocCheck);

  // Pos 10-12: Nationality code (e.g. BGD)
  // Pos 13-18: Date of Birth (YYMMDD)
  const rawDob = disambiguateDigits(l2.slice(13, 19));
  const dobCheck = disambiguateDigits(l2.charAt(19));
  const dobValid = verifyCheckDigit(rawDob, dobCheck);

  let dob = "";
  if (rawDob.length === 6 && /^\d{6}$/.test(rawDob)) {
    const yy = parseInt(rawDob.slice(0, 2), 10);
    const mm = rawDob.slice(2, 4);
    const dd = rawDob.slice(4, 6);
    const currentYear = new Date().getFullYear() % 100;
    const fullYear = yy > currentYear + 2 ? 1900 + yy : 2000 + yy;
    const candidateDob = `${fullYear}-${mm}-${dd}`;
    if (isValidISODate(candidateDob)) {
      dob = candidateDob;
    }
  }

  // Pos 20: Sex ('M', 'F', '<')
  const sexChar = disambiguateLetters(l2.charAt(20));
  const sex = sexChar === "M" ? "Male" : sexChar === "F" ? "Female" : "";

  // Pos 21-26: Expiry Date (YYMMDD)
  const rawExp = disambiguateDigits(l2.slice(21, 27));
  const expCheck = disambiguateDigits(l2.charAt(27));
  const expiryValid = verifyCheckDigit(rawExp, expCheck);

  let expiryDate = "";
  let estimatedIssueDate = "";
  if (rawExp.length === 6 && /^\d{6}$/.test(rawExp)) {
    const yy = parseInt(rawExp.slice(0, 2), 10);
    const mm = rawExp.slice(2, 4);
    const dd = rawExp.slice(4, 6);
    const fullYear = 2000 + yy;
    const candidateExp = `${fullYear}-${mm}-${dd}`;
    if (isValidISODate(candidateExp)) {
      expiryDate = candidateExp;
      const issueYear = fullYear - 10;
      const candidateIssue = `${issueYear}-${mm}-${dd}`;
      if (isValidISODate(candidateIssue)) {
        estimatedIssueDate = candidateIssue;
      }
    }
  }

  // Pos 28-41: Optional Data / Personal Number / NID (14 chars)
  const rawNid = l2.slice(28, 42).replace(/<+/g, "").trim();
  const nid = disambiguateDigits(rawNid);

  // Pos 43: Composite Check Digit
  // Composite input: docNum(0-9) + check(9) + dob(13-19) + check(19) + expiry(21-27) + check(27) + optional(28-42) + optCheck(42)
  const compositeInput = l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 43);
  const compositeCheck = l2.charAt(43);
  const compositeValid = verifyCheckDigit(compositeInput, compositeCheck);

  return {
    passportNo,
    docNumberValid,
    surname,
    givenName,
    fullName,
    nationality,
    dob,
    dobValid,
    expiryDate,
    expiryValid,
    estimatedIssueDate,
    sex,
    nid,
    compositeValid,
    rawLine1: l1,
    rawLine2: l2,
  };
}
