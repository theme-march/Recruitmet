import { z } from "zod";
import { can } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const schema = z.object({ categoryCode: z.string().min(2), title: z.string().min(2), description: z.string().max(2000).optional(), type: z.string().min(2), resourceUrl: z.url(), audience: z.string().optional(), language: z.string().default("Bangla"), durationMin: z.coerce.number().int().positive().optional() });

export async function GET(request: Request) {
  try {
    const session = await getSession(); if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401); if (!(await can(session, "tutorials", "View"))) throw new AppError("FORBIDDEN", "Tutorial view permission is required.", 403);
    const url = new URL(request.url), view = url.searchParams.get("view") === "categories" ? "categories" : "tutorials", q = (url.searchParams.get("q") ?? "").trim(), categoryId = url.searchParams.get("categoryId") ?? "", page = Math.max(1, Number(url.searchParams.get("page")) || 1), pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize")) || 25)), skip = (page - 1) * pageSize;
    if (view === "categories") {
      const where = { active: true, ...(q ? { name: { contains: q } } : {}) }; const [rows, total] = await Promise.all([prisma.tutorialCategory.findMany({ where, skip, take: pageSize, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { tutorials: true } } } }), prisma.tutorialCategory.count({ where })]);
      return Response.json({ data: rows.map((row) => ({ id: row.id, code: row.code, name: row.name, tutorials: row._count.tutorials, order: row.sortOrder })), meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
    }
    const where = { status: "Published", ...(categoryId ? { categoryId } : {}), ...(q ? { OR: [{ title: { contains: q } }, { category: { name: { contains: q } } }, { description: { contains: q } }] } : {}) }; const [rows, total, categories] = await Promise.all([prisma.tutorial.findMany({ where, skip, take: pageSize, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], include: { category: true } }), prisma.tutorial.count({ where }), prisma.tutorialCategory.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })]);
    return Response.json({ data: rows.map((row) => ({ id: row.id, category: row.category.name, title: row.title, linkType: row.type, resourceUrl: row.resourceUrl, order: row.sortOrder, language: row.language, audience: row.audience, durationMin: row.durationMin })), filters: { categories }, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "tutorials", "Add"))) throw new AppError("FORBIDDEN", "Tutorial creation permission is required.", 403);
    const input = schema.parse(await request.json());
    const category = await prisma.tutorialCategory.findUnique({ where: { code: input.categoryCode } });
    if (!category) throw new AppError("CATEGORY_NOT_FOUND", "Enter an existing tutorial category code.", 422);
    const { categoryCode: _, ...data } = input;
    const tutorial = await prisma.tutorial.create({ data: { ...data, categoryId: category.id, status: "Published", publishedAt: new Date() } });
    await prisma.auditLog.create({ data: { userId: session.userId, role: session.user.role.name, module: "Tutorials", recordId: tutorial.id, action: "CREATE", newValue: { title: tutorial.title, type: tutorial.type }, correlationId: crypto.randomUUID() } });
    return Response.json({ data: tutorial }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
