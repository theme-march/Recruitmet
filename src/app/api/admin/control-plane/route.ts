import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const officeSchema = z.object({ action: z.literal("CREATE_OFFICE"), code: z.string().min(2).max(30), name: z.string().min(2).max(150), city: z.string().max(100).optional(), country: z.string().max(100).optional(), phone: z.string().max(30).optional(), email: z.email().optional() });
const settingSchema = z.object({ action: z.literal("SAVE_SETTING"), group: z.string().min(2).max(80), key: z.string().min(2).max(100), value: z.string().max(1000) });
const permissionsSchema = z.object({ action: z.literal("UPDATE_PERMISSIONS"), roleId: z.string(), modules: z.array(z.string()) });
const inputSchema = z.discriminatedUnion("action", [officeSchema, settingSchema, permissionsSchema]);

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const input = inputSchema.parse(await request.json());
    if (input.action === "CREATE_OFFICE") {
      const office = await prisma.office.create({ data: { code: input.code.toUpperCase(), name: input.name, city: input.city, country: input.country, phone: input.phone, email: input.email } });
      return Response.json({ data: office }, { status: 201 });
    }
    if (input.action === "UPDATE_PERMISSIONS") {
      const role = await prisma.role.findFirst({
        where: {
          OR: [
            { id: input.roleId },
            { name: "Call Center" },
            { name: input.roleId },
          ],
        },
      });
      if (!role) throw new AppError("NOT_FOUND", "Role not found.", 404);
      if (role.name === "Super Administrator") {
        throw new AppError("FORBIDDEN", "Super Administrator permissions cannot be modified.", 403);
      }

      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

      for (const mod of input.modules) {
        const perm = await prisma.permission.upsert({
          where: { module_page_action: { module: mod, page: "*", action: "*" } },
          update: {},
          create: { module: mod, page: "*", action: "*" },
        });

        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
          update: {},
          create: { roleId: role.id, permissionId: perm.id },
        });
      }

      return Response.json({ ok: true, message: "Permissions updated successfully" });
    }
    const setting = await prisma.systemSetting.upsert({ where: { group_key: { group: input.group, key: input.key } }, update: { value: input.value, updatedBy: session.userId }, create: { group: input.group, key: input.key, value: input.value, updatedBy: session.userId } });
    return Response.json({ data: setting });
  } catch (error) { return errorResponse(error); }
}

