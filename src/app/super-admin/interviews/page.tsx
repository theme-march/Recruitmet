import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/role-guard";
import { SuperAdminInterviewView } from "@/components/super-admin-interview-view";

export default async function SuperAdminInterviewsPage() {
  await connection();
  await requireRole("SUPER_ADMIN");

  const schedules = await prisma.interviewSchedule.findMany({
    orderBy: { scheduledAt: "desc" },
    include: {
      _count: { select: { interviews: true } },
    },
  });

  return (
    <SuperAdminInterviewView
      initialSchedules={schedules.map((s) => ({
        id: s.id,
        title: s.title,
        company: s.company,
        profession: s.profession,
        scheduledAt: s.scheduledAt.toLocaleDateString(),
        venue: s.venue,
        interviewer: s.interviewer,
        capacity: s.capacity,
        registeredCount: s._count.interviews,
        status: s.status,
      }))}
    />
  );
}

