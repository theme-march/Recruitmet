import { withApiAccess } from "@/lib/api-access";
export const GET = withApiAccess("candidates", GETHandler);
export const POST = withApiAccess("candidates", POSTHandler);
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";
import { parsePagination, pageResult } from "@/lib/pagination";
import { candidateCreateSchema } from "@/features/candidates/schemas";
import { createCandidate, listCandidates } from "@/features/candidates/service";

async function GETHandler(request: Request) {
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

async function POSTHandler(request: Request) {
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
