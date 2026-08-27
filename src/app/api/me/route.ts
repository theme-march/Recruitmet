import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { roleHome, roleLabel, toAppRole } from "@/lib/roles";
import { can } from "@/lib/authorization";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const unreadNotifications = await prisma.notification.count({ where: { recipient: session.userId, readAt: null } });
    const roleKey = toAppRole(session.user.role.name);
    const isSuperAdmin = roleKey === "SUPER_ADMIN";

    const canCreateDemands = isSuperAdmin || (await can(session, "office-vendor", "Create"));
    const canEditDemands = isSuperAdmin || (await can(session, "office-vendor", "Edit"));
    const canDeleteDemands = isSuperAdmin || (await can(session, "office-vendor", "Delete"));
    const canManageDemands = canCreateDemands || canEditDemands;

    const canCreateInterviews = isSuperAdmin || (await can(session, "registration", "Create"));
    const canEditInterviews = isSuperAdmin || (await can(session, "registration", "Edit"));
    const canDeleteInterviews = isSuperAdmin || (await can(session, "registration", "Delete"));
    const canManageInterviews = canCreateInterviews || canEditInterviews;

    let allowedModules: string[] = [
      "dashboard",
      "call-center",
      "ksa",
      "dubai",
      "other-country",
      "office-vendor",
      "registration",
      "payment-collection",
      "document",
      "tutorials",
    ];

    if (!isSuperAdmin && session.user.roleId) {
      const userRole = await prisma.role.findUnique({
        where: { id: session.user.roleId },
        include: { permissions: { include: { permission: true } } },
      });
      if (userRole && userRole.permissions.length > 0) {
        const perms = userRole.permissions.map((p) => p.permission.module);
        allowedModules = Array.from(new Set(["dashboard", ...perms]));
      }
    }

    return Response.json({
      data: {
        name: session.user.name,
        role: roleLabel(roleKey),
        roleKey,
        home: roleHome(roleKey),
        office: session.user.office?.name ?? null,
        unreadNotifications,
        allowedModules,
        permissions: {
          canManageDemands,
          canCreateDemands,
          canEditDemands,
          canDeleteDemands,
          canManageInterviews,
          canCreateInterviews,
          canEditInterviews,
          canDeleteInterviews,
        },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
