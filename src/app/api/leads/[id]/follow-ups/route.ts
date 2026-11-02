import { withApiAccess } from "@/lib/api-access";
import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";
import { followUpSchema } from "@/features/leads/schemas";
import { addFollowUp } from "@/features/leads/service";

async function POSTHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    }

    const { id } = await params;
    const validated = followUpSchema.parse(await request.json());
    const row = await addFollowUp(id, validated, session);

    return Response.json(
      { data: { id: row.id, status: row.status } },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export const POST = withApiAccess("leads/[id]/follow-ups", POSTHandler);
