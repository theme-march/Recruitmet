import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withApiAccess } from "@/lib/api-access";
import { prisma } from "@/lib/prisma";
import { deletePassportHandover } from "@/features/passport-handover/service";

async function GETHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const handover = await prisma.passportHandover.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            candidate: {
              select: { id: true, candidateNo: true, fullName: true, phone: true, passportNo: true },
            },
          },
        },
      },
    });

    if (!handover) {
      return NextResponse.json({ error: "Handover not found" }, { status: 404 });
    }

    return NextResponse.json({ data: handover });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deletePassportHandover(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete" }, { status: 500 });
  }
}

export const GET = withApiAccess("passport-handover", GETHandler);
export const DELETE = withApiAccess("passport-handover", DELETEHandler);
