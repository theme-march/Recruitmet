import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { AwaitedSession } from "@/lib/types";
import { toAppRole } from "@/lib/roles";
import { hasPermission, countryModule } from "@/lib/permission-policy";
import { AppError } from "@/lib/errors";

export const roleGrants = cache(async (roleId: string) => (await prisma.rolePermission.findMany({ where: { roleId }, include: { permission: true } })).map(row => row.permission));
export const can = cache(async (session: AwaitedSession, module: string, action = "read", page = "*"): Promise<boolean> => {
  if (!session || session.user.status !== "ACTIVE" || session.user.role.status !== "ACTIVE") return false;
  if (toAppRole(session.user.role.name) === "SUPER_ADMIN") return true;
  return hasPermission(await roleGrants(session.user.roleId), module, action, page);
});
export async function requirePermission(session: AwaitedSession, module: string, action = "read") {
  if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
  if (!await can(session, module, action)) throw new AppError("FORBIDDEN", `You do not have ${action} access to ${module}.`, 403);
}
export function requireSuperAdmin(session: AwaitedSession): asserts session is NonNullable<AwaitedSession> {
  if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
  if (session.user.role.status !== "ACTIVE" || toAppRole(session.user.role.name) !== "SUPER_ADMIN") throw new AppError("FORBIDDEN", "Only Super Administrators can manage system access.", 403);
}
export async function requireFilePermission(session: AwaitedSession, file: { country: string }, action = "read") {
  if (!await can(session, "files", action)) await requirePermission(session, countryModule(file.country), action);
}
export function officeScope(session: AwaitedSession) {
  if (!session) return { id: { in: [] as string[] } };
  if (!session.user.officeId || toAppRole(session.user.role.name) === "SUPER_ADMIN") return {};
  // AND survives caller-supplied OR search/country filters.
  return { AND: [{ OR: [{ officeId: session.user.officeId }, { officeId: null }] }] };
}
