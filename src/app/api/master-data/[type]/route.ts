import { z } from "zod";
import { can } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const schema = z.object({ code: z.string().min(1).max(100), name: z.string().min(1).max(250), description: z.string().max(1000).optional(), country: z.string().max(100).optional(), parentId: z.string().min(10).optional(), color: z.string().max(30).optional(), sortOrder: z.number().int().default(0), active: z.boolean().default(true) });

export async function GET(_: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "master-data", "View"))) throw new AppError("FORBIDDEN", "View permission is required.", 403);
    const { type } = await params;
    return Response.json({ data: await prisma.masterData.findMany({ where: { type }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }) });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "master-data", "Add"))) throw new AppError("FORBIDDEN", "Add permission is required.", 403);
    const { type } = await params;
    const input = schema.parse(await request.json());
    const row = await prisma.masterData.create({ data: { type, ...input } });
    await prisma.auditLog.create({ data: { userId: session.userId, role: session.user.role.name, module: "Master Data", recordId: row.id, action: "CREATE", newValue: input, correlationId: crypto.randomUUID() } });
    return Response.json({ data: row }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
