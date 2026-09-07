import test from "node:test";
import assert from "node:assert/strict";
import { APP_ROLES, moduleIdsForRole, roleHome, toAppRole } from "../src/lib/roles.ts";
import { hasPermission, permissionCatalog, canonicalModule } from "../src/lib/permission-policy.ts";

test("only exact reserved roles receive built-in privileges", () => {
  assert.equal(toAppRole(APP_ROLES.SUPER_ADMIN), "SUPER_ADMIN");
  assert.equal(toAppRole("Call Center"), "CALL_CENTER");
  assert.equal(toAppRole("Call Center Officer"), "CALL_CENTER");
  assert.equal(toAppRole("Branch Admin"), "CUSTOM");
  assert.equal(toAppRole("Super Sales"), "CUSTOM");
  assert.equal(toAppRole("Agent Manager"), "CUSTOM");
  assert.equal(toAppRole(undefined), "CUSTOM");
});
test("staff navigation is deny-by-default; portal remains separate", () => {
  assert.equal(roleHome("SUPER_ADMIN"), "/dashboard");
  assert.equal(roleHome("Agent Partner"), "/portal/agent");
  assert.deepEqual(moduleIdsForRole("CUSTOM"), []);
  assert.deepEqual(moduleIdsForRole("CALL_CENTER"), []);
});
test("permissions never cross unrelated modules or grant implied actions", () => {
  const grants = [{ module: "agents", page: "*", action: "read" }];
  assert.equal(hasPermission(grants, "agents", "View"), true);
  for (const action of ["create", "edit", "delete", "assign", "export"]) assert.equal(hasPermission(grants, "agents", action), false);
  assert.equal(hasPermission(grants, "office-vendor", "read"), false);
  assert.equal(hasPermission([{ module: "registration", action: "*", page: "*" }], "call-center", "read"), false);
  assert.equal(hasPermission([{ module: "agents", action: "delete", page: "*" }], "agents", "read"), false);
  assert.equal(hasPermission([], "dashboard", "read"), false);
});
test("page-restricted grants do not expand to all pages", () => {
  const grants = [{ module: "agents", page: "directory", action: "View" }];
  assert.equal(hasPermission(grants, "agents", "read"), false);
  assert.equal(hasPermission(grants, "agents", "read", "directory"), true);
});
test("countries and true legacy aliases share canonical IDs, without broad country access", () => {
  assert.equal(canonicalModule("accounts"), "payment-collection");
  assert.equal(canonicalModule("Saudi Arabia"), "ksa");
  const catalog = permissionCatalog([{ name: "Oman" }, { name: "Dubai" }]);
  assert.equal(catalog.filter(m => m.id === "dubai").length, 1);
  assert.ok(catalog.some(m => m.id === "oman"));
  assert.ok(catalog.some(m => m.id === "country-setup"));
  assert.equal(hasPermission([{ module: "other-country", page: "*", action: "*" }], "oman", "read"), false);
});
