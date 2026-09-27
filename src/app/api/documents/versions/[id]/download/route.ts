import { getPrivateDocument } from "@/features/documents/service";
import { withApiAccess } from "@/lib/api-access";
import { AppError, errorResponse } from "@/lib/errors";
import { getSession } from "@/lib/session";

async function GETHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const { id } = await params;
    const file = await getPrivateDocument(id, session);
    const disposition = new URL(request.url).searchParams.get("inline") === "1"
      ? "inline"
      : "attachment";
    return new Response(file.bytes as BodyInit, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET = withApiAccess("documents/versions/[id]/download", GETHandler);
