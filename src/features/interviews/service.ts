import "server-only";

import { can } from "@/lib/authorization";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { AwaitedSession } from "@/lib/types";

type Session = NonNullable<AwaitedSession>;

export async function createInterviewSchedule(
  input: {
    title: string;
    company?: string;
    profession?: string;
    scheduledAt: Date;
    venue?: string;
    meetingUrl?: string;
    interviewer?: string;
    capacity: number;
    instructions?: string;
    candidateIds: string[];
  },
  session: Session,
) {
  if (!(await can(session, "interviews", "Add"))) {
    throw new AppError("FORBIDDEN", "Interview scheduling permission is required.", 403);
  }
  if (input.candidateIds.length > input.capacity) {
    throw new AppError("CAPACITY_EXCEEDED", "Selected candidates exceed schedule capacity.", 409);
  }
  const candidates = await prisma.candidate.findMany({
    where: { id: { in: input.candidateIds } },
    select: { id: true, candidateNo: true },
  });
  if (candidates.length !== input.candidateIds.length) {
    throw new AppError("CANDIDATE_NOT_FOUND", "One or more candidates were not found.", 404);
  }

  return prisma.$transaction(async (tx) => {
    const schedule = await tx.interviewSchedule.create({
      data: {
        title: input.title,
        company: input.company,
        profession: input.profession,
        scheduledAt: input.scheduledAt,
        venue: input.venue,
        meetingUrl: input.meetingUrl,
        interviewer: input.interviewer,
        capacity: input.capacity,
        instructions: input.instructions,
        interviews: {
          create: candidates.map((candidate) => ({
            candidateId: candidate.id,
            title: input.title,
            company: input.company,
            profession: input.profession,
            scheduledAt: input.scheduledAt,
            venue: input.venue ?? input.meetingUrl,
            interviewer: input.interviewer,
          })),
        },
      },
      include: { _count: { select: { interviews: true } } },
    });
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        role: session.user.role.name,
        module: "Interviews",
        recordId: schedule.id,
        action: "SCHEDULE",
        newValue: { title: schedule.title, candidates: candidates.length },
        correlationId: crypto.randomUUID(),
      },
    });
    return schedule;
  });
}

export async function assessInterview(
  interviewId: string,
  input: {
    result: string;
    rating?: number;
    notes?: string;
    assessments: { criterion: string; score?: number; answer?: string; notes?: string }[];
  },
  session: Session,
) {
  if (!(await can(session, "interviews", "Update"))) {
    throw new AppError("FORBIDDEN", "Interview update permission is required.", 403);
  }
  const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
  if (!interview) throw new AppError("NOT_FOUND", "Interview not found.", 404);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.interview.update({
      where: { id: interviewId },
      data: {
        result: input.result,
        rating: input.rating,
        notes: input.notes,
        assessments: { create: input.assessments },
      },
      include: { assessments: true },
    });
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        role: session.user.role.name,
        module: "Interviews",
        recordId: interviewId,
        action: "ASSESS",
        oldValue: { result: interview.result, rating: interview.rating },
        newValue: { result: updated.result, rating: updated.rating },
        correlationId: crypto.randomUUID(),
      },
    });
    return updated;
  });
}
