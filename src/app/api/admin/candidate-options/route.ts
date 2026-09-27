import { withApiAccess } from "@/lib/api-access";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const entitySchema = z.enum(["category", "profession", "company", "status"]);
const codeSchema = z.string().trim().min(2).max(100).regex(/^[A-Za-z0-9_-]+$/);
const createSchema = z.object({
  entity: entitySchema,
  code: codeSchema,
  name: z.string().trim().min(2).max(250),
  categoryId: z.string().min(1).optional(),
  country: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  active: z.boolean().default(true),
});
const updateSchema = createSchema.partial().extend({
  entity: entitySchema,
  id: z.string().min(1),
});

const normalizedCode = (value: string) => value.trim().toUpperCase().replaceAll("-", "_");

async function writeAudit(
  tx: Prisma.TransactionClient,
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  recordId: string,
  action: string,
  value: Prisma.InputJsonValue,
) {
  await tx.auditLog.create({
    data: {
      userId: session.userId,
      role: session.user.role.name,
      module: "Candidate Form Options",
      recordId,
      action,
      newValue: value,
      correlationId: crypto.randomUUID(),
    },
  });
}

async function POSTHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const input = createSchema.parse(await request.json());
    const code = normalizedCode(input.code);
    const row = await prisma.$transaction(async (tx) => {
      let created: Record<string, unknown>;

      if (input.entity === "category") {
        created = await tx.professionCategory.create({
          data: {
            code,
            name: input.name,
            description: input.description,
            sortOrder: input.sortOrder,
            active: input.active,
          },
        });
      } else if (input.entity === "profession") {
        if (!input.categoryId) {
          throw new AppError("CATEGORY_REQUIRED", "Select a work category.", 422);
        }
        created = await tx.profession.create({
          data: {
            code,
            name: input.name,
            categoryId: input.categoryId,
            description: input.description,
            active: input.active,
          },
        });
      } else if (input.entity === "company") {
        if (!input.country) {
          throw new AppError("COUNTRY_REQUIRED", "Enter the company's country.", 422);
        }
        created = await tx.company.create({
          data: {
            code,
            name: input.name,
            country: input.country,
            status: input.active ? "Active" : "Inactive",
          },
        });
      } else {
        created = await tx.masterData.create({
          data: {
            type: "DIRECT_FILE_STATUS",
            code,
            name: input.name,
            description: input.description,
            sortOrder: input.sortOrder,
            active: input.active,
          },
        });
      }
      await writeAudit(tx, session, String(created.id), `CREATE_${input.entity.toUpperCase()}`, {
        entity: input.entity,
        code,
        name: input.name,
      });
      return created;
    });
    return Response.json({ data: { entity: input.entity, row } }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

async function PATCHHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const input = updateSchema.parse(await request.json());
    const code = input.code ? normalizedCode(input.code) : undefined;
    const row = await prisma.$transaction(async (tx) => {
      let updated: Record<string, unknown>;

      if (input.entity === "category") {
        updated = await tx.professionCategory.update({
        where: { id: input.id },
        data: {
          code,
          name: input.name,
          description: input.description,
          sortOrder: input.sortOrder,
          active: input.active,
        },
      });
      } else if (input.entity === "profession") {
        updated = await tx.profession.update({
        where: { id: input.id },
        data: {
          code,
          name: input.name,
          categoryId: input.categoryId,
          description: input.description,
          active: input.active,
        },
      });
      } else if (input.entity === "company") {
        updated = await tx.company.update({
        where: { id: input.id },
        data: {
          code,
          name: input.name,
          country: input.country,
          status: input.active === undefined ? undefined : input.active ? "Active" : "Inactive",
        },
      });
      } else {
        const existing = await tx.masterData.findFirst({
          where: { id: input.id, type: "DIRECT_FILE_STATUS" },
          select: { id: true },
        });
        if (!existing) throw new AppError("NOT_FOUND", "Direct file status not found.", 404);
        updated = await tx.masterData.update({
          where: { id: input.id },
          data: {
            code,
            name: input.name,
            description: input.description,
            sortOrder: input.sortOrder,
            active: input.active,
          },
        });
      }
      await writeAudit(tx, session, input.id, `UPDATE_${input.entity.toUpperCase()}`, {
        entity: input.entity,
        code,
        name: input.name,
        active: input.active,
      });
      return updated;
    });
    return Response.json({ data: { entity: input.entity, row } });
  } catch (error) {
    return errorResponse(error);
  }
}

export const POST = withApiAccess("admin/candidate-options", POSTHandler);
export const PATCH = withApiAccess("admin/candidate-options", PATCHHandler);
