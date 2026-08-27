import { can, officeScope } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { workflowCountryWhere, workflowModule } from "@/lib/workflow-country";

type MedicalMetadata = {
  responsibleParty?: string;
  contactDoneBy?: string;
  fitCardStatus?: string;
  officeStatus?: string;
  contactMedical?: boolean;
  medicalSlip?: boolean;
  pictureCollected?: boolean;
  tenFingerDone?: boolean;
  termsDone?: boolean;
  remarks?: string;
};

const metadataOf = (value: unknown): MedicalMetadata => value && typeof value === "object" ? value as MedicalMetadata : {};
const dateOnly = (value: string | null) => value ? new Date(`${value}T00:00:00`) : null;
const endOfDay = (value: string | null) => value ? new Date(`${value}T23:59:59.999`) : null;
const boolMatch = (filter: string, value: boolean) => !filter || value === (filter === "Yes");

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
if (!(await can(session, workflowModule(request), "View"))) throw new AppError("FORBIDDEN", "View permission is required.", 403);

    const url = new URL(request.url); const param = (key: string) => (url.searchParams.get(key) ?? "").trim();
    const passport = param("passport").toLowerCase(); const name = param("name").toLowerCase(); const phone = param("phone").toLowerCase();
    const officer = param("officer"); const status = param("status"); const reportStatus = param("reportStatus"); const office = param("office");
    const updatedFrom = dateOnly(param("updatedFrom") || null); const updatedTo = endOfDay(param("updatedTo") || null); const medicalDate = param("medicalDate");
    const reMedical = param("reMedical"); const contactMedical = param("contactMedical"); const contactDoneBy = param("contactDoneBy");
    const tenFingerDone = param("tenFingerDone"); const termsDone = param("termsDone"); const pictureCollected = param("pictureCollected"); const medicalSlip = param("medicalSlip");
    const page = Math.max(1, Number(param("page")) || 1); const pageSize = Math.min(100, Math.max(10, Number(param("pageSize")) || 20));

    const files = await prisma.processingFile.findMany({
where: { ...officeScope(session), country: workflowCountryWhere(request), medical: { some: {} } },
      orderBy: { updatedAt: "desc" }, take: 5000,
      include: { candidate: true, passport: true, assignedTo: { select: { id: true, name: true } }, office: { select: { id: true, name: true } }, medical: { take: 1, orderBy: { createdAt: "desc" } } },
    });

    const rows = files.flatMap((file) => {
      const medical = file.medical[0]; if (!medical) return [];
      const metadata = metadataOf(medical.metadata);
      return [{
        id: file.id, medicalId: medical.id, fileNo: file.fileNo, candidateNo: file.candidate.candidateNo, name: file.candidate.fullName, phone: file.candidate.phone,
        passportNumber: file.passport?.passportNumber ?? file.candidate.passportNo ?? "Not entered", officerId: file.assignedTo?.id ?? "", officerName: file.assignedTo?.name ?? "Unassigned",
        officeId: file.office?.id ?? "", office: file.office?.name ?? "SELF", company: file.company ?? "N/A", profession: file.profession ?? file.candidate.profession ?? "Uncategorized",
        status: medical.result, reportStatus: metadata.fitCardStatus || medical.result, medicalDate: medical.testDate?.toISOString() ?? medical.appointmentDate?.toISOString() ?? null,
        expiryDate: medical.expiryDate?.toISOString() ?? null, isReMedical: medical.isReMedical, contactMedical: Boolean(metadata.contactMedical), contact: metadata.responsibleParty || (metadata.contactMedical ? "OFFICE" : "N/A"),
        contactDoneBy: metadata.contactDoneBy || metadata.responsibleParty || "", tenFingerDone: Boolean(metadata.tenFingerDone), termsDone: Boolean(metadata.termsDone), pictureCollected: Boolean(metadata.pictureCollected), medicalSlip: Boolean(metadata.medicalSlip),
        remark: metadata.remarks || "N/A", updatedAt: medical.updatedAt.toISOString(),
      }];
    });

    const filtered = rows.filter((row) =>
      (!passport || row.passportNumber.toLowerCase().includes(passport)) && (!name || row.name.toLowerCase().includes(name)) && (!phone || row.phone.toLowerCase().includes(phone)) &&
      (!officer || row.officerId === officer) && (!status || row.status === status) && (!reportStatus || row.reportStatus === reportStatus) && (!office || row.officeId === office) &&
      (!updatedFrom || new Date(row.updatedAt) >= updatedFrom) && (!updatedTo || new Date(row.updatedAt) <= updatedTo) && (!medicalDate || row.medicalDate?.slice(0, 10) === medicalDate) &&
      boolMatch(reMedical, row.isReMedical) && boolMatch(contactMedical, row.contactMedical) && (!contactDoneBy || row.contactDoneBy === contactDoneBy) && boolMatch(tenFingerDone, row.tenFingerDone) &&
      boolMatch(termsDone, row.termsDone) && boolMatch(pictureCollected, row.pictureCollected) && boolMatch(medicalSlip, row.medicalSlip)
    );
    const [users, offices] = await Promise.all([
      prisma.user.findMany({ where: { ...officeScope(session), status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.office.findMany({ where: { status: "ACTIVE", ...(session.user.officeId ? { id: session.user.officeId } : {}) }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);
    const start = (page - 1) * pageSize;
    return Response.json({ data: filtered.slice(start, start + pageSize), filters: { users, offices, statuses: [...new Set(rows.map((row) => row.status))].sort(), reportStatuses: [...new Set(rows.map((row) => row.reportStatus))].sort() }, meta: { page, pageSize, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)) } });
  } catch (error) { return errorResponse(error); }
}
