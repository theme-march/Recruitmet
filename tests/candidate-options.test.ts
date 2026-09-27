import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

test("Direct Candidate options come from the permission-safe catalog API", () => {
  const form = read("src/components/modules/create-work-call-page.tsx");
  assert.match(form, /fetch\(`\/api\/candidate-options\?country=/);
  assert.doesNotMatch(form, /fetch\("\/api\/admin\/master-data"/);
  assert.match(form, /categories\.map\(\(category\) => category\.name\)/);
  assert.match(form, /selectedCategoryOption\?\.professions/);
  assert.match(form, /fileStatuses\.map/);
  assert.doesNotMatch(form, /const categoryOptions\s*=\s*categories\.length/);
});

test("candidate catalog exposes only active, country-scoped options", () => {
  const route = read("src/app/api/candidate-options/route.ts");
  assert.match(route, /professionCategory\.findMany/);
  assert.match(route, /professions:\s*\{/);
  assert.match(route, /where:\s*\{ active: true \}/);
  assert.match(route, /DIRECT_FILE_STATUS/);
  assert.match(route, /companyCountryFilter\(country\)/);
  assert.match(route, /withApiAccess\("candidate-options"/);
});

test("Super Admin can create, edit and deactivate every candidate option with audit", () => {
  const api = read("src/app/api/admin/candidate-options/route.ts");
  const page = read("src/app/(workspace)/candidate-options/page.tsx");
  const ui = read("src/components/modules/candidate-options-admin.tsx");
  const workspaceShell = read("src/components/layout/app-shell.tsx");
  assert.match(api, /z\.enum\(\["category", "profession", "company", "status"\]\)/);
  assert.match(api, /export const POST/);
  assert.match(api, /export const PATCH/);
  assert.match(api, /auditLog\.create/);
  assert.doesNotMatch(api, /\.delete\(/);
  assert.match(page, /role !== "SUPER_ADMIN"/);
  assert.match(ui, /Deactivate/);
  assert.match(ui, /Add \{labels\[tab\]\.singular\}/);
  assert.match(workspaceShell, /href="\/candidate-options"/);
});

test("Candidate interview and drive options are optional and editable from the profile", () => {
  const form = read("src/components/modules/create-work-call-page.tsx");
  assert.doesNotMatch(form, /Without Interview/);
  assert.doesNotMatch(form, /type="radio"/);
  assert.match(form, /Interview &amp; Drive Options.*\(Optional\)/);
  assert.match(form, /Skip this section now/);
  assert.match(form, /useState\(""\)/);
  const route = read("src/app/api/work-calls/route.ts");
  assert.match(route, /interviewOption:.*default\(""\)/);

  const profile = read("src/components/modules/all-candidates-list-page.tsx");
  const profileRoute = read("src/app/api/candidates/[id]/interview-options/route.ts");
  assert.match(profile, /Edit options/);
  assert.match(profile, /Save options/);
  assert.match(profile, /\/interview-options/);
  assert.match(profileRoute, /UPDATE_INTERVIEW_OPTIONS/);
  assert.match(profileRoute, /tx\.interview\.(update|create)/);
});

test("migration preserves the previous Direct Candidate choices as database seed data", () => {
  const migration = read("prisma/migrations/20260915000100_candidate_form_options/migration.sql");
  assert.match(migration, /ProfessionCategory/);
  assert.match(migration, /Profession/);
  assert.match(migration, /Company/);
  assert.match(migration, /DIRECT_FILE_STATUS/);
  assert.match(migration, /WHERE NOT EXISTS/);
});
