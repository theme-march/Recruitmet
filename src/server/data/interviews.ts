import "server-only";
import { prisma } from "@/lib/prisma";
import { pageResult } from "@/lib/pagination";

export type InterviewQueryOptions = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function getInterviewsData(options: InterviewQueryOptions = {}) {
  const q = (options.q || "").trim();
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(options.pageSize) || 20));
  const skip = (page - 1) * pageSize;

  const where = q
    ? { OR: [{ title: { contains: q } }, { company: { contains: q } }] }
    : {};

  const [data, total] = await Promise.all([
    prisma.interviewSchedule.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { scheduledAt: "asc" },
      include: { _count: { select: { interviews: true } } },
    }),
    prisma.interviewSchedule.count({ where }),
  ]);

  const serialized = data.map((item) => ({
    ...item,
    scheduledAt: item.scheduledAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));

  return pageResult(serialized, total, page, pageSize);
}
