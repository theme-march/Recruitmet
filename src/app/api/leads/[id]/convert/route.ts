import { convertLeadToFile } from "@/features/leads/service";
import { withApiAccess } from "@/lib/api-access";
import { AppError, errorResponse } from "@/lib/errors";
import { getSession } from "@/lib/session";

async function POSTHandler(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const { id } = await params;
    const result = await convertLeadToFile(id, session, { requireApproval: true });
    return Response.json(
      {
        data: {
          id: result.candidate.id,
          candidateNo: result.candidate.candidateNo,
          fileId: result.file.id,
          fileNo: result.file.fileNo,
        },
      },
      { status: result.fileCreated ? 201 : 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export const POST = withApiAccess("leads/[id]/convert", POSTHandler);
