import { connection } from "next/server";
import { ControlPlanePage } from "@/components/modules/control-plane-page";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/role-guard";

export default async function SuperAdminControlPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await connection();
  const { session } = await requireRole("SUPER_ADMIN");
  const { tab = "users" } = await searchParams;

  const [users, offices, roles, settings, audit] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { role: true, office: true },
    }),
    prisma.office.findMany({ orderBy: { code: "asc" } }),
    prisma.role.findMany({
      include: {
        _count: { select: { users: true } },
        permissions: { include: { permission: true } },
      },
    }),
    prisma.systemSetting.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] }),
    prisma.auditLog.findMany({
      take: 40,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  return (
    <ControlPlanePage
      superAdmin={true}
      currentOfficeId={session.user.officeId}
      initialTab={tab}
      users={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        username: u.username,
        status: u.status,
        roleId: u.roleId,
        officeId: u.officeId,
        role: u.role.name,
        office: u.office?.name ?? "Dhaka Head Office",
      }))}
      offices={offices.map((o) => ({
        id: o.id,
        code: o.code,
        name: o.name,
        city: o.city,
        country: o.country,
        status: "ACTIVE",
      }))}
      roles={roles.map((r) => ({
        id: r.id,
        name: r.name,
        users: r._count.users,
        modules: Array.from(new Set(r.permissions.map((p) => p.permission.module))),
      }))}
      settings={settings.map((s) => ({
        id: s.id,
        group: s.group,
        key: s.key,
        value: typeof s.value === "string" ? s.value : JSON.stringify(s.value ?? ""),
      }))}

      audit={audit.map((a) => ({
        id: a.id,
        action: a.action,
        module: a.module,
        recordId: a.recordId,
        actor: a.user?.name ?? "System",
        role: a.role ?? "System",
        createdAt: a.createdAt.toLocaleString(),
      }))}
    />
  );
}
