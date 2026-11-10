import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withApiAccess } from "@/lib/api-access";
import { searchAvailablePassports } from "@/features/passport-handover/service";

async function GETHandler(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ candidates: [] });
    }

    const candidates = await searchAvailablePassports(q);
    return NextResponse.json({ candidates });
  } catch (error: any) {
    console.error("Passport search error:", error);
    return NextResponse.json(
      { error: error?.message || "Search failed", candidates: [] },
      { status: 500 }
    );
  }
}

export const GET = withApiAccess("passport-handover", GETHandler);
