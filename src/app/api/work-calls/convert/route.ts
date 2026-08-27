import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const convertSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    }

    const body = await request.json();
    const { leadId } = convertSchema.parse(body);

    const lead = await prisma.workCall.findUnique({
      where: { id: leadId },
      include: { candidate: { include: { files: true } } },
    });

    if (!lead) {
      throw new AppError("NOT_FOUND", "Work call lead not found.", 404);
    }

    if (lead.candidate?.files?.length) {
      const existingFile = lead.candidate.files[0];
      return Response.json({
        data: {
          fileId: existingFile.id,
          candidateId: lead.candidate.id,
          fileNo: existingFile.fileNo,
          message: "Candidate file already exists",
        },
      });
    }

    const notes = typeof lead.notes === "object" && lead.notes !== null ? (lead.notes as Record<string, unknown>) : {};
    const passportObj = typeof notes.passport === "object" && notes.passport !== null ? (notes.passport as Record<string, unknown>) : {};
    const passportNo = (typeof passportObj.passportNo === "string" && passportObj.passportNo.trim()) ? passportObj.passportNo.trim() : null;

    const randNum = Math.floor(10000 + Math.random() * 90000);
    const candidateNo = `CAND-${randNum}`;
    const fileNo = `FILE-${randNum}`;

    const defaultOffice = await prisma.office.findFirst();
    const officeId = session.user.officeId || defaultOffice?.id || null;

    const result = await prisma.$transaction(async (tx) => {
      let candidateId = lead.candidateId;

      if (!candidateId) {
        let existingCand = null;
        if (passportNo) {
          existingCand = await tx.candidate.findUnique({
            where: { passportNo },
          });
        }

        if (existingCand) {
          candidateId = existingCand.id;
        } else {
          const newCand = await tx.candidate.create({
            data: {
              candidateNo,
              fullName: lead.fullName,
              phone: lead.phone,
              passportNo: passportNo || undefined,
              preferredCountry: lead.country || "Saudi Arabia",
              profession: lead.workCategory || "General Worker",
              officeId: officeId,
              status: "ACTIVE",
            },
          });
          candidateId = newCand.id;
        }
      }

      let processingFile = await tx.processingFile.findFirst({
        where: {
          candidateId,
          status: { notIn: ["RETURNED", "CANCELLED", "ARCHIVED"] },
        },
      });

      if (processingFile) {
        processingFile = await tx.processingFile.update({
          where: { id: processingFile.id },
          data: {
            country: lead.country || processingFile.country || "Saudi Arabia",
            profession: lead.workCategory || processingFile.profession || "General Worker",
            company: lead.company || processingFile.company || undefined,
            status: "ACTIVE",
          },
        });
      } else {
        processingFile = await tx.processingFile.create({
          data: {
            fileNo,
            candidateId,
            country: lead.country || "Saudi Arabia",
            profession: lead.workCategory || "General Worker",
            company: lead.company || undefined,
            currentStage: "Passport Entry",
            status: "ACTIVE",
            officeId: officeId,
            assignedToId: session.userId,
          },
        });
      }

      if (passportNo) {
        const issueDate = new Date();
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 10);

        const existingPassport = await tx.passportProcess.findUnique({
          where: { passportNumber: passportNo },
        });

        if (!existingPassport) {
          await tx.passportProcess.create({
            data: {
              fileId: processingFile.id,
              passportNumber: passportNo,
              passportType: "Ordinary",
              issueDate,
              expiryDate,
              verificationStatus: "Verified",
              enteredBy: session.user.name,
            },
          });
        }
      }

      await tx.workCall.update({
        where: { id: lead.id },
        data: {
          candidateId,
          status: "Converted",
        },
      });

      await tx.activityLog.create({
        data: {
          userId: session.userId,
          module: "call-center",
          recordId: lead.id,
          action: "CONVERT_TO_FILE",
          summary: `Converted lead ${lead.leadNo} to processing file ${fileNo} for ${lead.fullName}`,
        },
      });

      return {
        fileId: processingFile.id,
        candidateId,
        fileNo: processingFile.fileNo,
      };
    });

    return Response.json({
      data: {
        ...result,
        message: "Successfully converted lead to Candidate Processing File!",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
