"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { createInterviewSchedule } from "@/features/interviews/service";
import type { ServerActionResult } from "./files";

export type CreateInterviewScheduleInput = {
  title: string;
  company?: string;
  profession?: string;
  scheduledAt: string | Date;
  venue?: string;
  meetingUrl?: string;
  interviewer?: string;
  capacity?: number;
  instructions?: string;
  candidateIds?: string[];
};

/**
 * Server Action: Create a new interview recruitment drive schedule
 */
export async function createInterviewScheduleAction(
  input: CreateInterviewScheduleInput
): Promise<ServerActionResult<{ id: string; title: string }>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const scheduledAtDate = typeof input.scheduledAt === "string" ? new Date(input.scheduledAt) : input.scheduledAt;

    const schedule = await createInterviewSchedule(
      {
        title: input.title.trim(),
        company: input.company?.trim(),
        profession: input.profession?.trim(),
        scheduledAt: scheduledAtDate,
        venue: input.venue?.trim(),
        meetingUrl: input.meetingUrl?.trim(),
        interviewer: input.interviewer?.trim(),
        capacity: Number(input.capacity) || 50,
        instructions: input.instructions?.trim(),
        candidateIds: input.candidateIds || [],
      },
      session
    );

    revalidatePath("/interviews");
    revalidatePath("/dashboard");
    revalidatePath("/module/interviews/interview-list");

    return {
      success: true,
      data: { id: schedule.id, title: schedule.title },
      message: `Interview drive "${schedule.title}" created successfully.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create interview schedule";
    return { success: false, error: message };
  }
}
