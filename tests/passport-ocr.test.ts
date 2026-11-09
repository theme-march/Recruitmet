import test from "node:test";
import assert from "node:assert/strict";
import {
  mrzCharValue,
  computeCheckDigit,
  verifyCheckDigit,
  disambiguateDigits,
  disambiguateLetters,
  parseTD3MRZ,
  findMRZLines,
  cleanMRZLine,
  isChevronFillerToken,
  parseMRZNameSection,
} from "../src/lib/ocr/mrz.ts";
import { parseVIZText, normalizeDate, isValidISODate } from "../src/lib/ocr/viz.ts";

test("ICAO Doc 9303 character values match specification", () => {
  assert.equal(mrzCharValue("0"), 0);
  assert.equal(mrzCharValue("9"), 9);
  assert.equal(mrzCharValue("A"), 10);
  assert.equal(mrzCharValue("Z"), 35);
  assert.equal(mrzCharValue("<"), 0);
});

test("ICAO Doc 9303 check digit calculation matches official test vectors", () => {
  // Official ICAO Doc 9303 test vector:
  // L898902C36UTO7408122F1204159ZE184226B<<<<<10
  assert.equal(computeCheckDigit("L898902C3"), "6");
  assert.equal(verifyCheckDigit("L898902C3", "6"), true);
  assert.equal(verifyCheckDigit("L898902C3", "7"), false);

  assert.equal(computeCheckDigit("740812"), "2");
  assert.equal(verifyCheckDigit("740812", "2"), true);

  assert.equal(computeCheckDigit("120415"), "9");
  assert.equal(verifyCheckDigit("120415", "9"), true);

  assert.equal(computeCheckDigit("ZE184226B<<<<<"), "1");
  assert.equal(verifyCheckDigit("ZE184226B<<<<<", "1"), true);
});

test("Character disambiguation resolves OCR confusion in numeric and alpha fields", () => {
  assert.equal(disambiguateDigits("O9O8I2"), "090812");
  assert.equal(disambiguateDigits("ISB2Z"), "15822");
  assert.equal(disambiguateLetters("BGD01"), "BGDOI");
});

test("MRZ cleaner normalizes spaces and noise into chevrons", () => {
  const noisy = "P<BGDRAHMAN  RAHIM<<<«««";
  assert.equal(cleanMRZLine(noisy), "P<BGDRAHMAN<<RAHIM<<<<<<");
});

test("TD3 MRZ parser correctly extracts fields and validates check digits", () => {
  // Synthetic test vector using standard format
  const line1 = "P<BGDRAHMAN<<MOHAMMED<ARIF<<<<<<<<<<<<<<<<<<";
  // DocNo: A12345678 (check 4), Nat: BGD, DOB: 900213 (check 3), Sex: M, Exp: 300213 (check 1), NID: 0123456789
  const line2 = "A123456784BGD9002133M30021310123456789<<<<<20";

  const result = parseTD3MRZ(line1, line2);
  assert.ok(result);
  assert.equal(result.passportNo, "A12345678");
  assert.equal(result.surname, "RAHMAN");
  assert.equal(result.givenName, "MOHAMMED ARIF");
  assert.equal(result.fullName, "MOHAMMED ARIF RAHMAN");
  assert.equal(result.nationality, "BANGLADESHI");
  assert.equal(result.dob, "1990-02-13");
  assert.equal(result.sex, "Male");
  assert.equal(result.expiryDate, "2030-02-13");
  assert.equal(result.estimatedIssueDate, "2020-02-13");
  assert.equal(result.nid, "0123456789");
  assert.equal(result.docNumberValid, true);
  assert.equal(result.dobValid, true);
  assert.equal(result.expiryValid, true);
});

test("Date normalizer parses various passport date formats into ISO YYYY-MM-DD", () => {
  assert.equal(normalizeDate("01 JAN 1995"), "1995-01-01");
  assert.equal(normalizeDate("29 OCT 2023"), "2023-10-29");
  assert.equal(normalizeDate("28/10/2033"), "2033-10-28");
  assert.equal(normalizeDate("1990/02/13"), "1990-02-13");
  assert.equal(normalizeDate("invalid-date-string"), "");
  assert.equal(normalizeDate(""), "");
});

