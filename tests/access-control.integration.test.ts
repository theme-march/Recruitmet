import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";

// Opt-in local integration test. Creates only uniquely named fixture accounts
// and roles, then removes those exact records. Existing staff are never changed.
test("custom roles: assignment, exact grants, revocation, conflict and lockout safety", { skip: process.env.RUN_ACCESS_CONTROL_E2E !== "1", timeout: 180000 }, async () => {
  loadEnvConfig(process.cwd());
  const db = new PrismaClient();
  const base = process.env.ACCESS_TEST_URL || "http://localhost:3000";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Integration fixtures must stay local");
  const suffix = randomUUID().slice(0, 8);
  const password = "Qa!" + randomUUID();
  const roles: string[] = [];
  let userId: string | undefined;
  async function request(path: string, cookie = "", method = "GET", body?: unknown) {
    const response = await fetch(base + path, { method, headers: { cookie, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    return { status: response.status, body: result, cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "" };
  }
  try {
    const admin = await request("/api/auth/login", "", "POST", { identity: process.env.ACCESS_TEST_ADMIN || "admin@orbit.com", password: process.env.ACCESS_TEST_PASSWORD || "Admin@123" });
    assert.equal(admin.status, 200);
    const created = await request("/api/admin/roles", admin.cookie, "POST", { name: "QA Branch Admin " + suffix, description: "Temporary authorization integration fixture", granularMap: { agents: ["read"], dubai: ["read"] } });
    assert.equal(created.status, 200); roles.push(created.body.data.id);
    const roleId = roles[0];
    const made = await request("/api/admin/users", admin.cookie, "POST", { name: "QA Access " + suffix, email: "access-" + suffix + "@example.invalid", username: "qa_access_" + suffix, roleId, password });
    assert.equal(made.status, 201); userId = made.body.data.id;
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: userId } })).roleId, roleId);
    const login = await request("/api/auth/login", "", "POST", { identity: "qa_access_" + suffix, password });
    assert.equal(login.status, 200);
    const me = await request("/api/me", login.cookie);
    assert.equal(me.body.data.roleKey, "CUSTOM");
    assert.deepEqual(me.body.data.allowedModules.sort(), ["agents", "dubai"]);
    assert.equal((await request("/api/agents", login.cookie)).status, 200);
    assert.equal((await request("/api/country-candidates?country=Dubai", login.cookie)).status, 200);
    for (const path of ["/api/admin/roles", "/api/admin/users", "/api/admin/stats", "/api/all-candidates", "/api/payment-collection", "/api/demands", "/api/country-candidates?country=Saudi", "/api/export"]) {
      assert.equal((await request(path, login.cookie)).status, 403, path);
    }
    for (const [path, method, body] of [
      ["/api/agents", "POST", { name: "Must not be created" }],
      ["/api/agents/not-a-record", "PATCH", { name: "Must not be updated" }],
      ["/api/agents/not-a-record", "DELETE", {}],
      ["/api/countries", "POST", { name: "Must not be created" }],
      ["/api/admin/control-plane", "POST", { action: "UPDATE_PERMISSIONS", roleId, modules: ["*"] }],
    ] as const) assert.equal((await request(path, login.cookie, method, body)).status, 403, path);
    const listed = await request("/api/admin/roles", admin.cookie);
    const role = listed.body.data.roles.find((r: { id: string }) => r.id === roleId);
    const versioned = { roleId, name: role.name, description: role.description, expectedUpdatedAt: role.updatedAt, granularMap: {} };
    assert.equal((await request("/api/admin/roles", admin.cookie, "POST", { ...versioned, granularMap: { agents: ["*"] } })).status, 422);
    assert.equal((await request("/api/agents", login.cookie)).status, 200, "invalid save must preserve permissions");
    assert.equal((await request("/api/admin/roles?roleId=" + roleId, admin.cookie, "DELETE")).status, 409);
    assert.equal((await request("/api/admin/roles", admin.cookie, "POST", versioned)).status, 200);
    assert.equal((await request("/api/admin/roles", admin.cookie, "POST", versioned)).status, 409, "stale saves must fail");
    assert.equal((await request("/api/agents", login.cookie)).status, 403, "revocation applies to existing sessions");
    assert.deepEqual((await request("/api/me", login.cookie)).body.data.allowedModules, []);
    const second = await request("/api/admin/roles", admin.cookie, "POST", { name: "QA Reader " + suffix, granularMap: { agents: ["read", "create"] } });
    assert.equal(second.status, 200); roles.push(second.body.data.id);
    assert.equal((await request("/api/admin/users", admin.cookie, "PATCH", { userId, roleId: roles[1] })).status, 200);
    assert.equal((await request("/api/agents", login.cookie)).status, 200);
    assert.equal((await request("/api/agents", login.cookie, "POST", {})).status, 422, "granted create reaches validation");
    assert.equal((await request("/api/admin/users", admin.cookie, "PATCH", { userId, password: "Reset!" + suffix + "!Secure" })).status, 200);
    const audit = await db.auditLog.findFirst({ where: { recordId: userId, action: "UPDATE_USER_ACCESS" }, orderBy: { createdAt: "desc" } });
    assert.equal(JSON.stringify(audit?.newValue).includes("Reset!"), false);
    assert.equal((await request("/api/me", login.cookie)).status, 401);
    const superRole = listed.body.data.roles.find((r: { kind: string }) => r.kind === "SUPER_ADMIN");
    assert.equal((await request("/api/admin/roles?roleId=" + superRole.id, admin.cookie, "DELETE")).status, 403);
  } finally {
    if (userId) { await db.session.deleteMany({ where: { userId } }); await db.user.delete({ where: { id: userId } }); }
    for (const id of roles) await db.role.delete({ where: { id } });
    await db.$disconnect();
  }
});
