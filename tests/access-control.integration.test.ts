import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;

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
    assert.ok(userId);
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
    const superRole = listed.body.data.roles.find((r: { kind: string }) => r.kind === "SUPER_ADMIN");
    const ownersBefore = await db.user.count({ where: { role: { name: { in: ["SUPER_ADMIN", "Super Administrator"] } } } });
    assert.equal((await request("/api/admin/users", admin.cookie, "POST", { name: "Forbidden second owner", email: "second-owner-" + suffix + "@example.invalid", username: "second_owner_" + suffix, roleId: superRole.id, password })).status, 409);
    assert.equal((await request("/api/admin/users", admin.cookie, "PATCH", { userId, roleId: superRole.id })).status, 409);
    assert.equal(await db.user.count({ where: { role: { name: { in: ["SUPER_ADMIN", "Super Administrator"] } } } }), ownersBefore);
    const owner = await db.user.findFirstOrThrow({ where: { roleId: superRole.id } });
    const collisionCode = "QA-OWNER-" + suffix;
    assert.equal((await request("/api/agents", admin.cookie, "POST", { name: "Rejected owner collision", code: collisionCode, phone: "QA" + suffix, enablePortalLogin: true, portalEmail: owner.email })).status, 409);
    assert.equal(await db.agent.count({ where: { code: collisionCode } }), 0, "portal collision must not create an agent");
    const existingAgent = await db.agent.findFirst();
    if (existingAgent) assert.equal((await request("/api/agents/" + existingAgent.id, admin.cookie, "PATCH", { enablePortalLogin: false, portalEmail: owner.email })).status, 409);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).roleId, superRole.id);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).status, "ACTIVE");
    assert.equal((await request("/api/admin/users", admin.cookie, "PATCH", { userId: owner.id, status: "INACTIVE" })).status, 409);
    assert.equal((await request("/api/admin/users", admin.cookie, "PATCH", { userId: owner.id, roleId })).status, 409);
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
    const beforeEmail = await db.user.findUniqueOrThrow({ where: { id: userId } });
    assert.equal((await request("/api/admin/users", login.cookie, "PATCH", { userId, email: "unauthorized@example.invalid" })).status, 403);
    assert.equal((await request("/api/admin/users", admin.cookie, "PATCH", { userId, email: owner.email })).status, 409);
    assert.equal((await request("/api/admin/users", admin.cookie, "PATCH", { userId, email: "invalid-email" })).status, 422);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: userId } })).email, beforeEmail.email);
    const resetToken = await db.passwordResetToken.create({ data: { userId, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60000) } });
    const changedEmail = "updated-access-" + suffix + "@example.invalid";
    const emailUpdate = await request("/api/admin/users", admin.cookie, "PATCH", { userId, email: " " + changedEmail.toUpperCase() + " " });
    assert.equal(emailUpdate.status, 200);
    assert.equal(emailUpdate.body.reauthRequired, false);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: userId } })).email, changedEmail);
    assert.ok((await db.passwordResetToken.findUniqueOrThrow({ where: { id: resetToken.id } })).usedAt);
    assert.equal((await request("/api/me", login.cookie)).status, 401, "email changes revoke existing sessions");
    assert.equal((await request("/api/auth/login", "", "POST", { identity: beforeEmail.email, password })).status, 401);
    const newEmailLogin = await request("/api/auth/login", "", "POST", { identity: changedEmail, password });
    assert.equal(newEmailLogin.status, 200, "email-only updates preserve the existing password");
    const directory = await request("/api/admin/users?q=" + encodeURIComponent(changedEmail), admin.cookie);
    assert.equal(directory.body.data.length, 1);
    assert.equal(directory.body.data[0].email, changedEmail);
    assert.equal("password" in directory.body.data[0], false);
    assert.equal("passwordHash" in directory.body.data[0], false);
    const resetPassword = "Reset!" + suffix + "!Secure";
    assert.equal((await request("/api/admin/users", admin.cookie, "PATCH", { userId, password: resetPassword })).status, 200);
    const audit = await db.auditLog.findFirst({ where: { recordId: userId, action: "UPDATE_USER_ACCESS" }, orderBy: { createdAt: "desc" } });
    assert.equal(JSON.stringify(audit?.newValue).includes("Reset!"), false);
    assert.equal(JSON.stringify(audit?.newValue).includes("passwordHash"), false);
    assert.equal((await request("/api/me", newEmailLogin.cookie)).status, 401, "password reset revokes existing sessions");
    assert.equal((await request("/api/auth/login", "", "POST", { identity: changedEmail, password })).status, 401);
    assert.equal((await request("/api/auth/login", "", "POST", { identity: changedEmail, password: resetPassword })).status, 200);
    assert.equal((await request("/api/admin/roles?roleId=" + superRole.id, admin.cookie, "DELETE")).status, 403);
  } finally {
    if (userId) { await db.session.deleteMany({ where: { userId } }); await db.passwordResetToken.deleteMany({ where: { userId } }); await db.user.delete({ where: { id: userId } }); }
    for (const id of roles) await db.role.delete({ where: { id } });
    await db.$disconnect();
  }
});