test("VIZ parser extracts bilingual and English passport fields accurately", () => {
  const sampleViz = `
    PEOPLE'S REPUBLIC OF BANGLADESH
    PASSPORT / পাসপোর্ট
    Passport No. / পাসপোর্ট নং: A12850583
    Surname / পদবী: HOSAIN
    Given Name / প্রদত্ত নাম: ROBIN
    Nationality / জাতীয়তা: BANGLADESHI
    Personal No. / ব্যক্তিগত নং: 4501736467
    Date of Birth / জন্ম তারিখ: 01 JAN 1995
    Sex / লিঙ্গ: M
    Place of Birth / জন্মস্থান: DHAKA
    Date of Issue / প্রদানের তারিখ: 29 OCT 2023
    Date of Expiry / মেয়াদোত্তীর্ণের তারিখ: 28 OCT 2033
    Father's Name / পিতার নাম: OBAIDUR RAHAMAN
    Mother's Name / মাতার নাম: SHAFIYA BEGUM
    Permanent Address / স্থায়ী ঠিকানা: 09 NO WARD, BEPARI BARI, RAJOIR, MADARIPUR
    Emergency Contact:
    Relationship: FATHER
    Telephone No / টেলিফোন নং: +8801792368905
  `;

  const parsed = parseVIZText(sampleViz);

  assert.equal(parsed.passportNo, "A12850583");
  assert.equal(parsed.surname, "HOSAIN");
  assert.equal(parsed.givenName, "ROBIN");
  assert.equal(parsed.fullName, "ROBIN HOSAIN");
  assert.equal(parsed.dob, "1995-01-01");
  assert.equal(parsed.issueDate, "2023-10-29");
  assert.equal(parsed.expiryDate, "2033-10-28");
  assert.equal(parsed.sex, "Male");
  assert.equal(parsed.nationality, "BANGLADESHI");
  assert.equal(parsed.placeOfBirth, "DHAKA");
  assert.equal(parsed.fatherName, "OBAIDUR RAHAMAN");
  assert.equal(parsed.motherName, "SHAFIYA BEGUM");
  assert.equal(parsed.nid, "4501736467");
  assert.equal(parsed.phone, "+8801792368905");
  assert.ok(parsed.address.includes("MADARIPUR"));
});

test("findMRZLines identifies candidate lines even with OCR noise", () => {
  const lines = [
    "PEOPLE'S REPUBLIC OF BANGLADESH",
    "PASSPORT",
    "HOSAIN ROBIN",
    "P<BGDHOSAIN<<ROBIN<<<<<<<<<<<<<<<<<<<<<<<<<<",
    "A128505838BGD9501016M33102854501736467<<<<<26",
    "END OF DOCUMENT",
  ];

  const found = findMRZLines(lines);
  assert.ok(found);
  assert.equal(found[0].startsWith("P<BGDHOSAIN"), true);
  assert.equal(found[1].startsWith("A12850583"), true);
});

test("Strict date validation correctly accepts real calendar dates and rejects invalid ones", () => {
  assert.equal(isValidISODate("1995-01-01"), true);
  assert.equal(isValidISODate("2024-02-29"), true); // 2024 is leap year
  assert.equal(isValidISODate("2000-02-29"), true); // 2000 is leap year
  assert.equal(isValidISODate("1900-02-29"), false); // 1900 is NOT leap year
  assert.equal(isValidISODate("2023-02-29"), false); // 2023 is non-leap year
  assert.equal(isValidISODate("2023-04-31"), false); // April has 30 days
  assert.equal(isValidISODate("2023-13-01"), false); // Month 13 invalid
  assert.equal(isValidISODate("2023-00-10"), false); // Month 0 invalid
  assert.equal(isValidISODate("not-a-date"), false);
});

