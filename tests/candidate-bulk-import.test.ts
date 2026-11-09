import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeHeader,
  parseDateCell,
  parsePhoneCell,
  normalizeCountry,
  normalizeGender,
} from "../src/lib/candidate-import-format.ts";

test("candidate bulk upload format and normalization aligned with Create Candidate", async (t) => {
  await t.test("header normalizer recognizes all Create Candidate fields and aliases", () => {
    assert.equal(normalizeHeader("Full Name"), "fullName");
    assert.equal(normalizeHeader("Given Name"), "givenName");
    assert.equal(normalizeHeader("Surname"), "surname");
    assert.equal(normalizeHeader("Phone"), "phone");
    assert.equal(normalizeHeader("Mobile Number"), "phone");
    assert.equal(normalizeHeader("Passport No"), "passportNo");
    assert.equal(normalizeHeader("Passport Issue Date"), "issueDate");
    assert.equal(normalizeHeader("Passport Expiry Date"), "expiryDate");
    assert.equal(normalizeHeader("National ID"), "nationalId");
    assert.equal(normalizeHeader("NID Number"), "nationalId");
    assert.equal(normalizeHeader("Target Country"), "preferredCountry");
    assert.equal(normalizeHeader("Trade / Profession"), "profession");
    assert.equal(normalizeHeader("Agent Partner"), "source");
    assert.equal(normalizeHeader("District"), "district");
    assert.equal(normalizeHeader("Present Address"), "address");
    assert.equal(normalizeHeader("Gender"), "gender");
    assert.equal(normalizeHeader("Date of Birth"), "dob");
    assert.equal(normalizeHeader("Father's Name"), "fatherName");
    assert.equal(normalizeHeader("Mother's Name"), "motherName");
    assert.equal(normalizeHeader("Marital Status"), "maritalStatus");
    assert.equal(normalizeHeader("Education"), "education");
    assert.equal(normalizeHeader("Email"), "email");
    assert.equal(normalizeHeader("Remarks / Note"), "notes");
  });

  await t.test("phone cell parser adds leading zero if omitted and cleans symbols", () => {
    assert.equal(parsePhoneCell("01712448821"), "01712448821");
    assert.equal(parsePhoneCell("1712448821"), "01712448821");
    assert.equal(parsePhoneCell("01712-448821"), "01712448821");
    assert.equal(parsePhoneCell("+8801712448821"), "+8801712448821");
  });

  await t.test("date parser handles ISO, slash, hyphen, and serial dates cleanly", () => {
    assert.equal(parseDateCell("1998-05-12"), "1998-05-12");
    assert.equal(parseDateCell("12/05/1998"), "1998-05-12");
    assert.equal(parseDateCell("12-05-1998"), "1998-05-12");
    assert.equal(parseDateCell(new Date("1998-05-12")), "1998-05-12");
    assert.equal(parseDateCell(""), undefined);
    assert.equal(parseDateCell(null), undefined);
  });

  await t.test("country normalizer maps aliases to standard Create Candidate countries", () => {
    assert.equal(normalizeCountry("Saudi Arabia"), "Saudi Arabia");
    assert.equal(normalizeCountry("ksa"), "Saudi Arabia");
    assert.equal(normalizeCountry("saudi"), "Saudi Arabia");
    assert.equal(normalizeCountry("Dubai"), "Dubai");
    assert.equal(normalizeCountry("uae"), "Dubai");
    assert.equal(normalizeCountry("oman"), "Oman");
    assert.equal(normalizeCountry("qatar"), "Qatar");
  });

  await t.test("gender normalizer maps to Male / Female / Other", () => {
    assert.equal(normalizeGender("Male"), "Male");
    assert.equal(normalizeGender("male"), "Male");
    assert.equal(normalizeGender("M"), "Male");
    assert.equal(normalizeGender("Female"), "Female");
    assert.equal(normalizeGender("f"), "Female");
    assert.equal(normalizeGender("Other"), "Other");
    assert.equal(normalizeGender(""), undefined);
  });
});
