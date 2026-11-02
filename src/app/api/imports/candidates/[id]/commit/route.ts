import { withApiAccess } from "@/lib/api-access";
import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";
import { commitCandidateImport } from "@/features/imports/candidate-import";

async function POSTHandler(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    }

    const { id } = await params;
    const result = await commitCandidateImport(id, session);
    return Response.json({ data: result });
  } catch (error) {
    return errorResponse(error);
  }
}

export const POST = withApiAccess("imports/candidates/[id]/commit", POSTHandler);
