"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { RecordStatus } from "@prisma/client";
import { candidateCreateSchema } from "@/features/candidates/schemas";
import { createCandidate } from "@/features/candidates/service";
import type { z } from "zod";
import type { ServerActionResult } from "./files";

/**
 * Server Action: Register / Create a new candidate with verification
 */
export async function createCandidateAction(
  input: z.infer<typeof candidateCreateSchema>
): Promise<ServerActionResult<{ id: string; candidateNo: string }>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const validated = candidateCreateSchema.parse(input);
    const candidate = await createCandidate(validated, session);

    revalidatePath("/candidates");
    revalidatePath("/dashboard");
    revalidatePath("/module/candidates/all-candidates");

    return {
      success: true,
      data: { id: candidate.id, candidateNo: candidate.candidateNo },
      message: `Candidate ${candidate.candidateNo} registered successfully.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to register candidate";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Update Candidate basic status and notes
 */
export async function updateCandidateStatusAction(
  candidateId: string,
  status: string,
  note?: string
): Promise<ServerActionResult<{ id: string; status: string }>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return { success: false, error: "Candidate record not found." };
    }

    const updated = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        status: status as RecordStatus,
      },
    });

    revalidatePath("/candidates");
    revalidatePath("/dashboard");
    revalidatePath("/module/candidates/all-candidates");
    revalidatePath("/module/call-center/work-call-list");

    return {
      success: true,
      data: { id: updated.id, status: updated.status },
      message: `Candidate status updated to "${status}".`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update candidate";
    return { success: false, error: message };
  }
}
