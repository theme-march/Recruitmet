import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";
import { parsePagination, pageResult } from "@/lib/pagination";
import { candidateCreateSchema } from "@/features/candidates/schemas";
import { createCandidate, listCandidates } from "@/features/candidates/service";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const p = parsePagination(request.url);
    const result = await listCandidates(p, session);
    return Response.json(pageResult(result.data, result.total, p.page, p.pageSize));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const candidate = await createCandidate(candidateCreateSchema.parse(await request.json()), session);

    revalidatePath("/candidates");
    revalidatePath("/dashboard");

    return Response.json({ data: { id: candidate.id, candidateNo: candidate.candidateNo } }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
