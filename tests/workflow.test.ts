import test from "node:test";
import assert from "node:assert/strict";
import { isTerminalStatus, unmetRequirements } from "../src/features/workflow/rules.ts";

test("workflow requirements expose every missing prerequisite", () => {
  const missing = unmetRequirements(
    [
      { type: "DOCUMENT", reference: "Passport", required: true },
      { type: "PAYMENT", reference: "Processing fee", required: true },
      { type: "APPROVAL", reference: "Manager approval", required: true },
      { type: "DOCUMENT", reference: "Optional photo", required: false },
    ],
    { verifiedDocuments: 0, paidPayments: 0, approvals: 1 },
  );
  assert.deepEqual(missing, ["Passport", "Processing fee"]);
});

test("only closed lifecycle states are terminal", () => {
  assert.equal(isTerminalStatus("COMPLETED"), true);
  assert.equal(isTerminalStatus("RETURNED"), true);
  assert.equal(isTerminalStatus("IN_PROGRESS"), false);
});
