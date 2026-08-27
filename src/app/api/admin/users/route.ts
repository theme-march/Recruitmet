import { hash } from "bcryptjs";
import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { pageResult, parsePagination } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { toAppRole } from "@/lib/roles";

const createSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email(),
  username: z.string().min(3).max(80),
  employeeId: z.string().max(50).optional(),
  phone: z.string().max(30).optional(),
  roleId: z.string().optional(),
  officeId: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const updateSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE", "LOCKED", "ON_LEAVE"]).optional(),
  officeId: z.string().nullable().optional(),
  password: z.string().min(6).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const roleKey = toAppRole(session.user.role?.name);
    if (roleKey !== "SUPER_ADMIN") {
      throw new AppError("FORBIDDEN", "Only Super Administrators can view user accounts.", 403);
    }

    const p = parsePagination(request.url);
    const where = {
      ...(p.q ? { OR: [{ name: { contains: p.q } }, { email: { contains: p.q } }, { username: { contains: p.q } }] } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          employeeId: true,
          name: true,
          email: true,
          username: true,
          phone: true,
          status: true,
          role: { select: { id: true, name: true } },
          office: { select: { id: true, name: true } },
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return Response.json(pageResult(data, total, p.page, p.pageSize));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    
    // Strict Super Admin check
    const roleKey = toAppRole(session.user.role?.name);
    if (roleKey !== "SUPER_ADMIN") {
      throw new AppError("FORBIDDEN", "Only Super Administrators can create Call Center Officer accounts.", 403);
    }

    const input = createSchema.parse(await request.json());

    // Target role is always Call Center Officer
    let targetRole = await prisma.role.findFirst({ where: { name: "Call Center" } });
    if (!targetRole) {
      targetRole = await prisma.role.create({
        data: { name: "Call Center", description: "Call Center Officer Operational Role" },
      });
    }

    const duplicate = await prisma.user.findFirst({
      where: {
        OR: [
          { email: input.email },
          { username: input.username },
          ...(input.employeeId ? [{ employeeId: input.employeeId }] : []),
        ],
      },
    });

    if (duplicate) {
      throw new AppError("DUPLICATE_USER", "A user with this Email, Username, or Employee ID already exists.", 409);
    }

    const { password, ...data } = input;
    const passwordHash = await hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          username: data.username,
          phone: data.phone || null,
          employeeId: data.employeeId || null,
          officeId: data.officeId || null,
          roleId: targetRole!.id,
          passwordHash,
          status: "ACTIVE",
        },
        include: {
          role: true,
          office: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          role: session.user.role.name,
          module: "Administration",
          recordId: created.id,
          action: "CREATE_CALL_CENTER_USER",
          newValue: { name: created.name, email: created.email, role: "Call Center" },
          correlationId: crypto.randomUUID(),
        },
      });

      return created;
    });

    return Response.json(
      {
        ok: true,
        message: `Call Center Officer account for "${user.name}" created successfully.`,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          status: user.status,
          role: user.role.name,
          office: user.office?.name ?? "Dhaka Head Office",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    
    const roleKey = toAppRole(session.user.role?.name);
    if (roleKey !== "SUPER_ADMIN") {
      throw new AppError("FORBIDDEN", "Only Super Administrators can update user accounts.", 403);
    }

    const input = updateSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { id: input.userId }, include: { role: true } });
    if (!existing) throw new AppError("USER_NOT_FOUND", "User does not exist.", 404);

    if (existing.id === session.userId && input.status && input.status !== "ACTIVE") {
      throw new AppError("SELF_LOCKOUT", "You cannot disable or lock your own signed-in account.", 409);
    }

    const updateData: Record<string, unknown> = {};
    if (input.status) updateData.status = input.status;
    if (input.officeId !== undefined) updateData.officeId = input.officeId;
    if (input.password) updateData.passwordHash = await hash(input.password, 12);

    const user = await prisma.user.update({
      where: { id: input.userId },
      data: updateData,
      include: { role: true, office: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        role: session.user.role.name,
        module: "Administration",
        recordId: user.id,
        action: "UPDATE_USER_ACCESS",
        newValue: input,
        correlationId: crypto.randomUUID(),
      },
    });

    return Response.json({
      ok: true,
      message: `User ${user.name} updated successfully.`,
      data: { id: user.id, status: user.status, roleId: user.roleId, office: user.office?.name },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    
    const roleKey = toAppRole(session.user.role?.name);
    if (roleKey !== "SUPER_ADMIN") {
      throw new AppError("FORBIDDEN", "Only Super Administrators can delete user accounts.", 403);
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    if (!userId) throw new AppError("VALIDATION_ERROR", "userId is required.", 400);

    const existing = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!existing) throw new AppError("USER_NOT_FOUND", "User does not exist.", 404);

    if (existing.id === session.userId) {
      throw new AppError("SELF_DELETE", "You cannot delete your own signed-in account.", 409);
    }

    if (toAppRole(existing.role.name) === "SUPER_ADMIN") {
      throw new AppError("PROTECTED_ACCOUNT", "Super Administrator accounts cannot be deleted.", 403);
    }

    await prisma.user.delete({ where: { id: userId } });

    return Response.json({
      ok: true,
      message: `Call Center Officer account "${existing.name}" deleted successfully.`,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
