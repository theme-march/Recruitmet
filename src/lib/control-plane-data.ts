import "server-only";
import { prisma } from "@/lib/prisma";
import { officeScope } from "@/lib/authorization";
import type { AwaitedSession } from "@/lib/types";

export async function getControlPlaneData(session: NonNullable<AwaitedSession>, superAdmin: boolean) {
  const settingsQuery = superAdmin
    ? prisma.systemSetting.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] })
    : Promise.resolve([]);
  const [users, offices, roles, settings, audit] = await Promise.all([
    prisma.user.findMany({ where: superAdmin ? {} : officeScope(session), orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, email: true, username: true, status: true, roleId: true, officeId: true, role: { select: { name: true } }, office: { select: { name: true } } } }),
    prisma.office.findMany({ where: superAdmin || !session.user.officeId ? {} : { id: session.user.officeId }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true, city: true, country: true, status: true } }),
    prisma.role.findMany({ where: { name: { in: ["Call Center", "Administrator", "Super Administrator"] } }, orderBy: { name: "asc" }, select: { id: true, name: true, permissions: { select: { permission: { select: { module: true } } } }, _count: { select: { users: true } } } }),
    settingsQuery,
    superAdmin ? prisma.auditLog.findMany({ take: 100, orderBy: { createdAt: "desc" }, select: { id: true, action: true, module: true, recordId: true, role: true, createdAt: true, user: { select: { name: true } } } }) : Promise.resolve([]),
  ]);
  return {
    users: users.map((user) => ({ ...user, office: user.office?.name ?? "Unassigned", role: user.role.name })),
    offices,
    roles: roles.map((role) => ({ id: role.id, name: role.name, users: role._count.users, modules: [...new Set(role.permissions.map((item) => item.permission.module))] })),
    settings: settings.map((setting) => ({ id: setting.id, group: setting.group, key: setting.key, value: typeof setting.value === "string" ? setting.value : JSON.stringify(setting.value) })),
    audit: audit.map((entry) => ({ id: entry.id, action: entry.action, module: entry.module, recordId: entry.recordId, actor: entry.user?.name ?? "System", role: entry.role ?? "System", createdAt: entry.createdAt.toISOString() })),
  };
}
