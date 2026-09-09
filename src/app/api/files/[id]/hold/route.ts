import { withApiAccess } from "@/lib/api-access";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";
import { placeException, releaseFileHold } from "@/features/exceptions/service";

const schema = z.object({
  action: z.enum(["hold", "release"]).optional(),
  reason: z.string().min(2).optional(),
  note: z.string().optional(),
  expectedRelease: z.coerce.date().optional(),
  attachment: z.string().optional(),
});

async function POSTHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const { id } = await params;
    const body = await request.json();
    const input = schema.parse(body);

    if (input.action === "release") {
      const file = await releaseFileHold(
        id,
        input.reason || "Released from hold by operator",
        session
      );
      return Response.json({ data: { id: file.id, status: file.status } });
    }

    const row = await placeException(
      {
        fileId: id,
        type: "Hold",
        reason: input.reason || "Administrative Hold",
        note: input.note || "File placed on hold",
        expectedRelease: input.expectedRelease,
        attachment: input.attachment,
      },
      session
    );

    return Response.json(
      { data: { id: row.id, status: row.status } },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

async function DELETEHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const { id } = await params;
    let reason = "Released from hold by operator";
    try {
      const body = await request.json();
      if (body?.reason) reason = body.reason;
    } catch {}

    const file = await releaseFileHold(id, reason, session);
    return Response.json({ data: { id: file.id, status: file.status } });
  } catch (error) {
    return errorResponse(error);
  }
}

export const POST = withApiAccess("files/[id]/hold", POSTHandler);
export const DELETE = withApiAccess("files/[id]/hold", DELETEHandler);
