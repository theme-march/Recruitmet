import { z } from "zod";
import { revalidatePath } from "next/cache";
import { can } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { pageResult, parsePagination } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { toAppRole } from "@/lib/roles";
import { createInterviewSchedule } from "@/features/interviews/service";

const schema = z.object({
  title: z.string().min(2).max(150),
  company: z.string().max(150).optional(),
  profession: z.string().max(150).optional(),
  scheduledAt: z.coerce.date(),
  venue: z.string().max(250).optional(),
  meetingUrl: z.url().optional(),
  interviewer: z.string().max(150).optional(),
  capacity: z.coerce.number().int().min(1).max(1000).default(50),
  instructions: z.string().max(2000).optional(),
  candidateIds: z.array(z.string()).optional().default([]),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "interviews", "View"))) {
      throw new AppError("FORBIDDEN", "View permission is required.", 403);
    }
    const p = parsePagination(request.url);
    const where = p.q
      ? { OR: [{ title: { contains: p.q } }, { company: { contains: p.q } }] }
      : {};
    const [data, total] = await Promise.all([
      prisma.interviewSchedule.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: { scheduledAt: "asc" },
        include: { _count: { select: { interviews: true } } },
      }),
      prisma.interviewSchedule.count({ where }),
    ]);

    if (total === 0 && !p.q) {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const inThreeWeeks = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

      await prisma.interviewSchedule.createMany({
        data: [
          {
            title: "Saudi Binladen Group - Electrician & Plumber Drive",
            company: "Saudi Binladen Group",
            profession: "Electrician / Plumber",
            scheduledAt: nextWeek,
            venue: "Dhaka Head Office (Auditorium)",
            interviewer: "Engr. Tariq Al-Mansoor",
            capacity: 60,
            instructions: "Bring 8 passport size photos, original passport, and trade certificate.",
            status: "Published",
          },
          {
            title: "Nesma & Partners - General Construction Worker",
            company: "Nesma Construction",
            profession: "General Worker / Steel Fixer",
            scheduledAt: inTwoWeeks,
            venue: "Dhaka Head Office (Floor 3)",
            interviewer: "Hassan Al-Zahrani",
            capacity: 80,
            instructions: "Basic fitness test and practical skills screening.",
            status: "Published",
          },
          {
            title: "Almarai Food Industries - Driver & Packing Staff",
            company: "Almarai Company",
            profession: "Light / Heavy Driver & Packing",
            scheduledAt: inThreeWeeks,
            venue: "Chittagong Training Center",
            interviewer: "Mohammad Faruk",
            capacity: 40,
            instructions: "Valid driving license required for driver candidates.",
            status: "Published",
          },
        ],
      });

      const seeded = await prisma.interviewSchedule.findMany({
        orderBy: { scheduledAt: "asc" },
        include: { _count: { select: { interviews: true } } },
      });
      return Response.json(pageResult(seeded, seeded.length, 1, p.pageSize));
    }

    return Response.json(pageResult(data, total, p.page, p.pageSize));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "registration", "Add"))) {
      throw new AppError("FORBIDDEN", "Permission required to create interview drives. Please contact a Super Administrator.", 403);
    }
    const schedule = await createInterviewSchedule(schema.parse(await request.json()), session);
    revalidatePath("/interviews");
    revalidatePath("/dashboard");
    return Response.json({ data: schedule }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
