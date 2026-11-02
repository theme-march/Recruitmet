import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { resolve } from "node:path";

// Exercise the production service with isolated persistence and authorization.
// No candidate records or real payments are changed by these regression tests.
const dependencies: Record<string, string> = {
  "server-only": "",
  "@/lib/prisma": "export let prisma; export function setPrisma(value) { prisma = value; }",
  "@/lib/authorization": `
    export let allowed = true;
    export function setAllowed(value) { allowed = value; }
    export function officeScope() { return {}; }
    export async function requirePermission() {
      if (!allowed) throw Object.assign(new Error('Payment permission required'), { code: 'FORBIDDEN' });
    }`,
  "@prisma/client": `export const Prisma = {
    TransactionIsolationLevel: { ReadCommitted: 'ReadCommitted' },
    PrismaClientKnownRequestError: class extends Error {}
  };`,
};
const bundle = await build({
  stdin: {
    contents: `
      export { recordDeposit } from ${JSON.stringify(resolve("src/features/payments/service.ts"))};
      export { setPrisma } from '@/lib/prisma';
      export { setAllowed } from '@/lib/authorization';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  plugins: [{
    name: "payment-test-dependencies",
    setup(builder) {
      builder.onResolve({ filter: /^(server-only|@\/lib\/(prisma|authorization)|@prisma\/client)$/ }, args => ({ path: args.path, namespace: "payment-test" }));
      builder.onLoad({ filter: /.*/, namespace: "payment-test" }, args => ({ contents: dependencies[args.path], loader: "js" }));
    },
  }],
});
const { recordDeposit, setPrisma, setAllowed } = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const session = { userId: "collector", user: { name: "Accounts Officer", role: { name: "Accounts" } } };
const input = { fileId: "test-file", amount: 5000, type: "First Payment Deposit", method: "Cash at Office", reference: "REC-TEST" };

function fixture(status: string, resolvedStatus = status) {
  const file = { id: "test-file", candidateId: "test-candidate", status, currentStage: "Flight" };
  const payments = new Map<string, any>();
  const updates: any[] = [];
  const activity: any[] = [];
  const audit: any[] = [];
  let locks = 0;
  const tx = {
    $queryRaw: async () => { locks++; },
    processingFile: {
      findUniqueOrThrow: async () => ({ ...file }),
      update: async ({ data }: any) => { updates.push(data); Object.assign(file, data); return file; },
    },
    payment: {
      findUnique: async ({ where }: any) => payments.get(where.idempotencyKey) || null,
      create: async ({ data }: any) => {
        const payment = { id: "payment-" + payments.size, ...data };
        payments.set(data.idempotencyKey, payment);
        return payment;
      },
    },
    document: { create: async ({ data }: any) => data },
    activityLog: { create: async ({ data }: any) => { activity.push(data); return data; } },
    auditLog: { create: async ({ data }: any) => { audit.push(data); return data; } },
  };
  setPrisma({
    processingFile: { findFirst: async () => ({ ...file, status: resolvedStatus }) },
    payment: tx.payment,
    $transaction: async (callback: (tx: unknown) => unknown) => callback(tx),
  });
  setAllowed(true);
  return { file, payments, updates, activity, audit, get locks() { return locks; } };
}

test("completed flight files accept deposits, create receipts and retain completion", async () => {
  const state = fixture("COMPLETED");
  const payment = await recordDeposit(input, "completed-deposit-1", session);
  assert.equal(payment.amount, 5000);
  assert.equal(payment.status, "PAID");
  assert.equal(payment.candidateId, "test-candidate");
  assert.ok(payment.receipts.create.receiptNo.startsWith("RCT-"));
  assert.equal(payment.items.create[0].amount, 5000);
  assert.equal(state.activity[0].action, "PAYMENT_COLLECTED");
  assert.equal(state.audit[0].newValue.amount, 5000);
  assert.equal(state.file.status, "COMPLETED");
  assert.equal(state.file.currentStage, "Flight");

  // Legacy callers must not reopen a completed file through nextStage.
  await recordDeposit({ ...input, nextStage: "Payment" }, "completed-deposit-2", session);
  assert.equal(state.payments.size, 2);
  assert.equal(state.file.status, "COMPLETED");
  assert.equal(state.file.currentStage, "Flight");
  assert.ok(state.updates.every(update => !("status" in update) && !("currentStage" in update)));
});

test("returned, expired and archived files reject new deposits without writes", async () => {
  for (const status of ["RETURNED", "EXPIRED", "ARCHIVED"]) {
    const state = fixture(status);
    await assert.rejects(recordDeposit(input, "closed-deposit-key", session), { code: "TERMINAL_FILE", status: 409 });
    assert.equal(state.payments.size, 0, status);
    assert.equal(state.updates.length, 0, status);
    assert.equal(state.audit.length, 0, status);
  }
});

test("deposit eligibility uses the current file state after locking", async () => {
  const state = fixture("RETURNED", "ACTIVE");
  await assert.rejects(recordDeposit(input, "changed-deposit-key", session), { code: "TERMINAL_FILE" });
  assert.equal(state.locks, 1);
  assert.equal(state.payments.size, 0);
  const completed = fixture("COMPLETED", "ACTIVE");
  await recordDeposit(input, "flight-deposit-key", session);
  assert.equal(completed.payments.size, 1);
  assert.equal(completed.file.status, "COMPLETED");
});

test("retries return the existing deposit and conflicting requests cannot double charge", async () => {
  const state = fixture("COMPLETED");
  const first = await recordDeposit(input, "retry-deposit-key", session);
  const replay = await recordDeposit(input, "retry-deposit-key", session);
  assert.equal(replay.id, first.id);
  assert.equal(state.payments.size, 1);
  assert.equal(state.audit.length, 1);
  await assert.rejects(recordDeposit({ ...input, amount: 5001 }, "retry-deposit-key", session), { code: "IDEMPOTENCY_CONFLICT" });
  assert.equal(state.payments.size, 1);
});

test("payment authorization, amounts and request keys remain required", async () => {
  const state = fixture("COMPLETED");
  setAllowed(false);
  await assert.rejects(recordDeposit(input, "permission-test-key", session), { code: "FORBIDDEN" });
  setAllowed(true);
  await assert.rejects(recordDeposit({ ...input, amount: 0 }, "invalid-amount-key", session));
  await assert.rejects(recordDeposit(input, "", session), { code: "IDEMPOTENCY_REQUIRED" });
  assert.equal(state.locks, 0);
  assert.equal(state.payments.size, 0);
});
