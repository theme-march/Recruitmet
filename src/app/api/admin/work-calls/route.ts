import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppError, errorResponse } from "@/lib/errors";
import { parsePagination, pageResult } from "@/lib/pagination";
import { z } from "zod";

const updateLeadSchema = z.object({
  id: z.string().min(5),
  assignedToId: z.string().nullable().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  status: z.string().optional(),
  notesText: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const url = new URL(request.url);
    const p = parsePagination(request.url);
    const status = url.searchParams.get("status") || undefined;
    const officerId = url.searchParams.get("officerId") || undefined;

    const where = {
      ...(p.q ? { OR: [{ fullName: { contains: p.q } }, { phone: { contains: p.q } }, { leadNo: { contains: p.q } }] } : {}),
      ...(status ? { status } : {}),
      ...(officerId ? { assignedToId: officerId } : {}),
    };

    const [calls, total] = await Promise.all([
      prisma.workCall.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: { updatedAt: "desc" },
        include: { assignedTo: { select: { id: true, name: true, email: true } } },
      }),
      prisma.workCall.count({ where }),
    ]);

    return Response.json(pageResult(calls, total, p.page, p.pageSize));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const input = updateLeadSchema.parse(await request.json());
    const existing = await prisma.workCall.findUnique({ where: { id: input.id } });
    if (!existing) throw new AppError("NOT_FOUND", "Work call lead not found.", 404);

    let updatedNotes = existing.notes;
    if (input.notesText) {
      const arr = Array.isArray(existing.notes) ? existing.notes : [];
      updatedNotes = [...arr, { by: session.user.name, text: input.notesText, at: new Date().toISOString() }];
    }

    const updated = await prisma.workCall.update({
      where: { id: input.id },
      data: {
        ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.notesText ? { notes: updatedNotes as any } : {}),
      },
      include: { assignedTo: { select: { name: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        role: session.user.role.name,
        module: "SuperAdmin_Leads",
        recordId: updated.id,
        action: "UPDATE_LEAD",
        newValue: input,
        correlationId: crypto.randomUUID(),
      },
    });

    return Response.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

