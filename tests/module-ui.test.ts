import test from "node:test";
import assert from "node:assert/strict";
import { moduleFilterFields, resourceFields, resourceForModule } from "../src/lib/module-ui.ts";
import { getModuleItemBySlug, moduleItemPath, moduleItemSlug, modules } from "../src/lib/modules.ts";
import { readFileSync } from "node:fs";

test("call center form captures call control and interview intent", () => {
  const names = resourceFields.lead.map((field) => field.name);
  assert.ok(names.includes("interviewOption"));
  assert.ok(names.includes("subCategory"));
  assert.ok(names.includes("priority"));
  assert.ok(names.includes("notes"));
});

test("interview pages use schedule fields instead of candidate registration", () => {
  assert.equal(resourceForModule("registration", "Interview Schedule"), "interviewSchedule");
  assert.equal(resourceForModule("registration", "Registration"), "candidate");
  const names = resourceFields.interviewSchedule.map((field) => field.name);
  assert.ok(names.includes("scheduledAt"));
  assert.ok(names.includes("capacity"));
  assert.ok(names.includes("interviewer"));
});

test("registration and interviews keeps list, detail, export and schedule handoff connected", () => {
  const list = readFileSync("src/components/interview-list-page.tsx", "utf8");
  const detail = readFileSync("src/components/interview-detail-page.tsx", "utf8");
  const create = readFileSync("src/components/create-work-call-page.tsx", "utf8");
  assert.match(list, /Upcoming interviews/);
  assert.match(detail, /Filters \(this interview\)/);
  assert.match(detail, /export:"1"/);
  assert.match(detail, /scheduleId=/);
  assert.match(create, /selectedScheduleId/);
});

test("events reports can switch between Saudi, Dubai and Other Country data", () => {
  const report = readFileSync("src/components/ksa-events-report-page.tsx", "utf8");
  const api = readFileSync("src/app/api/ksa/events-report/route.ts", "utf8");
  assert.match(report, /Saudi Arabia/);
  assert.match(report, /Dubai/);
  assert.match(report, /Other Country/);
  assert.match(api, /workflowCountryWhere/);
  assert.match(api, /generalTotalEvents/);
});

test("payment and document filters match their operational records", () => {
  assert.ok(moduleFilterFields.accounts.some((field) => field.name === "amountFrom"));
  assert.ok(moduleFilterFields.documents.some((field) => field.name === "documentStatus"));
});

test("every sidebar option has a unique page route", () => {
  for (const module of modules.filter((item) => item.id !== "dashboard")) {
    const slugs = module.items.map((item) => moduleItemSlug(item.label));
    assert.equal(new Set(slugs).size, slugs.length, `${module.id} has duplicate page slugs`);
    for (const item of module.items) {
      const path = moduleItemPath(module.id, item.label);
      assert.equal(path, `/module/${module.id}/${moduleItemSlug(item.label)}`);
      assert.equal(getModuleItemBySlug(module.id, moduleItemSlug(item.label))?.label, item.label);
    }
  }
});

test("call center exposes only the four connected workflow pages", () => {
  const callCenter = modules.find((item) => item.id === "call-center");
  assert.deepEqual(callCenter?.items.map((item) => item.label), ["Create Work Call", "Work Call List", "Officer Dashboard", "Registration & Interviews"]);
  assert.equal(moduleItemPath("call-center", "Registration & Interviews"), "/module/call-center/registration-and-interviews");
});

test("legacy registration routes stay available without a duplicate sidebar group", () => {
  const registration = modules.find((item) => item.id === "registration");
  assert.equal(registration?.hidden, true);
  assert.equal(getModuleItemBySlug("registration", "interview-schedule")?.label, "Interview Schedule");
});

test("sidebar keeps only the operational groups for Call Center Office Panel", () => {
  assert.deepEqual(modules.filter((module) => !module.hidden).map((module) => module.id), [
    "dashboard", "call-center",
  ]);
});

