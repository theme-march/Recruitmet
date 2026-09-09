import "server-only";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { requirePermission, officeScope } from "@/lib/authorization";
import { paymentScope } from "@/lib/data-scope";
import { depositSchema, paymentIdentity } from "@/lib/payment-policy";
import type { AwaitedSession } from "@/lib/types";
import type { z } from "zod";
import type { paymentCreateSchema, refundSchema } from "./schemas";

type Session = NonNullable<AwaitedSession>;
export async function resolvePaymentFile(session: Session, fileId?: string | null, candidateId?: string | null) {
  if (!fileId && !candidateId) throw new AppError("INVALID_PAYMENT", "Choose a candidate processing file first.", 422);
  const file = await prisma.processingFile.findFirst({
    where: { AND: [officeScope(session), ...(fileId ? [{ id: fileId }] : []), ...(candidateId ? [{ candidateId }] : [])] },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  if (!file) throw new AppError("NOT_FOUND", "Processing file not found in your data scope.", 404);
  return file;
}

export async function recordDeposit(raw: unknown, key: string, session: Session) {
  await requirePermission(session, "payment-collection", "create");
  const input = depositSchema.parse(raw);
  const file = await resolvePaymentFile(session, input.fileId, input.candidateId);
  let identity: ReturnType<typeof paymentIdentity>;
  try { identity = paymentIdentity(session.userId, key, input); }
  catch { throw new AppError("IDEMPOTENCY_REQUIRED", "A unique Idempotency-Key header is required.", 422); }
  const replay = (payment: NonNullable<Awaited<ReturnType<typeof prisma.payment.findUnique>>>) => {
    if (payment.requestHash !== identity.requestHash || payment.fileId !== file.id) {
      throw new AppError("IDEMPOTENCY_CONFLICT", "This request key was already used for a different payment.", 409);
    }
    return payment;
  };
  try {
    return await prisma.$transaction(async tx => {
      // Serialize updates to this file and verify state again under the lock.
      await tx.$queryRaw`SELECT id FROM ProcessingFile WHERE id = ${file.id} FOR UPDATE`;
      const previous = await tx.payment.findUnique({ where: { idempotencyKey: identity.idempotencyKey } });
      if (previous) return replay(previous);
      const current = await tx.processingFile.findUniqueOrThrow({ where: { id: file.id } });
      if (["COMPLETED", "RETURNED", "EXPIRED"].includes(current.status)) {
        throw new AppError("TERMINAL_FILE", "Financial updates are not allowed on this terminal file.", 409);
      }
      const number = randomUUID().replaceAll("-", "").toUpperCase();
      const payment = await tx.payment.create({ data: {
        ...identity, paymentNo: "PAY-" + number, invoiceNo: "INV-" + number,
        fileId: file.id, candidateId: file.candidateId, type: input.type,
        amount: input.amount, currency: input.currency, method: input.method,
        reference: input.reference || null, collectedAt: input.collectedAt ?? new Date(),
        dueDate: input.dueDate, collector: session.user.name, status: "PAID", note: input.note,
        items: { create: input.items ?? [{ category: input.type, amount: input.amount }] },
        receipts: { create: { receiptNo: "RCT-" + number, issuedBy: session.user.name } },
      } });
      if (input.voucher) await tx.document.create({ data: {
        documentNo: "DOC-" + number, candidateId: file.candidateId, fileId: file.id,
        type: "payment_voucher", fileName: input.fileName ?? "Payment voucher",
        url: input.voucher,
      } });
      await tx.processingFile.update({ where: { id: file.id }, data: {
        updatedAt: new Date(), ...(input.nextStage ? { currentStage: input.nextStage, status: "ACTIVE" } : {}),
      } });
      await tx.activityLog.create({ data: { userId: session.userId, module: "Accounts", recordId: payment.id, action: "PAYMENT_COLLECTED", summary: `${input.currency} ${input.amount} collected` } });
      await tx.auditLog.create({ data: { userId: session.userId, role: session.user.role.name, module: "Accounts", recordId: payment.id, action: "PAYMENT_COLLECTED", newValue: { paymentNo: payment.paymentNo, amount: input.amount, currency: input.currency }, correlationId: randomUUID() } });
      return payment;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const previous = await prisma.payment.findUnique({ where: { idempotencyKey: identity.idempotencyKey } });
      if (previous) return replay(previous);
    }
    throw error;
  }
}
export async function collectPayment(input: z.infer<typeof paymentCreateSchema>, key: string, session: Session) {
  return recordDeposit({ ...input, reference: input.transactionNumber }, key, session);
}

export async function requestRefund(paymentId: string, input: z.infer<typeof refundSchema>, session: Session) {
  await requirePermission(session, "payment-collection", "refund");
  return prisma.$transaction(async tx => {
    const scoped = await tx.payment.findFirst({ where: { AND: [{ id: paymentId }, paymentScope(session)] } });
    if (!scoped) throw new AppError("NOT_FOUND", "Payment not found in your data scope.", 404);
    await tx.$queryRaw`SELECT id FROM Payment WHERE id = ${paymentId} FOR UPDATE`;
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { refunds: true } });
    if (payment.status !== "PAID") throw new AppError("PAYMENT_NOT_PAID", "Only paid transactions can be refunded.", 409);
    const repeated = payment.refunds.find(refund => refund.transactionRef === input.transactionRef);
    if (repeated) {
      if (repeated.requestedBy === session.userId && repeated.amount.equals(input.amount) && repeated.reason === input.reason && repeated.method === input.method) return repeated;
      throw new AppError("REFUND_CONFLICT", "This refund reference was already used.", 409);
    }
    const reserved = payment.refunds.filter(refund => ["Requested", "Approved", "Refunded", "Completed"].includes(refund.status))
      .reduce((sum, refund) => sum.plus(refund.amount), new Prisma.Decimal(0));
    if (reserved.plus(input.amount).greaterThan(payment.amount)) throw new AppError("REFUND_EXCEEDS_PAYMENT", "Refund exceeds the remaining refundable amount.", 409);
    const refund = await tx.refund.create({ data: { paymentId, ...input, requestedBy: session.userId, status: "Requested" } });
    await tx.auditLog.create({ data: { userId: session.userId, role: session.user.role.name, module: "Accounts", recordId: refund.id, action: "REFUND_REQUEST", newValue: { paymentId, amount: input.amount, reason: input.reason }, correlationId: randomUUID() } });
    return refund;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
