import { can, officeScope } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { workflowCountryWhere, workflowModule } from "@/lib/workflow-country";

const start = (value: string) => value ? new Date(`${value}T00:00:00`) : null; const end = (value: string) => value ? new Date(`${value}T23:59:59.999`) : null;

export async function GET(request: Request) {
  try {
const session = await getSession(); if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401); if (!(await can(session, workflowModule(request), "View"))) throw new AppError("FORBIDDEN", "View permission is required.", 403); const url = new URL(request.url); const p = (key: string) => (url.searchParams.get(key) ?? "").trim(); const page = Math.max(1, Number(p("page")) || 1); const pageSize = Math.min(100, Math.max(10, Number(p("pageSize")) || 20));
const files = await prisma.processingFile.findMany({
  where: {
    ...officeScope(session),
    country: workflowCountryWhere(request),
    OR: [
      { currentStage: "Return File" },
      { status: "RETURNED" },
      { holds: { some: { type: { in: ["Return", "RETURN", "return"] } } } },
    ],
  },
  orderBy: { updatedAt: "desc" },
  take: 5000,
  include: {
    candidate: true,
    passport: true,
    assignedTo: { select: { id: true, name: true } },
    office: { select: { name: true } },
    holds: { where: { type: { in: ["Return", "RETURN", "return"] } }, take: 1, orderBy: { createdAt: "desc" } },
    payments: { include: { refunds: true } },
  },
});
    const rows = files.map((file) => { const returned = file.holds[0]; const paidAmount = file.payments.filter((payment) => payment.status === "PAID").reduce((sum, payment) => sum + Number(payment.amount), 0); const refunded = file.payments.flatMap((payment) => payment.refunds).reduce((sum, refund) => sum + Number(refund.amount), 0); const due = file.payments.filter((payment) => payment.status !== "PAID" && !["REFUNDED", "REVERSED"].includes(String(payment.status))).reduce((sum, payment) => sum + Number(payment.amount), 0); return { id: file.id, returnId: returned?.id ?? file.id, fileNo: file.fileNo, candidateNo: file.candidate.candidateNo, name: file.candidate.fullName, phone: file.candidate.phone, passportNumber: file.passport?.passportNumber ?? file.candidate.passportNo ?? "Not entered", officerId: file.assignedTo?.id ?? "", officer: file.assignedTo?.name ?? "Unassigned", office: file.office?.name ?? "SELF", profession: file.profession ?? file.candidate.profession ?? "N/A", company: file.company ?? "N/A", paidAmount, refunded, netAmount: Math.max(0, paidAmount - refunded), due, returnAmount: Number(returned?.financialImpact ?? 0), holdBy: "N/A", returnedBy: returned?.owner ?? "N/A", receivedBy: file.assignedTo?.name ?? returned?.owner ?? "N/A", previousStatus: returned?.previousStage ?? "N/A", returnedAt: (returned?.actionDate ?? file.updatedAt).toISOString(), reason: returned?.reason ?? "N/A", remarks: returned?.note ?? "N/A", attachment: returned?.attachment ?? "N/A", status: returned?.status ?? String(file.status) }; });
    const from = start(p("returnedFrom")), to = end(p("returnedTo")), paidFrom = Number(p("paidFrom")) || 0, paidTo = Number(p("paidTo")) || Infinity; const filtered = rows.filter((r) => (!p("passport") || r.passportNumber.toLowerCase().includes(p("passport").toLowerCase())) && (!p("officer") || r.officerId === p("officer")) && (!p("previousStatus") || r.previousStatus === p("previousStatus")) && (!p("profession") || r.profession === p("profession")) && (!p("company") || r.company === p("company")) && (!from || new Date(r.returnedAt) >= from) && (!to || new Date(r.returnedAt) <= to) && r.paidAmount >= paidFrom && r.paidAmount <= paidTo);
    const users = await prisma.user.findMany({ where: { ...officeScope(session), status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }); const values = (key: "previousStatus" | "profession" | "company") => [...new Set(rows.map((r) => r[key]).filter((x) => x && x !== "N/A"))].sort(); const offset = (page - 1) * pageSize;
    return Response.json({ data: filtered.slice(offset, offset + pageSize), filters: { users, previousStatuses: values("previousStatus"), professions: values("profession"), companies: values("company") }, meta: { page, pageSize, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)) } });
  } catch (error) { return errorResponse(error); }
}
