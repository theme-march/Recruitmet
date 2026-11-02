import { withApiAccess } from "@/lib/api-access";
import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";
import { sendNotification } from "@/features/notifications/service";

async function POSTHandler(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    }

    const { id } = await params;
    const row = await sendNotification(id, session);
    return Response.json({
      data: { id: row.id, status: row.status, retryCount: row.retryCount },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export const POST = withApiAccess("notifications/[id]/resend", POSTHandler);
