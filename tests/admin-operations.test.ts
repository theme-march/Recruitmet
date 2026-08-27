import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("admin pages redirect safely to dashboard", () => {
  const page = read("src/app/admin/page.tsx");
  assert.match(page, /redirect\("\/dashboard"\)/);
});

test("file service writes candidate, activity and audit relationships", () => {
  const service = read("src/features/files/service.ts");
  assert.match(service, /FILE_EXISTS/);
  assert.match(service, /candidate\.update/);
  assert.match(service, /activityLog\.create/);
  assert.match(service, /auditLog\.create/);
});

