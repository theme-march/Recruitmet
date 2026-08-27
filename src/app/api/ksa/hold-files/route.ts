import { can, officeScope } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { workflowCountryWhere, workflowModule } from "@/lib/workflow-country";

const dayStart = (value: string) => value ? new Date(`${value}T00:00:00`) : null;
const dayEnd = (value: string) => value ? new Date(`${value}T23:59:59.999`) : null;

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
if (!(await can(session, workflowModule(request), "View"))) throw new AppError("FORBIDDEN", "View permission is required.", 403);

    const url = new URL(request.url);
    const param = (key: string) => (url.searchParams.get(key) ?? "").trim();
    const page = Math.max(1, Number(param("page")) || 1);
    const pageSize = Math.min(100, Math.max(10, Number(param("pageSize")) || 20));
    const files = await prisma.processingFile.findMany({
      where: {
        ...officeScope(session),
        country: workflowCountryWhere(request),
        OR: [
          { status: "HOLD" },
          { holds: { some: { type: { in: ["Hold", "HOLD", "hold"] } } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 5000,
      include: {
        candidate: true,
        passport: true,
        assignedTo: { select: { id: true, name: true } },
        holds: { where: { type: { in: ["Hold", "HOLD", "hold"] } }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    const rows = files.map((file) => {
      const hold = file.holds[0];
      return {
        id: file.id,
        holdId: hold.id,
        fileNo: file.fileNo,
        candidateNo: file.candidate.candidateNo,
        name: file.candidate.fullName,
        phone: file.candidate.phone,
        passport: file.passport?.passportNumber ?? file.candidate.passportNo ?? "Not entered",
        officerId: file.assignedTo?.id ?? "",
        officer: file.assignedTo?.name ?? "Unassigned",
        profession: file.profession ?? file.candidate.profession ?? "N/A",
        company: file.company ?? "N/A",
        previousStatus: hold.previousStage ?? "N/A",
        reason: hold.reason,
        holdAt: hold.actionDate.toISOString(),
        expectedRelease: hold.expectedRelease?.toISOString() ?? null,
        owner: hold.owner ?? file.assignedTo?.name ?? "Unassigned",
        status: hold.status,
      };
    });
    const from = dayStart(param("holdFrom"));
    const to = dayEnd(param("holdTo"));
    const filtered = rows.filter((row) =>
      (!param("passport") || row.passport.toLowerCase().includes(param("passport").toLowerCase())) &&
      (!param("officer") || row.officerId === param("officer")) &&
      (!param("previousStatus") || row.previousStatus === param("previousStatus")) &&
      (!param("profession") || row.profession === param("profession")) &&
      (!param("company") || row.company === param("company")) &&
      (!from || new Date(row.holdAt) >= from) && (!to || new Date(row.holdAt) <= to)
    );
    const users = await prisma.user.findMany({ where: { ...officeScope(session), status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } });
    const values = (key: "previousStatus" | "profession" | "company") => [...new Set(rows.map((row) => row[key]).filter((value) => value && value !== "N/A"))].sort();
    const offset = (page - 1) * pageSize;
    return Response.json({
      data: filtered.slice(offset, offset + pageSize),
      filters: { users, previousStatuses: values("previousStatus"), professions: values("profession"), companies: values("company") },
      meta: { page, pageSize, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
