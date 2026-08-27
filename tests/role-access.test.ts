import test from "node:test";
import assert from "node:assert/strict";
import { APP_ROLES, moduleIdsForRole, roleHome, toAppRole } from "../src/lib/roles.ts";

test("application exposes single Call Center role", () => {
  assert.deepEqual(Object.keys(APP_ROLES), ["CALL_CENTER"]);
  assert.deepEqual(Object.values(APP_ROLES), ["Call Center"]);
});

test("all accounts map to the single Call Center role", () => {
  assert.equal(toAppRole("Call Center"), "CALL_CENTER");
  assert.equal(toAppRole("Call Center Officer"), "CALL_CENTER");
  assert.equal(toAppRole("Administrator"), "CALL_CENTER");
});

test("home route is always dashboard", () => {
  assert.equal(roleHome("CALL_CENTER"), "/dashboard");
  assert.equal(roleHome("ADMIN"), "/dashboard");
  assert.equal(roleHome("SUPER_ADMIN"), "/dashboard");
  assert.deepEqual(moduleIdsForRole("CALL_CENTER"), ["dashboard", "call-center", "registration", "common"]);
});

