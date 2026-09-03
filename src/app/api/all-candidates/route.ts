import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";
import { getCandidatesData } from "@/server/data/candidates";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const country = (url.searchParams.get("country") ?? "").trim();
    const stage = (url.searchParams.get("stage") ?? "").trim();
    const status = (url.searchParams.get("status") ?? "").trim();
    const interviewStatus = (url.searchParams.get("interviewStatus") ?? "").trim();
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(5, Number(url.searchParams.get("pageSize")) || 20));

    const result = await getCandidatesData(session, {
      q,
      country,
      stage,
      status,
      interviewStatus,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
