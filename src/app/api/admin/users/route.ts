import { withApiAccess } from "@/lib/api-access";
export const GET = withApiAccess("admin/users", GETHandler);
export const POST = withApiAccess("admin/users", POSTHandler);
export const PATCH = withApiAccess("admin/users", PATCHHandler);
export const DELETE = withApiAccess("admin/users", DELETEHandler);
import { hash } from "bcryptjs";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { AppError, errorResponse } from "@/lib/errors";
import { pageResult, parsePagination } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { toAppRole } from "@/lib/roles";
import { requireSuperAdmin } from "@/lib/authorization";

const createSchema = z.object({
  name: z.string().trim().min(2).max(150), email: z.string().trim().email(),
  username: z.string().trim().min(3).max(80), employeeId: z.string().max(50).optional(),
  phone: z.string().max(30).optional(), roleId: z.string().min(1),
  officeId: z.string().min(1).optional(), password: z.string().min(12).max(128),
}).strict();
const updateSchema = z.object({
  userId: z.string().min(1), status: z.enum(["ACTIVE", "INACTIVE", "LOCKED", "ON_LEAVE"]).optional(),
  roleId: z.string().min(1).optional(), officeId: z.string().nullable().optional(),
  password: z.string().min(12).max(128).optional(),
}).strict();

async function assignableRole(roleId: string) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role || role.status !== "ACTIVE") throw new AppError("INVALID_ROLE", "Choose an active role.", 422);
  if (toAppRole(role.name) === "AGENT") throw new AppError("PORTAL_ROLE", "Manage agent portal accounts from their agent profile.", 422);
  return role;
}
async function validateOffice(id?: string | null) {
  if (id && !await prisma.office.findUnique({ where: { id } })) throw new AppError("INVALID_OFFICE", "Office not found.", 422);
}
async function GETHandler(request: Request) {
  try {
    requireSuperAdmin(await getSession());
    const p = parsePagination(request.url);
    const where = p.q ? { OR: [{ name: { contains: p.q } }, { email: { contains: p.q } }, { username: { contains: p.q } }] } : {};
    const [data, total] = await Promise.all([
      prisma.user.findMany({ where, skip: p.skip, take: p.take, orderBy: { createdAt: "desc" }, select: {
        id: true, employeeId: true, name: true, email: true, username: true, phone: true, status: true,
        role: { select: { id: true, name: true } }, office: { select: { id: true, name: true } }, lastLoginAt: true, createdAt: true,
      } }), prisma.user.count({ where }),
    ]);
    return Response.json(pageResult(data, total, p.page, p.pageSize), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
async function POSTHandler(request: Request) {
  try {
    const session = await getSession(); requireSuperAdmin(session);
    const input = createSchema.parse(await request.json());
    const role = await assignableRole(input.roleId);
    await validateOffice(input.officeId);
    const duplicate = await prisma.user.findFirst({ where: { OR: [{ email: input.email }, { username: input.username }, ...(input.employeeId ? [{ employeeId: input.employeeId }] : [])] } });
    if (duplicate) throw new AppError("DUPLICATE_USER", "Email, username or employee ID is already in use.", 409);
    const passwordHash = await hash(input.password, 12);
    const user = await prisma.$transaction(async tx => {
      const created = await tx.user.create({ data: { name: input.name, email: input.email, username: input.username, employeeId: input.employeeId || null, phone: input.phone || null, roleId: role.id, officeId: input.officeId || null, passwordHash }, select: { id: true, name: true } });
      await tx.auditLog.create({ data: { userId: session.userId, role: session.user.role.name, module: "Administration", recordId: created.id, action: "CREATE_STAFF", newValue: { name: input.name, roleId: role.id, officeId: input.officeId ?? null }, correlationId: crypto.randomUUID() } });
      return created;
    });
    return Response.json({ ok: true, data: user }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
async function PATCHHandler(request: Request) {
  try {
    const session = await getSession(); requireSuperAdmin(session);
    const input = updateSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { id: input.userId }, include: { role: true } });
    if (!existing) throw new AppError("NOT_FOUND", "User not found.", 404);
    if (toAppRole(existing.role.name) === "AGENT" && input.roleId && input.roleId !== existing.roleId) throw new AppError("PORTAL_ROLE", "Portal accounts cannot be reassigned as staff.", 422);
    if (input.roleId) await assignableRole(input.roleId);
    await validateOffice(input.officeId);
    // Protect every existing Super Admin from accidental demotion/lockout.
    if (toAppRole(existing.role.name) === "SUPER_ADMIN" && ((input.roleId && input.roleId !== existing.roleId) || (input.status && input.status !== "ACTIVE"))) throw new AppError("PROTECTED_ACCOUNT", "Super Administrator accounts cannot be disabled or demoted here.", 409);
    const data: Prisma.UserUpdateInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.roleId ? { role: { connect: { id: input.roleId } } } : {}),
      ...(input.officeId !== undefined ? { office: input.officeId ? { connect: { id: input.officeId } } : { disconnect: true } } : {}),
      ...(input.password ? { passwordHash: await hash(input.password, 12) } : {}),
    };
    await prisma.$transaction(async tx => {
      await tx.user.update({ where: { id: existing.id }, data });
      // Password and status changes invalidate all existing sessions. Role changes
      // take effect on the next request through the database-backed session/DAL.
      if (input.password || (input.status && input.status !== "ACTIVE")) await tx.session.deleteMany({ where: { userId: existing.id } });
      await tx.auditLog.create({ data: { userId: session.userId, role: session.user.role.name, module: "Administration", recordId: existing.id, action: "UPDATE_USER_ACCESS", oldValue: { roleId: existing.roleId, status: existing.status, officeId: existing.officeId }, newValue: { roleId: input.roleId ?? existing.roleId, status: input.status ?? existing.status, officeId: input.officeId === undefined ? existing.officeId : input.officeId, passwordReset: Boolean(input.password) }, correlationId: crypto.randomUUID() } });
    });
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
async function DELETEHandler() {
  return errorResponse(new AppError("USE_DEACTIVATION", "Deactivate staff accounts to preserve operational and audit history.", 405));
}
