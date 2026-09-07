import { withApiAccess } from "@/lib/api-access";
export const GET = withApiAccess("admin/roles", GETHandler);
export const POST = withApiAccess("admin/roles", POSTHandler);
export const DELETE = withApiAccess("admin/roles", DELETEHandler);
import { getSession } from "@/lib/session";
import { requireSuperAdmin } from "@/lib/authorization";
import { listRoles, saveRole } from "@/lib/role-administration";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { toAppRole } from "@/lib/roles";

async function GETHandler() {
  try {
    requireSuperAdmin(await getSession());
    const [data, offices] = await Promise.all([listRoles(), prisma.office.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })]);
    return Response.json({ data: { ...data, offices } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
async function POSTHandler(request: Request) {
  try { return Response.json({ ok: true, data: await saveRole(await request.json(), await getSession()) }); }
  catch (error) { return errorResponse(error); }
}
async function DELETEHandler(request: Request) {
  try {
    const session = await getSession(); requireSuperAdmin(session);
    const roleId = new URL(request.url).searchParams.get("roleId");
    if (!roleId) throw new AppError("REQUIRED", "Role ID is required.", 422);
    await prisma.$transaction(async tx => {
      const role = await tx.role.findUnique({ where: { id: roleId }, include: { _count: { select: { users: true } } } });
      if (!role) throw new AppError("NOT_FOUND", "Role not found.", 404);
      if (toAppRole(role.name) !== "CUSTOM") throw new AppError("PROTECTED_ROLE", "Default and portal roles cannot be deleted.", 403);
      if (role._count.users) throw new AppError("ROLE_IN_USE", "Reassign every user before deleting this role.", 409);
      await tx.role.delete({ where: { id: roleId } });
      await tx.auditLog.create({ data: { userId: session.userId, module: "Administration", recordId: roleId, action: "DELETE_ROLE", oldValue: { name: role.name }, correlationId: crypto.randomUUID() } });
    });
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
