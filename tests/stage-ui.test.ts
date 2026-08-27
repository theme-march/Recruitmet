import test from "node:test";
import assert from "node:assert/strict";
import { modules } from "../src/lib/modules.ts";
import { stageFields, stageFilterFields, stageTableHeadings } from "../src/lib/stage-ui.ts";
import { workflowCountryWhere, workflowModule } from "../src/lib/workflow-country.ts";

test("passport and medical use distinct PDF-aligned forms", () => {
  const passport = stageFields["Passport Management"].map((field) => field.name);
  const medical = stageFields.Medical.map((field) => field.name);
  assert.ok(passport.includes("passportNumber"));
  assert.ok(passport.includes("issuingAuthority"));
  assert.ok(!passport.includes("center"));
  assert.ok(medical.includes("center"));
  assert.ok(medical.includes("tenFingerDone"));
  assert.ok(medical.includes("fitCardStatus"));
  assert.ok(!medical.includes("passportType"));
});

test("PDF workflow stages have their own operational filters", () => {
  assert.ok(stageFilterFields.Medical.some((field) => field.name === "medicalCenter"));
  assert.ok(stageFilterFields.MOFA.some((field) => field.name === "mofaNumber"));
  assert.ok(stageFilterFields.Takamul.some((field) => field.name === "registrationNumber"));
  assert.ok(stageFilterFields.Flight.some((field) => field.name === "departureFrom"));
  assert.ok(stageFilterFields["Pending 2nd Payment"].some((field) => field.name === "dueFrom"));
});

test("later workflow queues expose queue-specific columns", () => {
  assert.equal(stageTableHeadings["Pre Confirm File"][1], "COMPANY");
  assert.equal(stageTableHeadings["Ready To Flight"][3], "BMET FINGER");
  assert.equal(stageTableHeadings["Return File"][1], "RETURN REASON");
});

test("passport and medical tables expose stage-specific columns", () => {
  assert.deepEqual(stageTableHeadings["Passport Management"].slice(1, 5), ["PHONE", "PASSPORT", "ISSUE DATE", "EXPIRY"]);
  assert.deepEqual(stageTableHeadings.Medical.slice(1, 5), ["MEDICAL CENTER", "PASSPORT", "MEDICAL DATE", "EXPIRY / DAYS LEFT"]);
});

test("Saudi workflow exposes separate passport list and entry queues", () => {
  const ksa = modules.find((item) => item.id === "ksa");
  assert.equal(ksa?.items[0]?.label, "Passport List");
  assert.equal(ksa?.items[1]?.label, "Passport Entry");
  assert.ok(!ksa?.items.some((item) => item.label === "Passport Management"));
});

test("Dubai workflow exposes every operational queue", () => {
  const dubai = modules.find((module) => module.id === "dubai");
  assert.deepEqual(dubai?.items.map((item) => item.label), [
    "Passport List", "Passport Entry", "Medical", "First Payment",
    "Approval Application", "E-Visa Stamping", "E-Visa Hold",
    "Second Payment", "Visa Done", "Manpower", "Ready To Flight",
    "Flight", "Hold File", "Return File",
  ]);
});

test("Other Country uses its configured queues and excludes Saudi and Dubai data", () => {
  const other = modules.find((module) => module.id === "other-country");
  assert.deepEqual(other?.items.map((item) => item.label), [
    "Passport List", "Passport Entry", "Medical", "First Payment",
    "Application", "Confirm File", "E-Visa Stamping", "E-Visa Hold",
    "Second Payment", "Visa Done", "Manpower", "Ready To Flight",
    "Flight", "Hold File", "Return File",
  ]);
  const request = new Request("http://localhost/api/workflow?country=Other%20Country");
  assert.equal(workflowModule(request), "other-country");
  assert.deepEqual(workflowCountryWhere(request), {
    notIn: ["Saudi", "Saudi Arabia", "Dubai", "UAE", "United Arab Emirates"],
  });
});
