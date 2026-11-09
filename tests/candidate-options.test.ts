import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

test("Direct Candidate options come from the permission-safe catalog API", () => {
  const profile = read("src/components/modules/all-candidates-list-page.tsx");
  assert.match(profile, /fetch\(`\/api\/candidate-options\?country=/);
  assert.doesNotMatch(profile, /fetch\("\/api\/admin\/master-data"/);
  assert.match(profile, /profileCategories/);
  assert.match(profile, /profileFileStatuses/);
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

test("Candidate Form Options admin page is removed from sidebar and workspace", () => {
  const workspaceShell = read("src/components/layout/app-shell.tsx");
  const nextConfig = read("next.config.ts");
  assert.doesNotMatch(workspaceShell, /href="\/candidate-options"/);
  assert.doesNotMatch(workspaceShell, /Candidate Form Options/);
  assert.match(nextConfig, /source:\s*"\/candidate-options"/);
  assert.match(nextConfig, /destination:\s*"\/dashboard"/);
});

test("Candidate interview and drive options are managed from the interview schedule and editable from the profile", () => {
  const form = read("src/components/modules/create-work-call-page.tsx");
  assert.doesNotMatch(form, /Interview &amp; Drive Options/);
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
