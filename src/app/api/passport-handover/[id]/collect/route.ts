import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withApiAccess } from "@/lib/api-access";
import { collectPassportItems } from "@/features/passport-handover/service";

async function POSTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // body: { collections: [{ itemId, status?, returnRemarks?, returnedAt? }] }
    if (!body.collections || !Array.isArray(body.collections) || body.collections.length === 0) {
      return NextResponse.json(
        { error: "At least one item must be specified for collection." },
        { status: 400 }
      );
    }

    const updated = await collectPassportItems(id, body.collections, session.user.id);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Failed to collect passport items:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to collect passports" },
      { status: 400 }
    );
  }
}

export const POST = withApiAccess("passport-handover", POSTHandler);
