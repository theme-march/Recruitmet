"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { RecordStatus } from "@prisma/client";

export type ServerActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

/**
 * Server Action: Update processing stage for a candidate file.
 * Next.js App Router idiomatic mutation with automatic cache revalidation.
 */
export async function updateFileStageAction(
  fileId: string,
  newStage: string,
  note?: string
): Promise<ServerActionResult<{ id: string; stage: string }>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const file = await prisma.processingFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return { success: false, error: "Candidate file record not found." };
    }

    const previousStage = file.currentStage;
    const currentStatus = file.status as RecordStatus;

    const updatedFile = await prisma.processingFile.update({
      where: { id: fileId },
      data: {
        currentStage: newStage,
        statusHistory: {
          create: {
            previousStage,
            newStage,
            previousStatus: currentStatus,
            newStatus: currentStatus,
            reason: note || `Stage progressed to ${newStage}`,
            actorId: session.userId,
          },
        },
      },
    });

    // Next.js automatic path revalidation
    revalidatePath(`/file/${fileId}`);
    revalidatePath("/candidates");
    revalidatePath("/dashboard");
    revalidatePath("/module/ksa/candidates-list");
    revalidatePath("/module/dubai/candidates-list");

    return {
      success: true,
      data: { id: updatedFile.id, stage: updatedFile.currentStage },
      message: `File stage successfully updated to "${newStage}".`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update file stage";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Place a candidate file on hold.
 */
export async function holdFileAction(
  fileId: string,
  reason: string,
  note?: string,
  expectedRelease?: string
): Promise<ServerActionResult<{ id: string }>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const file = await prisma.processingFile.findUnique({ where: { id: fileId } });
    if (!file) {
      return { success: false, error: "Candidate file not found." };
    }

    await prisma.holdReturn.create({
      data: {
        fileId,
        type: "HOLD",
        previousStage: file.currentStage || "Passport Entry",
        reason,
        note: note || "Candidate file placed on hold",
        status: "ACTIVE",
        expectedRelease: expectedRelease ? new Date(expectedRelease) : undefined,
      },
    });

    await prisma.processingFile.update({
      where: { id: fileId },
      data: { status: "HOLD" },
    });

    revalidatePath(`/file/${fileId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { id: fileId },
      message: "Candidate file placed on HOLD successfully.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to place file on hold";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Release a candidate file from hold.
 */
export async function releaseHoldAction(
  fileId: string,
  reason?: string
): Promise<ServerActionResult<{ id: string }>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const file = await prisma.processingFile.findUnique({ where: { id: fileId } });
    if (!file) {
      return { success: false, error: "Candidate file not found." };
    }

    await prisma.holdReturn.updateMany({
      where: { fileId, type: "HOLD", status: "ACTIVE" },
      data: { status: "RELEASED", releasedAt: new Date() },
    });

    await prisma.processingFile.update({
      where: { id: fileId },
      data: { status: "ACTIVE" },
    });

    revalidatePath(`/file/${fileId}`);
    revalidatePath("/candidates");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { id: fileId },
      message: "Candidate file released from HOLD successfully.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to release file from hold";
    return { success: false, error: message };
  }
}

