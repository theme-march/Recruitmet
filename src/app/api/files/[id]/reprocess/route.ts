import { withApiAccess } from "@/lib/api-access";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";
import { requestReprocess } from "@/features/exceptions/service";

const schema = z.object({
  proposedStage: z.string().min(2),
  reason: z.string().min(3),
  targetDate: z.coerce.date().optional(),
});

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
    const input = schema.parse(await request.json());
    const row = await requestReprocess({ fileId: id, ...input }, session);

    return Response.json(
      { data: { id: row.id, status: row.status } },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export const POST = withApiAccess("files/[id]/reprocess", POSTHandler);
