import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppError, errorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const [totalUsers, activeUsers, totalLeads, newLeads, convertedLeads, totalInterviews, upcomingInterviews, recentLogs, recentCalls] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.workCall.count(),
      prisma.workCall.count({ where: { status: "New" } }),
      prisma.workCall.count({ where: { status: "Converted" } }),
      prisma.interviewSchedule.count(),
      prisma.interviewSchedule.count({ where: { scheduledAt: { gte: new Date() } } }),
      prisma.auditLog.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } }),
      prisma.workCall.findMany({ take: 6, orderBy: { updatedAt: "desc" }, include: { assignedTo: { select: { name: true } } } }),
    ]);

    return Response.json({
      data: {
        metrics: {
          totalUsers,
          activeUsers,
          totalLeads,
          newLeads,
          convertedLeads,
          totalInterviews,
          upcomingInterviews,
        },
        recentLogs: recentLogs.map((log) => ({
          id: log.id,
          action: log.action,
          module: log.module,
          user: log.user?.name ?? "System",
          time: log.createdAt.toISOString(),
        })),
        recentCalls: recentCalls.map((call) => ({
          id: call.id,
          leadNo: call.leadNo,
          name: call.fullName,
          phone: call.phone,
          status: call.status,
          country: call.country ?? "—",
          officer: call.assignedTo?.name ?? "Unassigned",
          priority: call.priority,
          updatedAt: call.updatedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

