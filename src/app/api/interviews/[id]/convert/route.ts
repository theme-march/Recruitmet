import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Prisma } from "@prisma/client";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { candidateId, interviewId } = body;

    const interview = interviewId
      ? await prisma.interview.findUnique({ where: { id: interviewId }, include: { schedule: true, candidate: true } })
      : await prisma.interview.findFirst({ where: { candidateId, scheduleId: id }, include: { schedule: true, candidate: true } });

    if (!interview) throw new AppError("NOT_FOUND", "Interview record not found.", 404);

    const existingFile = await prisma.processingFile.findFirst({
      where: { candidateId: interview.candidateId },
    });

    if (existingFile) {
      return Response.json({
        ok: true,
        data: existingFile,
        message: `File ${existingFile.fileNo} already exists in File Processing.`,
      });
    }

    const isDubai = /sobha|dubai|uae/i.test(interview.title || interview.company || interview.schedule?.title || "");
    const country = isDubai ? "Dubai" : "Saudi Arabia";
    const fileNo = `FILE-${Math.floor(100000 + Math.random() * 900000)}`;

    const newFile = await prisma.processingFile.create({
      data: {
        fileNo,
        candidateId: interview.candidateId,
        country,
        currentStage: "Passport Entry",
        status: "ACTIVE",
        profession: interview.profession || interview.schedule?.profession || "Driver",
        company: interview.company || interview.schedule?.company || "Saudi Binladen Group",
        agent: "Direct",
        assignedToId: session.userId,
        officeId: session.user.officeId || null,
      },
    });

    // Update WorkCall lead notes if existing
    const lead = await prisma.workCall.findFirst({ where: { candidateId: interview.candidateId } });
    if (lead) {
      const notesObj = lead.notes && typeof lead.notes === "object" && !Array.isArray(lead.notes) ? (lead.notes as Record<string, unknown>) : {};
      const workObj = notesObj.work && typeof notesObj.work === "object" && !Array.isArray(notesObj.work) ? (notesObj.work as Record<string, unknown>) : {};
      workObj.fileStatus = "Confirm";
      workObj.processingFileId = newFile.id;
      workObj.fileNo = newFile.fileNo;

      await prisma.workCall.update({
        where: { id: lead.id },
        data: {
          notes: { ...notesObj, work: workObj } as unknown as Prisma.InputJsonObject,
        },
      });
    }

    return Response.json({
      ok: true,
      data: newFile,
      message: `File ${newFile.fileNo} created and sent to 9-Stage Processing Pipeline!`,
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
