import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { toAppRole } from "@/lib/roles";
import { expandPermissions, permissionCatalog } from "@/lib/permission-policy";
import { requireSuperAdmin } from "@/lib/authorization";
import type { AwaitedSession } from "@/lib/types";

export const roleInput = z.object({
  name: z.string().trim().min(2).max(80), description: z.string().trim().max(500).default(""),
  granularMap: z.record(z.string(), z.array(z.string()).max(20)).default({}),
  roleId: z.string().optional(), expectedUpdatedAt: z.string().datetime().optional(),
}).strict();
export async function getRoleCatalog() {
  return permissionCatalog(await prisma.country.findMany({ select: { name: true }, orderBy: { name: "asc" } }));
}
export async function listRoles() {
  const catalog = await getRoleCatalog();
  const roles = await prisma.role.findMany({ include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } }, orderBy: { createdAt: "asc" } });
  return { catalog, roles: roles.map(role => ({ id: role.id, name: role.name, description: role.description, status: role.status, updatedAt: role.updatedAt, userCount: role._count.users, kind: toAppRole(role.name), granularPermissions: expandPermissions(role.permissions.map(r => r.permission), catalog) })) };
}
export async function saveRole(raw: unknown, session: AwaitedSession) {
  requireSuperAdmin(session);
  const input = roleInput.parse(raw);
  const catalog = await getRoleCatalog();
  const requestedName = input.name.toLowerCase().replace(/[^a-z]/g, "");
  const reserved = ["superadministrator", "superadmin", "callcenter", "callcenterofficer", "agent", "agentpartner", "agentportal", "custom"];
  const current = input.roleId ? await prisma.role.findUnique({ where: { id: input.roleId } }) : null;
  if (input.roleId && !current) throw new AppError("NOT_FOUND", "Role not found.", 404);
  if (current && ["SUPER_ADMIN", "AGENT"].includes(toAppRole(current.name))) throw new AppError("PROTECTED_ROLE", "This built-in role is protected.", 403);
  if (reserved.includes(requestedName) && input.name !== current?.name) throw new AppError("RESERVED_ROLE", "Choose a name other than a reserved built-in role.", 422);
  if (current && toAppRole(current.name) === "CALL_CENTER" && input.name !== current.name) throw new AppError("PROTECTED_ROLE", "The default role cannot be renamed.", 422);
  if (current && !input.expectedUpdatedAt) throw new AppError("VERSION_REQUIRED", "Reload the role before saving.", 409);
  const entries: { module: string; action: string }[] = [];
  for (const [module, actions] of Object.entries(input.granularMap)) {
    const definition = catalog.find(m => m.id === module);
    if (!definition || actions.some(a => !definition.actions.includes(a as never))) throw new AppError("INVALID_PERMISSION", "Unknown module or unsupported action.", 422);
    if (actions.length && !actions.includes("read")) throw new AppError("READ_REQUIRED", "Enable View before granting other actions.", 422);
    for (const action of new Set(actions)) entries.push({ module, action });
  }
  try {
    return await prisma.$transaction(async tx => {
      let role = current;
      if (role) {
        const changed = await tx.role.updateMany({ where: { id: role.id, updatedAt: new Date(input.expectedUpdatedAt!) }, data: { name: input.name, description: input.description, updatedAt: new Date() } });
        if (!changed.count) throw new AppError("STALE_ROLE", "Another administrator changed this role. Reload before saving.", 409);
      } else role = await tx.role.create({ data: { name: input.name, description: input.description } });
      const before = await tx.rolePermission.findMany({ where: { roleId: role.id }, include: { permission: true } });
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      for (const entry of entries) {
        const permission = await tx.permission.upsert({ where: { module_page_action: { ...entry, page: "*" } }, update: {}, create: { ...entry, page: "*" } });
        await tx.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
      }
      await tx.auditLog.create({ data: { userId: session.userId, role: session.user.role.name, module: "Administration", recordId: role.id, action: current ? "UPDATE_ROLE_PERMISSIONS" : "CREATE_ROLE", oldValue: { name: current?.name ?? null, permissions: before.map(r => ({ module: r.permission.module, action: r.permission.action })) }, newValue: { name: input.name, permissions: entries }, correlationId: crypto.randomUUID() } });
      return { id: role.id };
    }, { timeout: 15000 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") throw new AppError("DUPLICATE_ROLE", "A role with this name already exists.", 409);
    throw error;
  }
}
