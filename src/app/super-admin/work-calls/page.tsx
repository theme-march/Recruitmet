import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/role-guard";
import { SuperAdminLeadsView } from "@/components/super-admin-leads-view";

export default async function SuperAdminWorkCallsPage() {
  await connection();
  await requireRole("SUPER_ADMIN");

  const [calls, officers] = await Promise.all([
    prisma.workCall.findMany({
      take: 50,
      orderBy: { updatedAt: "desc" },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        candidate: { select: { passportNo: true } },
      },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <SuperAdminLeadsView
      initialCalls={calls.map((c) => ({
        id: c.id,
        leadNo: c.leadNo,
        fullName: c.fullName,
        phone: c.phone,
        country: c.country ?? "—",
        workCategory: c.workCategory ?? "—",
        company: c.company ?? "—",
        priority: c.priority,
        status: c.status,
        assignedToId: c.assignedToId,
        assignedToName: c.assignedTo?.name ?? "Unassigned",
        followUpAt: c.followUpAt ? c.followUpAt.toLocaleDateString() : null,
        createdAt: c.createdAt.toLocaleDateString(),
      }))}
      officers={officers}
    />
  );
}