test("MRZ parser handles single chevron drop without clearing surname", () => {
  const line1 = "P<BGDHOSAIN<ROBIN<<<<<<<<<<<<<<<<<<<<<<<<<<<";
  const line2 = "A123456784BGD9002133M30021310123456789<<<<<20";
  const result = parseTD3MRZ(line1, line2);
  assert.ok(result);
  assert.equal(result.surname, "HOSAIN");
  assert.equal(result.givenName, "ROBIN");
  assert.equal(result.fullName, "ROBIN HOSAIN");
});

test("MRZ parser handles mononym passport holders without clearing surname", () => {
  const line1 = "P<BGDRAHMAN<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<";
  const line2 = "A123456784BGD9002133M30021310123456789<<<<<20";
  const result = parseTD3MRZ(line1, line2);
  assert.ok(result);
  assert.equal(result.surname, "RAHMAN");
  assert.equal(result.givenName, "");
  assert.equal(result.fullName, "RAHMAN");
});

test("VIZ parser accurately separates Issue Date and Expiry Date on multi-column lines", () => {
  const twoColText = `
    PEOPLE'S REPUBLIC OF BANGLADESH
    PASSPORT
    Date of Issue / প্রদানের তারিখ Date of Expiry / মেয়াদোত্তীর্ণের তারিখ
    29 OCT 2023 28 OCT 2033
  `;
  const res = parseVIZText(twoColText);
  assert.equal(res.issueDate, "2023-10-29");
  assert.equal(res.expiryDate, "2033-10-28");
  assert.ok(res.issueDate < res.expiryDate);
});

test("MRZ parser handles severe chevron OCR noise without contaminating names", () => {
  // Case reported by user where chevrons were misread as K, C, L and trailing fillers
  const noisyL1 = "P<BGDHOSAIN K KROBIN K K<<KK CLCLCLLCLCLCLLC";
  const line2 = "A123456784BGD9002133M30021310123456789<<<<<20";

  const res = parseTD3MRZ(noisyL1, line2);
  assert.ok(res);
  assert.equal(res.surname, "HOSAIN");
  assert.equal(res.givenName, "ROBIN");
  assert.equal(res.fullName, "ROBIN HOSAIN");

  // Ensure chevron filler detection works on noise strings
  assert.equal(isChevronFillerToken("KK"), true);
  assert.equal(isChevronFillerToken("CLCLCLLCLCLCLLC"), true);
  assert.equal(isChevronFillerToken("ROBIN"), false);
  assert.equal(isChevronFillerToken("HOSAIN"), false);
  assert.equal(isChevronFillerToken("K"), true);
});

test("MRZ name section preserves valid names ending in K or L", () => {
  const lineL = "P<BGDPAUL<<ERIC<<<<<<<<<<<<<<<<<<<<<<<<<<<<<";
  const lineK = "P<BGDMALIK<<TARIQ<<<<<<<<<<<<<<<<<<<<<<<<<<<";
  const line2 = "A123456784BGD9002133M30021310123456789<<<<<20";

  const resL = parseTD3MRZ(lineL, line2);
  assert.ok(resL);
  assert.equal(resL.surname, "PAUL");
  assert.equal(resL.givenName, "ERIC");

  const resK = parseTD3MRZ(lineK, line2);
  assert.ok(resK);
  assert.equal(resK.surname, "MALIK");
  assert.equal(resK.givenName, "TARIQ");
});

test("Date normalizer resolves OCR substitutions in month names", () => {
  // "0" instead of "O" in OCT
  assert.equal(normalizeDate("29 0CT 2023"), "2023-10-29");
  // "0" in NOV
  assert.equal(normalizeDate("15 N0V 2024"), "2024-11-15");
  // "1" in JAN
  assert.equal(normalizeDate("01 1AN 1995"), "1995-01-01");
});

