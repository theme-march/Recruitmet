import { withApiAccess } from "@/lib/api-access";
export const GET = withApiAccess("me", GETHandler);
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { roleHome, roleLabel, toAppRole } from "@/lib/roles";
import { getRoleCatalog } from "@/lib/role-administration";
import { can, roleGrants } from "@/lib/authorization";
import { hasPermission } from "@/lib/permission-policy";

async function GETHandler() {
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

    const catalog = await getRoleCatalog();
    const grants = await roleGrants(session.user.roleId);
    const allowedModules = catalog.filter(m => isSuperAdmin || hasPermission(grants, m.id, "read")).map(m => m.id);
    const granularPermissions = Object.fromEntries(catalog.map(m => [m.id, m.actions.filter(a => isSuperAdmin || hasPermission(grants, m.id, a))]));

    return Response.json(
      {
        data: {
          name: session.user.name,
          email: session.user.email,
          role: roleKey === "CUSTOM" ? session.user.role.name : roleLabel(roleKey),
          roleKey,
          home: roleHome(roleKey),
          office: session.user.office?.name ?? null,
          agentId: session.user.agentId ?? null,
          unreadNotifications,
          allowedModules,
          granularPermissions,
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
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
