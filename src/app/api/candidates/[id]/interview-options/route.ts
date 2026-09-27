import { Prisma } from "@prisma/client";
import { z } from "zod";
import { withApiAccess } from "@/lib/api-access";
import { officeScope } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const PATCH = withApiAccess("candidates/[id]/interview-options", PATCHHandler);

const optionalText = z.string().trim().max(500).optional().default("");
const updateSchema = z.object({
  interviewScheduleId: optionalText,
  interviewDate: optionalText,
  workCategory: optionalText,
  workSubCategory: optionalText,
  company: optionalText,
  interviewStatus: optionalText,
  fileStatus: optionalText,
});

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optionalDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError("INVALID_INTERVIEW_DATE", "Enter a valid interview date.", 422);
  }
  return date;
}

async function PATCHHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const { id } = await params;
    const input = updateSchema.parse(await request.json());
    const candidate = await prisma.candidate.findFirst({
      where: { id, ...officeScope(session) },
      include: {
        calls: { orderBy: { updatedAt: "desc" }, take: 1 },
        interviews: { orderBy: { updatedAt: "desc" }, take: 1 },
      },
    });
    if (!candidate) throw new AppError("NOT_FOUND", "Candidate was not found.", 404);

    const schedule = input.interviewScheduleId
      ? await prisma.interviewSchedule.findUnique({ where: { id: input.interviewScheduleId } })
      : null;
    if (input.interviewScheduleId && !schedule) {
      throw new AppError("SCHEDULE_NOT_FOUND", "Selected interview schedule was not found.", 404);
    }

    const requestedDate = optionalDate(input.interviewDate);
    const existingCall = candidate.calls[0];
    const existingInterview = candidate.interviews[0];
    const hasInterviewDetails = Boolean(
      input.interviewScheduleId || input.interviewDate || input.interviewStatus,
    );

    const result = await prisma.$transaction(async (tx) => {
      const notes = objectValue(existingCall?.notes);
      const interview = objectValue(notes.interview);
      const work = objectValue(notes.work);

      interview.option = hasInterviewDetails ? "With Interview" : "";
      interview.scheduleId = schedule?.id ?? "";
      interview.scheduleTitle = schedule?.title ?? "";
      interview.date = input.interviewDate;
      interview.status = input.interviewStatus;
      work.category = input.workCategory;
      work.subCategory = input.workSubCategory;
      work.company = input.company;
      work.fileStatus = input.fileStatus;

      const nextNotes = { ...notes, interview, work } as Prisma.InputJsonValue;
      let callId = existingCall?.id;
      if (existingCall) {
        await tx.workCall.update({
          where: { id: existingCall.id },
          data: {
            workCategory: input.workCategory || null,
            company: input.company || schedule?.company || null,
            notes: nextNotes,
          },
        });
      } else {
        const createdCall = await tx.workCall.create({
          data: {
            leadNo: `LEAD-${Date.now().toString().slice(-8)}`,
            candidateId: candidate.id,
            fullName: candidate.fullName,
            phone: candidate.phone,
            country: candidate.preferredCountry,
            workCategory: input.workCategory || null,
            company: input.company || schedule?.company || null,
            source: candidate.source || "Direct",
            purpose: "Candidate profile update",
            priority: 3,
            status: "New",
            assignedToId: session.userId,
            notes: nextNotes,
          },
        });
        callId = createdCall.id;
      }

      const profession = input.workSubCategory || input.workCategory;
      if (profession) {
        await tx.candidate.update({
          where: { id: candidate.id },
          data: { profession },
        });
      }
      if (profession || input.company || schedule?.company) {
        await tx.processingFile.updateMany({
          where: { candidateId: candidate.id },
          data: {
            ...(profession ? { profession } : {}),
            ...(input.company || schedule?.company
              ? { company: input.company || schedule?.company }
              : {}),
          },
        });
      }

      let interviewRecord = existingInterview;
      if (schedule) {
        const data = {
          scheduleId: schedule.id,
          title: schedule.title,
          company: input.company || schedule.company,
          profession: profession || schedule.profession,
          scheduledAt: requestedDate ?? schedule.scheduledAt,
          venue: schedule.venue,
          interviewer: schedule.interviewer,
          result: input.interviewStatus || existingInterview?.result || "Waiting For Interview",
        };
        interviewRecord = existingInterview
          ? await tx.interview.update({ where: { id: existingInterview.id }, data })
          : await tx.interview.create({ data: { candidateId: candidate.id, ...data } });
      } else if (requestedDate) {
        const data = {
          scheduleId: null,
          title: existingInterview?.title || "Candidate Interview",
          company: input.company || null,
          profession: profession || null,
          scheduledAt: requestedDate,
          result: input.interviewStatus || existingInterview?.result || "Waiting For Interview",
        };
        interviewRecord = existingInterview
          ? await tx.interview.update({ where: { id: existingInterview.id }, data })
          : await tx.interview.create({ data: { candidateId: candidate.id, ...data } });
      } else if (existingInterview && input.interviewStatus) {
        interviewRecord = await tx.interview.update({
          where: { id: existingInterview.id },
          data: {
            scheduleId: null,
            company: input.company || existingInterview.company,
            profession: profession || existingInterview.profession,
            result: input.interviewStatus,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          userId: session.userId,
          module: "Candidate",
          recordId: candidate.id,
          action: "UPDATE_INTERVIEW_OPTIONS",
          summary: `Updated interview and drive options for ${candidate.candidateNo}`,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          role: session.user.role.name,
          module: "Candidate",
          recordId: candidate.id,
          action: "UPDATE_INTERVIEW_OPTIONS",
          newValue: input,
          correlationId: crypto.randomUUID(),
        },
      });

      return { callId, interviewRecord };
    });

    return Response.json({
      ok: true,
      data: {
        interviewOptions: {
          interviewScheduleId: schedule?.id ?? "",
          interviewSchedule: schedule?.title ?? "",
          interviewDate:
            result.interviewRecord?.scheduledAt.toISOString() ?? input.interviewDate,
          workCategory: input.workCategory,
          workSubCategory: input.workSubCategory,
          company: input.company || schedule?.company || "",
          interviewStatus: result.interviewRecord?.result ?? input.interviewStatus,
          fileStatus: input.fileStatus,
        },
        latestInterview: result.interviewRecord
          ? {
              id: result.interviewRecord.id,
              status: result.interviewRecord.result,
              scheduledAt: result.interviewRecord.scheduledAt.toISOString(),
              title: result.interviewRecord.title,
              company: result.interviewRecord.company || "—",
            }
          : null,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
