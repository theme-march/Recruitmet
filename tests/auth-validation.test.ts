import test from "node:test";
import assert from "node:assert/strict";
import { passwordSchema, resetSchema } from "../src/features/auth/schemas.ts";

test("password policy requires mixed case, number, symbol, and ten characters", () => {
  assert.equal(passwordSchema.safeParse("weakpassword").success, false);
  assert.equal(passwordSchema.safeParse("Strong@1234").success, true);
});

test("password reset rejects mismatched confirmation", () => {
  const result = resetSchema.safeParse({
    token: "a".repeat(32),
    password: "Strong@1234",
    confirmPassword: "Different@1234",
  });
  assert.equal(result.success, false);
});
