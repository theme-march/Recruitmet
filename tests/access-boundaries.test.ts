import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
test("every operational API has the shared authorization boundary", () => {
  const scan = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? scan(join(directory, entry.name)) : [join(directory, entry.name)]);
  const api = new URL("../src/app/api/", import.meta.url);
  for (const path of scan(api.pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
    const normalized = path.replaceAll("\\", "/");
    if (!normalized.endsWith("/route.ts") || /\/(health|auth\/(login|forgot-password|reset-password))\/route.ts$/.test(normalized)) continue;
    assert.match(readFileSync(path, "utf8"), /withApiAccess|export \{ GET, POST \} from "@\/app\/api\/admin\/roles\/route"/, path);
  }
});
test("login and seed cannot erase custom-role assignments", () => {
  assert.doesNotMatch(read("src/app/api/auth/login/route.ts"), /syncDatabaseForCallCenter/);
  assert.doesNotMatch(read("prisma/seed.ts"), /db\.user\.deleteMany|db\.role\.deleteMany|db\.rolePermission\.deleteMany/);
});
test("opening a dossier is read-only", () => {
  const route = read("src/app/api/files/[id]/route.ts");
  const getter = route.slice(route.indexOf("async function GETHandler"), route.indexOf("async function PATCHHandler"));
  assert.doesNotMatch(getter, /prisma\.\w+\.(create|update|delete|upsert)/);
  assert.match(getter, /requireFilePermission/);
});
test("role writes are versioned, atomic and audited; admin reset never logs a password", () => {
  const roles = read("src/lib/role-administration.ts");
  assert.match(roles, /\$transaction/);
  assert.match(roles, /expectedUpdatedAt/);
  assert.match(roles, /auditLog\.create/);
  assert.match(roles, /requireSuperAdmin/);
  const staff = read("src/app/api/admin/users/route.ts");
  assert.doesNotMatch(staff, /newValue:\s*input/);
  assert.match(staff, /passwordReset: Boolean/);
  assert.match(staff, /session\.deleteMany/);
});
