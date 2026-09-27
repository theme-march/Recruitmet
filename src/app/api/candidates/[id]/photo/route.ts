import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";
import {
  getCandidateProfileImage,
  removeCandidateProfileImage,
  uploadCandidateProfileImage,
} from "@/features/candidates/profile-image";
import { withApiAccess } from "@/lib/api-access";

export const dynamic = "force-dynamic";
export const GET = withApiAccess("candidates/[id]/photo", GETHandler);
export const POST = withApiAccess("candidates/[id]/photo", POSTHandler);
export const DELETE = withApiAccess("candidates/[id]/photo", DELETEHandler);

async function GETHandler(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const { id } = await params;
    const image = await getCandidateProfileImage(id, session);
    return new Response(image.bytes as BodyInit, {
      headers: {
        "Content-Type": image.mimeType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-cache",
        ETag: `"${image.checksum}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function POSTHandler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("FILE_REQUIRED", "Select a profile photo to upload.", 422);
    const uploaded = await uploadCandidateProfileImage(id, file, session);
    return Response.json({ ok: true, data: uploaded }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

async function DELETEHandler(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const { id } = await params;
    const removed = await removeCandidateProfileImage(id, session);
    return Response.json({ ok: true, removed });
  } catch (error) {
    return errorResponse(error);
  }
}
