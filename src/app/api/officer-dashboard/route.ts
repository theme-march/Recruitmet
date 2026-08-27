import { can } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const object = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const dateValue = (value: unknown) => { const date = typeof value === "string" && value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date : null; };

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "call-center", "View"))) throw new AppError("FORBIDDEN", "View permission is required.", 403);
    const now = new Date(); const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0); const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999); const weekEnd = new Date(now.getTime() + 7 * 86_400_000); const threeDays = new Date(now.getTime() + 3 * 86_400_000);
    const leads = await prisma.workCall.findMany({
      where: session.userId ? { OR: [{ assignedToId: session.userId }, { assignedToId: null }] } : {},
      include: { assignedTo: true, candidate: true, followUps: { orderBy: { dueAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take: 2000,
    });

    const candidateIds = [...new Set(leads.flatMap((lead) => lead.candidateId ? [lead.candidateId] : []))];
    const documentsPending = candidateIds.length ? await prisma.document.count({ where: { candidateId: { in: candidateIds }, status: { in: ["PENDING", "UPLOADED"] } } }) : 0;
    const enriched = leads.map((lead) => {
      const notes = object(lead.notes); const identity = object(notes.identity); const interview = object(notes.interview); const work = object(notes.work); const passportNo = lead.candidate?.passportNo || String(identity.passportNo ?? ""); const interviewDate = dateValue(interview.date); const due = lead.followUps.find((item) => item.status === "Pending")?.dueAt ?? lead.followUpAt;
      const overdue = Boolean(due && due < now); const passportMissing = !passportNo; const interviewSoon = Boolean(interviewDate && interviewDate >= now && interviewDate <= weekEnd);
      const priorityPercent = Math.min(100, Math.max(20, (6 - lead.priority) * 20)); const score = Math.min(100, (6 - lead.priority) * 12 + (overdue ? 25 : 0) + (passportMissing ? 20 : 0) + (interviewSoon ? 15 : 0));
      return { id: lead.id, leadNo: lead.leadNo, name: lead.fullName, phone: lead.phone, passport: passportNo || "MISSING", status: lead.status, priority: lead.priority, priorityPercent, score, category: (lead.workCategory || "Uncategorized").toUpperCase(), company: lead.company ?? String(work.company ?? "—"), followUpAt: due?.toISOString() ?? null, followUpCount: lead.followUps.filter((item) => item.status === "Completed").length, overdue, passportMissing, interviewDate: interviewDate?.toISOString() ?? null, interviewSoon };
    });
    const open = enriched.filter((lead) => !/closed|converted/i.test(lead.status)); const dueToday = enriched.filter((lead) => lead.followUpAt && new Date(lead.followUpAt) >= todayStart && new Date(lead.followUpAt) <= todayEnd); const overdue = enriched.filter((lead) => lead.overdue); const passportMissing = enriched.filter((lead) => lead.passportMissing); const interviews = enriched.filter((lead) => lead.interviewDate && new Date(lead.interviewDate) <= weekEnd && new Date(lead.interviewDate) >= now); const interviewThreeDays = interviews.filter((lead) => new Date(lead.interviewDate!) <= threeDays);
    const categoryMap = new Map<string, typeof enriched>(); for (const lead of open) categoryMap.set(lead.category, [...(categoryMap.get(lead.category) ?? []), lead]);
    const categories = [...categoryMap.entries()].map(([category, rows]) => ({ category, total: rows.length, callNow: rows.filter((row) => row.followUpAt && new Date(row.followUpAt) <= todayEnd).length })).sort((a, b) => b.total - a.total);
    return Response.json({
      data: {
        officer: session.user.name,
        alerts: { overdue: overdue.length, passportMissing: passportMissing.length, interviewThreeDays: interviewThreeDays.length, noFollowUp: open.filter((lead) => !lead.followUpAt).length },
        metrics: { open: open.length, dueToday: dueToday.length, overdue: overdue.length, passportMissing: passportMissing.length, interviews: interviews.length, documentsPending, converted: enriched.filter((lead) => /converted/i.test(lead.status)).length, closed: enriched.filter((lead) => /closed/i.test(lead.status)).length },
        categories,
        priorityLeads: [...open].sort((a, b) => b.score - a.score || a.priority - b.priority).slice(0, 20),
        dueToday,
      },
    });
  } catch (error) { return errorResponse(error); }
}
