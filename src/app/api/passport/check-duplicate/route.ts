import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAccess } from "@/lib/api-access";

export const GET = withApiAccess("work-calls", GETHandler);

async function GETHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const passportNo = (searchParams.get("passportNo") || "").trim();

    if (!passportNo || passportNo.length < 4) {
      return NextResponse.json({ exists: false });
    }

    const match = await prisma.candidate.findFirst({
      where: {
        OR: [
          { passportNo: { equals: passportNo } },
          { files: { some: { passport: { passportNumber: { equals: passportNo } } } } },
        ],
      },
      select: { id: true, fullName: true, candidateNo: true },
    });

    return NextResponse.json({
      exists: Boolean(match),
      candidateName: match?.fullName || null,
      candidateNo: match?.candidateNo || null,
    });
  } catch (error) {
    return NextResponse.json({ exists: false, error: String(error) });
  }
}
