import { z } from "zod";
import { assessInterview } from "@/features/interviews/service";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Prisma } from "@prisma/client";

const schema = z.object({
  result: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
  assessments: z
    .array(
      z.object({
        criterion: z.string().min(1).max(150),
        score: z.number().min(0).max(100).optional(),
        answer: z.string().max(1000).optional(),
        notes: z.string().max(1000).optional(),
      }),
    )
    .default([]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const { id } = await params;
    const input = schema.parse(await request.json());
    const interview = await assessInterview(id, input, session);

    // Sync back with WorkCall lead if exists
    if (interview?.candidateId) {
      const lead = await prisma.workCall.findFirst({ where: { candidateId: interview.candidateId } });
      if (lead) {
        const notesObj = lead.notes && typeof lead.notes === "object" && !Array.isArray(lead.notes) ? (lead.notes as Record<string, unknown>) : {};
        const interviewObj = notesObj.interview && typeof notesObj.interview === "object" && !Array.isArray(notesObj.interview) ? (notesObj.interview as Record<string, unknown>) : {};
        const workObj = notesObj.work && typeof notesObj.work === "object" && !Array.isArray(notesObj.work) ? (notesObj.work as Record<string, unknown>) : {};
        
        interviewObj.status = input.result;
        if (input.result === "Selected" || input.result === "Passed") {
          workObj.fileStatus = "Confirm";

          // Send to 9-stage file processing only when candidate is SELECTED!
          const existingFile = await prisma.processingFile.findFirst({
            where: { candidateId: interview.candidateId },
          });

          if (!existingFile) {
            const isDubai = /sobha|dubai|uae/i.test(interview.title || interview.company || "");
            const country = isDubai ? "Dubai" : "Saudi Arabia";
            const fileNo = `FILE-${Math.floor(100000 + Math.random() * 900000)}`;

            const newFile = await prisma.processingFile.create({
              data: {
                fileNo,
                candidateId: interview.candidateId,
                country,
                currentStage: "Passport Entry",
                status: "ACTIVE",
                profession: interview.profession || lead?.workCategory || "General Worker",
                company: interview.company || "Saudi Binladen Group",
                agent: lead?.source || "Direct",
                assignedToId: session.userId,
                officeId: session.user.officeId || null,
              },
            });

            workObj.processingFileId = newFile.id;
            workObj.fileNo = newFile.fileNo;
          }
        }
        
        await prisma.workCall.update({
          where: { id: lead.id },
          data: {
            notes: { ...notesObj, interview: interviewObj, work: workObj } as unknown as Prisma.InputJsonObject,
          },
        });
      }
    }

    return Response.json({ ok: true, data: interview, message: "Interview status updated successfully!" });
  } catch (error) {
    return errorResponse(error);
  }
}
