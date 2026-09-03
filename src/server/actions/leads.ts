"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { createLead, convertLead } from "@/features/leads/service";
import { leadCreateSchema } from "@/features/leads/schemas";
import type { z } from "zod";
import type { ServerActionResult } from "./files";

/**
 * Server Action: Create / Register a new work call / lead
 */
export async function createLeadAction(
  input: z.infer<typeof leadCreateSchema>
): Promise<ServerActionResult<{ id: string; leadNo: string }>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const validated = leadCreateSchema.parse(input);
    const lead = await createLead(validated, session);

    revalidatePath("/dashboard");
    revalidatePath("/module/call-center/work-call-list");

    return {
      success: true,
      data: { id: lead.id, leadNo: lead.leadNo },
      message: `Lead ${lead.leadNo} recorded successfully.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record lead";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Convert a work call / lead into a verified Candidate
 */
export async function convertLeadAction(
  leadId: string
): Promise<ServerActionResult<{ candidateId: string; candidateNo: string }>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const candidate = await convertLead(leadId, session);

    revalidatePath("/candidates");
    revalidatePath("/dashboard");
    revalidatePath("/module/call-center/work-call-list");
    revalidatePath("/module/candidates/all-candidates");

    return {
      success: true,
      data: { candidateId: candidate.id, candidateNo: candidate.candidateNo },
      message: `Lead successfully converted to Candidate ${candidate.candidateNo}.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to convert lead";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Update lead/call center follow-up and status
 */
export async function updateLeadStatusAction(
  leadId: string,
  status: string,
  priority?: number,
  followUpAt?: string
): Promise<ServerActionResult<{ id: string; status: string }>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const lead = await prisma.workCall.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return { success: false, error: "Lead record not found." };
    }

    const updated = await prisma.workCall.update({
      where: { id: leadId },
      data: {
        status,
        priority: priority !== undefined ? priority : undefined,
        followUpAt: followUpAt ? new Date(followUpAt) : undefined,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/module/call-center/work-call-list");

    return {
      success: true,
      data: { id: updated.id, status: updated.status },
      message: `Lead status updated to "${status}".`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update lead";
    return { success: false, error: message };
  }
}
