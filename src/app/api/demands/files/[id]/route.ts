import { can } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { privateStorage } from "@/server/storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(); if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "partners", "View"))) throw new AppError("FORBIDDEN", "Works and demands view permission is required.", 403);
    const { id } = await params;
    const demands = await prisma.demand.findMany({ select: { requirements: true, company: { select: { officeId: true } } } });
    const referenced = demands.some((demand) => { if (session.user.role.name !== "System Administrator" && session.user.officeId && demand.company.officeId !== session.user.officeId) return false; const value = demand.requirements && typeof demand.requirements === "object" && !Array.isArray(demand.requirements) ? demand.requirements as Record<string, unknown> : {}; return value.fileOneId === id || value.fileTwoId === id; });
    if (!referenced) throw new AppError("NOT_FOUND", "Image not found.", 404);
    const object = await prisma.storedObject.findUnique({ where: { id } });
    if (!object) throw new AppError("NOT_FOUND", "Image not found.", 404);
    const bytes = await privateStorage().get(object.objectKey);
    return new Response(Uint8Array.from(bytes).buffer, { headers: { "Content-Type": object.mimeType, "Content-Disposition": `inline; filename="${object.safeName}"`, "Cache-Control": "private, max-age=300" } });
  } catch (error) { return errorResponse(error); }
}