test("VIZ parser extracts multi-line Mother's Name, Place of Birth and Permanent Address", () => {
  const multiLineViz = `
    PEOPLE'S REPUBLIC OF BANGLADESH
    Passport No: A12850583
    Surname / পদবী
    HOSAIN
    Given Name / প্রদত্ত নাম
    ROBIN
    Date of Birth / জন্ম তারিখ
    01 JAN 1995
    Sex / লিঙ্গ Place of Birth / জন্মস্থান
    M DHAKA
    Date of Issue / প্রদানের তারিখ
    Date of Expiry / মেয়াদোত্তীর্ণের তারিখ
    29 0CT 2023 28 OCT 2033
    PERSONAL DATA AND EMERGENCY CONTACT
    Father's Name: OBAIDUR RAHAMAN
    Mother's Name / মাতার নাম:
    NASRIN BEGUM
    Permanent Address / স্থায়ী ঠিকানা:
    09 NO WARD, BEPARI BARI, DURGABORDI, RAJOIR,
    SHAHA SHARIF - 7910, MADARIPUR
    Emergency Contact:
    Name: OBAIDUR RAHAMAN
    Relationship: FATHER
    Telephone No: +8801732368105
  `;

  const parsed = parseVIZText(multiLineViz);
  assert.equal(parsed.passportNo, "A12850583");
  assert.equal(parsed.surname, "HOSAIN");
  assert.equal(parsed.givenName, "ROBIN");
  assert.equal(parsed.dob, "1995-01-01");
  assert.equal(parsed.issueDate, "2023-10-29");
  assert.equal(parsed.expiryDate, "2033-10-28");
  assert.equal(parsed.placeOfBirth, "DHAKA");
  assert.equal(parsed.fatherName, "OBAIDUR RAHAMAN");
  assert.equal(parsed.motherName, "NASRIN BEGUM");
  assert.ok(
    parsed.address.includes("09 NO WARD") &&
    parsed.address.includes("DURGABORDI") &&
    parsed.address.includes("MADARIPUR")
  );
  assert.equal(parsed.phone, "+8801732368105");
});

test("VIZ parser handles realistic OCR distortions (Fathers Namo, Spouses Name, noise suffixes, weak Given Name line)", () => {
  const realisticText = `
    PERSONAL DATA AND EMERGENCY CONTACT
    527211 Fathers Namo: OBAIDUR RAHAMAN 4 my)
    NEA "| Mother's Name: NASRIN BEGUM A&C ST £4
    2205 Spouses Name: SIMAKHANAM —4
    ponmanont Address: 09 NO WARD BEPARI BARI, DURGABORDI, RAJOIR, — :
    SA SHAFIA SHARIF - 7910, MADARIPUR — ie
    J : — /
    Emergency Contact:
    Meme: OBAIDUR RAHAMAN
    relationship: FATHER
    Totephone No: +8801792368805
    PEOPLE'S REPUBLIC OF BANGLADESH
    Passport No: A12850583
    Given Name sa ho, :
    ROBIN = © HL ANMBRT
    ~ DHAKA 1 a2se12 | REL
    280CT 2033
  `;

  const parsed = parseVIZText(realisticText);
  assert.equal(parsed.passportNo, "A12850583");
  assert.equal(parsed.givenName, "ROBIN");
  assert.equal(parsed.fatherName, "OBAIDUR RAHAMAN");
  assert.equal(parsed.motherName, "NASRIN BEGUM");
  assert.equal(parsed.spouseName, "SIMAKHANAM");
  assert.equal(parsed.placeOfBirth, "DHAKA");
  assert.ok(parsed.address.includes("09 NO WARD BEPARI BARI"));
  assert.ok(parsed.address.includes("MADARIPUR"));
  assert.ok(!parsed.address.includes("J : — /"));
  assert.ok(!parsed.address.includes("— ie"));
});

test("MRZ parser handles S chevron noise without corrupting names", () => {
  const line1 = "P<BGDHOSAIN<S<ROBINS<L<LCLLLLLLLLLLLLLLLLLLL";
  const line2 = "A128505838BGD9501016M33102854601736467<<<<66";
  const res = parseTD3MRZ(line1, line2);
  assert.ok(res);
  assert.equal(res.surname, "HOSAIN");
  // Single token S is dropped as filler token
  assert.ok(res.givenName.includes("ROBIN"));
});
