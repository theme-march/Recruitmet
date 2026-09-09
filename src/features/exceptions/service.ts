import "server-only";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/authorization";
import { AppError } from "@/lib/errors";
import type { AwaitedSession } from "@/lib/types";

export async function placeException(
  input: {
    fileId: string;
    type: "Hold" | "Return";
    reason: string;
    note: string;
    expectedRelease?: Date;
    financialImpact?: number;
    attachment?: string;
  },
  session: NonNullable<AwaitedSession>
) {
  const action = input.type === "Hold" ? "Hold" : "Return";
  if (!(await can(session, "exceptions", action)))
    throw new AppError("FORBIDDEN", `${action} permission is required.`, 403);

  const file = await prisma.processingFile.findUnique({
    where: { id: input.fileId },
  });
  if (!file) throw new AppError("NOT_FOUND", "File not found.", 404);

  // If returning, don't allow already returned or expired files
  if (input.type === "Return" && ["RETURNED", "EXPIRED"].includes(file.status)) {
    throw new AppError("TERMINAL_FILE", "This terminal file cannot be changed without re-process approval.", 409);
  }

  // If holding, do not allow files that are already permanently returned
  if (input.type === "Hold" && file.status === "RETURNED") {
    throw new AppError("TERMINAL_FILE", "A returned file cannot be placed on hold without re-process approval.", 409);
  }

  return prisma.$transaction(async (tx) => {
    const row = await tx.holdReturn.create({
      data: {
        fileId: file.id,
        type: input.type,
        previousStage: file.currentStage,
        reason: input.reason,
        note: input.note,
        expectedRelease: input.expectedRelease,
        financialImpact: input.financialImpact,
        attachment: input.attachment,
        status: input.type === "Hold" ? "On Hold" : "Awaiting Decision",
        owner: session.userId,
      },
    });

    const status = input.type === "Hold" ? "HOLD" : "RETURNED";
    await tx.processingFile.update({
      where: { id: file.id },
      data: { status },
    });

    await tx.fileStatusHistory.create({
      data: {
        fileId: file.id,
        previousStage: file.currentStage,
        newStage: file.currentStage,
        previousStatus: file.status,
        newStatus: status,
        reason: input.reason,
        actorId: session.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        role: session.user.role.name,
        module: "Exceptions",
        recordId: file.id,
        action: input.type.toUpperCase(),
        oldValue: { stage: file.currentStage, status: file.status },
        newValue: { status, exceptionId: row.id },
        reason: input.reason,
        correlationId: crypto.randomUUID(),
      },
    });

    return row;
  });
}

export async function releaseHold(
  exceptionId: string,
  reason: string,
  session: NonNullable<AwaitedSession>
) {
  if (
    !(await can(session, "exceptions", "Reprocess")) &&
    !(await can(session, "exceptions", "Hold"))
  )
    throw new AppError("FORBIDDEN", "Hold release permission is required.", 403);

  const row = await prisma.holdReturn.findUnique({
    where: { id: exceptionId },
    include: { file: { include: { flights: true } } },
  });
  if (!row || row.type !== "Hold" || row.status !== "On Hold")
    throw new AppError("HOLD_STATE_INVALID", "Active hold not found.", 409);

  return prisma.$transaction(async (tx) => {
    await tx.holdReturn.update({
      where: { id: row.id },
      data: { status: "Released", note: `${row.note || ""}\nRelease: ${reason}` },
    });

    const isFlightCompleted =
      row.previousStage?.toLowerCase().includes("flight") ||
      (row.file.currentStage || "").toLowerCase().includes("flight") ||
      (row.file.flights && row.file.flights.length > 0);
    const targetStatus = isFlightCompleted ? "COMPLETED" : "ACTIVE";

    const file = await tx.processingFile.update({
      where: { id: row.fileId },
      data: { status: targetStatus },
    });

    await tx.fileStatusHistory.create({
      data: {
        fileId: row.fileId,
        previousStage: row.file.currentStage,
        newStage: row.previousStage || row.file.currentStage,
        previousStatus: "HOLD",
        newStatus: targetStatus,
        reason,
        actorId: session.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        role: session.user.role.name,
        module: "Exceptions",
        recordId: row.fileId,
        action: "RELEASE_HOLD",
        oldValue: { status: "HOLD" },
        newValue: { status: targetStatus },
        reason,
        correlationId: crypto.randomUUID(),
      },
    });

    return file;
  });
}

export async function releaseFileHold(
  fileId: string,
  reason: string,
  session: NonNullable<AwaitedSession>
) {
  if (
    !(await can(session, "exceptions", "Reprocess")) &&
    !(await can(session, "exceptions", "Hold"))
  )
    throw new AppError("FORBIDDEN", "Hold release permission is required.", 403);

  const file = await prisma.processingFile.findUnique({
    where: { id: fileId },
    include: { flights: true },
  });
  if (!file) throw new AppError("NOT_FOUND", "File not found.", 404);

  const activeHold = await prisma.holdReturn.findFirst({
    where: { fileId: file.id, type: "Hold", status: "On Hold" },
    orderBy: { createdAt: "desc" },
  });

  return prisma.$transaction(async (tx) => {
    if (activeHold) {
      await tx.holdReturn.update({
        where: { id: activeHold.id },
        data: {
          status: "Released",
          note: `${activeHold.note || ""}\nRelease: ${reason}`,
        },
      });
    }

    const isFlightCompleted =
      (file.currentStage || "").toLowerCase().includes("flight") ||
      file.flights.length > 0;
    const targetStatus = isFlightCompleted ? "COMPLETED" : "ACTIVE";

    const updated = await tx.processingFile.update({
      where: { id: file.id },
      data: { status: targetStatus },
    });

    await tx.fileStatusHistory.create({
      data: {
        fileId: file.id,
        previousStage: file.currentStage,
        newStage: file.currentStage,
        previousStatus: "HOLD",
        newStatus: targetStatus,
        reason,
        actorId: session.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        role: session.user.role.name,
        module: "Exceptions",
        recordId: file.id,
        action: "RELEASE_HOLD",
        oldValue: { status: "HOLD" },
        newValue: { status: targetStatus },
        reason,
        correlationId: crypto.randomUUID(),
      },
    });

    return updated;
  });
}

export async function requestReprocess(
  input: {
    fileId: string;
    proposedStage: string;
    reason: string;
    targetDate?: Date;
  },
  session: NonNullable<AwaitedSession>
) {
  if (!(await can(session, "exceptions", "Reprocess")))
    throw new AppError("FORBIDDEN", "Re-process permission is required.", 403);

  const file = await prisma.processingFile.findUnique({
    where: { id: input.fileId },
  });
  if (!file) throw new AppError("NOT_FOUND", "File not found.", 404);

  return prisma.reprocessRequest.create({
    data: {
      fileId: file.id,
      previousStage: file.currentStage,
      proposedStage: input.proposedStage,
      reason: input.reason,
      targetDate: input.targetDate,
      requestedBy: session.userId,
      status: "Requested",
    },
  });
}
