import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.workCall.findMany({
    include: { candidate: true, assignedTo: true },
    orderBy: { createdAt: "desc" },
  });
  const csv = [
    ["Lead No", "Full Name", "Phone", "Country", "Work Category", "Priority", "Status", "Follow Up At", "Assigned Officer"],
    ...rows.map((row) => [
      row.leadNo,
      row.fullName,
      row.phone,
      row.country ?? "",
      row.workCategory ?? "",
      `P${row.priority}`,
      row.status,
      row.followUpAt ? row.followUpAt.toISOString() : "",
      row.assignedTo?.name ?? "Unassigned",
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=call-center-leads.csv",
    },
  });
}

