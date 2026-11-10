import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withApiAccess } from "@/lib/api-access";
import {
  listPassportHandovers,
  createPassportHandover,
  type CreateHandoverInput,
} from "@/features/passport-handover/service";

async function GETHandler(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const passportNo = searchParams.get("passportNo") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    const result = await listPassportHandovers({
      search,
      passportNo,
      status,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to list passport handovers:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to list passport handovers" },
      { status: 500 }
    );
  }
}

async function POSTHandler(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CreateHandoverInput;
    const handover = await createPassportHandover(body, session.user.id);

    return NextResponse.json({ success: true, data: handover }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create passport handover:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create passport handover" },
      { status: 400 }
    );
  }
}

export const GET = withApiAccess("passport-handover", GETHandler);
export const POST = withApiAccess("passport-handover", POSTHandler);
