import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { toAppRole } from "@/lib/roles";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const roleKey = toAppRole(session.user.role?.name);
    if (roleKey !== "SUPER_ADMIN") {
      throw new AppError("FORBIDDEN", "Only Super Administrators can view permissions.", 403);
    }

    const callCenterRole = await prisma.role.findFirst({
      where: { name: "Call Center" },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    // Extract module -> actions map
    const granularMap: Record<string, string[]> = {};
    if (callCenterRole) {
      for (const rp of callCenterRole.permissions) {
        const mod = rp.permission.module;
        const act = rp.permission.action.toLowerCase();
        if (!granularMap[mod]) granularMap[mod] = [];
        if (!granularMap[mod].includes(act)) {
          granularMap[mod].push(act);
        }
      }
    }

    return Response.json({
      ok: true,
      data: {
        roleId: callCenterRole?.id ?? "role-call-center",
        granularPermissions: granularMap,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const roleKey = toAppRole(session.user.role?.name);
    if (roleKey !== "SUPER_ADMIN") {
      throw new AppError("FORBIDDEN", "Only Super Administrators can update permissions.", 403);
    }

    const body = await request.json();
    // Support { permissions: [{ module, actions: ["create", "read", "edit", "delete", "export", "assign"] }] }
    // or { granularMap: { [module]: ["create", "read", "edit", "delete"] } }
    const granularMap: Record<string, string[]> = body.granularMap || {};

    if (Array.isArray(body.permissions)) {
      for (const item of body.permissions) {
        if (item.module && Array.isArray(item.actions)) {
          granularMap[item.module] = item.actions;
        }
      }
    } else if (Array.isArray(body.modules)) {
      for (const mod of body.modules) {
        if (typeof mod === "string") {
          granularMap[mod] = ["create", "read", "edit", "delete", "export", "assign", "*"];
        }
      }
    }

    const callCenterRole = await prisma.role.findFirst({
      where: { name: "Call Center" },
    });

    if (!callCenterRole) {
      throw new AppError("NOT_FOUND", "Call Center role not found in database.", 404);
    }

    // Remove existing role permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId: callCenterRole.id },
    });

    // Insert granular permissions
    for (const [moduleName, actions] of Object.entries(granularMap)) {
      if (!actions || actions.length === 0) continue;

      for (const actionName of actions) {
        const act = actionName.toLowerCase();
        const perm = await prisma.permission.upsert({
          where: { module_page_action: { module: moduleName, page: "*", action: act } },
          update: {},
          create: { module: moduleName, page: "*", action: act },
        });

        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: callCenterRole.id, permissionId: perm.id } },
          update: {},
          create: { roleId: callCenterRole.id, permissionId: perm.id },
        });
      }
    }

    return Response.json({
      ok: true,
      message: "Call Center granular permissions saved successfully to MySQL database.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
