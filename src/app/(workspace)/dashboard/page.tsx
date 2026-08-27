import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Dashboard, type DashboardData } from "@/components/dashboard";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export default async function Page() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [totalLeads, dueToday, overdue, scheduledInterviews, converted, recentCalls] = await Promise.all([
    prisma.workCall.count(),
    prisma.workCall.count({
      where: {
        followUpAt: { gte: startOfToday, lte: endOfToday },
        status: { notIn: ["Converted", "Closed", "Not Interested"] },
      },
    }),
    prisma.workCall.count({
      where: {
        followUpAt: { lt: startOfToday },
        status: { notIn: ["Converted", "Closed", "Not Interested"] },
      },
    }),
    prisma.interviewSchedule.count({
      where: { scheduledAt: { gte: startOfToday } },
    }),
    prisma.workCall.count({
      where: { status: "Converted" },
    }),
    prisma.workCall.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        leadNo: true,
        fullName: true,
        phone: true,
        country: true,
        workCategory: true,
        priority: true,
        status: true,
        followUpAt: true,
        createdAt: true,
      },
    }),
  ]);

  const data: DashboardData = {
    userName: session.user.name,
    officeName: session.user.office?.name ?? "Head Office",
    metrics: {
      totalLeads,
      dueToday,
      overdue,
      scheduledInterviews,
      converted,
    },
    recentCalls: recentCalls.map((c) => ({
      id: c.id,
      leadNo: c.leadNo,
      fullName: c.fullName,
      phone: c.phone,
      country: c.country ?? "—",
      workCategory: c.workCategory ?? "—",
      priority: c.priority,
      status: c.status,
      followUpAt: c.followUpAt ? c.followUpAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    })),
  };

  return <Dashboard data={data} />;
}


