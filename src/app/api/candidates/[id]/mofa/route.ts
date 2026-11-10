import { withApiAccess } from "@/lib/api-access";
export const GET = withApiAccess("candidates/[id]/mofa", GETHandler);
export const POST = withApiAccess("candidates/[id]/mofa", POSTHandler);

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";

async function GETHandler(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const { id } = await params;
    const candidate = await prisma.candidate.findFirst({
      where: { OR: [{ id }, { candidateNo: id }] },
      include: {
        files: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          include: { mofa: true, passport: true },
        },
      },
    });

    if (!candidate) throw new AppError("NOT_FOUND", "Candidate not found.", 404);

    return NextResponse.json({
      success: true,
      candidate,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

async function POSTHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const { id } = await params;
    const body = await request.json();

    const candidate = await prisma.candidate.findFirst({
      where: { OR: [{ id }, { candidateNo: id }] },
      include: {
        files: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          include: { mofa: true },
        },
      },
    });

    if (!candidate) throw new AppError("NOT_FOUND", "Candidate not found.", 404);

    const activeFile = candidate.files[0];
    if (activeFile) {
      const existingMofa = activeFile.mofa[0];
      const metadata = {
        fatherName: body.fatherName || "",
        motherName: body.motherName || "",
        placeOfBirth: body.placeOfBirth || "",
        religion: body.religion || "ISLAM",
        sect: body.sect || "Sunni",
        qualification: body.qualification || "",
        professionAr: body.professionAr || "",
        agencyName: body.agencyName || "",
        agencyRl: body.agencyRl || "",
        agencyAddress: body.agencyAddress || "",
        agencyPhone: body.agencyPhone || "",
        destinationCity: body.destinationCity || "",
        carrier: body.carrier || "",
        durationOfStay: body.durationOfStay || "02 Years",
        dateOfArrival: body.dateOfArrival || "",
        dateOfDeparture: body.dateOfDeparture || "",
        modeOfPayment: body.modeOfPayment || "Cash",
        paymentChequeNo: body.paymentChequeNo || "",
        paymentDate: body.paymentDate || "",
        relationship: body.relationship || "EMPLOYER AND EMPLOYEE",
        sponsorNameAndAddress: body.sponsorNameAndAddress || "",
        applicationType: body.applicationType || "New Application",
        visaType: body.visaType || "Work Visa",
        mofaNumber: body.mofaNumber || "",
      };

      if (existingMofa) {
        await prisma.mofaProcess.update({
          where: { id: existingMofa.id },
          data: {
            mofaNumber: body.mofaNumber || existingMofa.mofaNumber,
            metadata,
          },
        });
      } else {
        await prisma.mofaProcess.create({
          data: {
            fileId: activeFile.id,
            mofaNumber: body.mofaNumber || `E${Math.floor(100000000 + Math.random() * 900000000)}`,
            status: "Pending",
            metadata,
          },
        });
      }

      // Also persist to call note for identity preservation
      const latestCall = await prisma.workCall.findFirst({
        where: { candidateId: candidate.id },
        orderBy: { createdAt: "desc" },
      });
      if (latestCall) {
        const currentNotes = (latestCall.notes as Record<string, any>) || {};
        const identity = currentNotes.identity || {};
        identity.fatherName = body.fatherName || identity.fatherName;
        identity.motherName = body.motherName || identity.motherName;
        identity.placeOfBirth = body.placeOfBirth || identity.placeOfBirth;
        await prisma.workCall.update({
          where: { id: latestCall.id },
          data: {
            notes: { ...currentNotes, identity },
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "MOFA application details saved successfully.",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
