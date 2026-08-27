import { can, officeScope } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { uploadDocument } from "@/features/documents/service";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const optional = (form: FormData, key: string) => value(form, key) || undefined;
const required = (form: FormData, key: string) => { const result = value(form, key); if (!result) throw new AppError("FIELD_REQUIRED", `${key} is required.`, 422); return result; };
const date = (form: FormData, key: string) => { const result = optional(form, key); return result ? new Date(result) : undefined; };
const checked = (form: FormData, key: string) => form.get(key) === "true";
const number = (form: FormData, key: string, fallback = 0) => { const result = optional(form, key); return result ? Number(result) : fallback; };
const jsonFields = (form: FormData) => { const result: Record<string, string> = {}; for (const [key, entry] of form.entries()) if (!["attachment", "fileLookup", "module", "stage"].includes(key) && typeof entry === "string") result[key] = entry; return result; };

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const form = await request.formData();
    const moduleId = required(form, "module");
    const stage = required(form, "stage");
    if (!(await can(session, moduleId, "Add"))) throw new AppError("FORBIDDEN", "Add permission is required for this stage.", 403);
    const lookup = required(form, "fileLookup");
    const file = await prisma.processingFile.findFirst({ where: { ...officeScope(session), OR: [{ fileNo: lookup }, { candidate: { passportNo: lookup } }, { candidate: { phone: lookup } }, { candidate: { candidateNo: lookup } }] }, include: { candidate: true } });
    if (!file) throw new AppError("FILE_NOT_FOUND", "No file matches the file number, passport, phone, or candidate ID.", 404);

    const uploaded = form.get("attachment");
    let documentId: string | undefined;
    if (uploaded instanceof File && uploaded.size > 0) {
      const document = await uploadDocument({ fileId: file.id, type: stage, number: optional(form, "passportNumber") ?? optional(form, "visaNumber") ?? optional(form, "applicationNumber"), expiryDate: date(form, "expiryDate"), file: uploaded }, session);
      documentId = document.id;
    }

    let record: { id: string };
    if (["Passport Management", "Passport Entry", "Passport List"].includes(stage)) {
      const passportNumber = required(form, "passportNumber");
      const data = { passportNumber, passportType: optional(form, "passportType") ?? "Ordinary", issueDate: date(form, "issueDate")!, issuePlace: optional(form, "issuePlace"), issuingAuthority: optional(form, "issuingAuthority"), expiryDate: date(form, "expiryDate")!, nationality: optional(form, "nationality"), verificationStatus: optional(form, "verificationStatus") ?? "Pending", remarks: optional(form, "remarks"), documentId, enteredBy: session.userId, ...(optional(form, "verificationStatus") === "Verified" ? { verifiedBy: session.userId, verifiedAt: new Date() } : {}) };
      if (!data.issueDate || !data.expiryDate) throw new AppError("DATE_REQUIRED", "Passport issue and expiry dates are required.", 422);
      const duplicate = await prisma.passportProcess.findFirst({ where: { passportNumber, NOT: { fileId: file.id } } });
      if (duplicate) throw new AppError("DUPLICATE_PASSPORT", "This passport number is already assigned to another file.", 409);
      record = await prisma.$transaction(async (tx) => { const row = await tx.passportProcess.upsert({ where: { fileId: file.id }, update: data, create: { fileId: file.id, ...data } }); await tx.candidate.update({ where: { id: file.candidateId }, data: { passportNo: passportNumber } }); return row; });
    } else if (stage === "Medical") {
      record = await prisma.medicalProcess.create({ data: { fileId: file.id, center: required(form, "center"), appointmentDate: date(form, "appointmentDate"), testDate: date(form, "testDate"), reportDate: date(form, "reportDate"), result: required(form, "result"), expiryDate: date(form, "expiryDate"), isReMedical: checked(form, "isReMedical"), metadata: { responsibleParty: optional(form, "responsibleParty"), fitCardStatus: optional(form, "fitCardStatus"), officeStatus: optional(form, "officeStatus"), contactMedical: checked(form, "contactMedical"), medicalSlip: checked(form, "medicalSlip"), pictureCollected: checked(form, "pictureCollected"), tenFingerDone: checked(form, "tenFingerDone"), termsDone: checked(form, "termsDone"), remarks: optional(form, "remarks"), documentId } } });
    } else if (stage === "MOFA") {
      record = await prisma.mofaProcess.create({ data: { fileId: file.id, mofaNumber: optional(form, "mofaNumber"), submitDate: date(form, "submitDate"), doneDate: date(form, "doneDate"), status: required(form, "status"), isReMofa: checked(form, "isReMofa"), metadata: { medicalFitState: optional(form, "medicalFitState"), medicalSlipState: optional(form, "medicalSlipState"), isReMedical: checked(form, "isReMedical"), remarks: optional(form, "remarks"), documentId } } });
    } else if (stage === "Takamul") {
      record = await prisma.takamulProcess.create({ data: { fileId: file.id, registrationNumber: optional(form, "registrationNumber"), certificateNumber: optional(form, "certificateNumber"), examDate: date(form, "examDate"), presentDate: date(form, "presentDate"), centerDistrict: optional(form, "centerDistrict"), doneBy: optional(form, "doneBy"), visaProfession: optional(form, "visaProfession"), takamulProfession: optional(form, "takamulProfession"), status: required(form, "status"), reportStatus: optional(form, "reportStatus") || "Pending", remarks: optional(form, "remarks") } });
    } else if (stage === "KSA Bio Finger") {
      record = await prisma.biometricProcess.create({ data: { fileId: file.id, type: "KSA Bio Finger", appointmentDate: date(form, "appointmentDate"), presentDate: date(form, "presentDate"), completedAt: date(form, "completedAt"), status: required(form, "status"), evidenceKey: documentId } });
    } else if (stage === "Police Clearance") {
      record = await prisma.policeClearance.create({ data: { fileId: file.id, applicationNumber: optional(form, "applicationNumber"), applicationDate: date(form, "applicationDate"), issueDate: date(form, "issueDate"), expiryDate: date(form, "expiryDate"), result: optional(form, "result"), certificateKey: documentId, status: required(form, "status") } });
    } else if (["First Payment", "Second Payment", "Pending 2nd Payment"].includes(stage)) {
      const amount = number(form, "amount"); if (amount <= 0) throw new AppError("AMOUNT_INVALID", "Amount must be greater than zero.", 422);
      record = await prisma.payment.create({ data: { paymentNo: `PAY-${Date.now().toString().slice(-8)}`, invoiceNo: optional(form, "invoiceNo") ?? `INV-${Date.now().toString().slice(-8)}`, candidateId: file.candidateId, fileId: file.id, type: stage === "Pending 2nd Payment" ? "Second Payment" : stage, amount, currency: optional(form, "currency") ?? "BDT", method: optional(form, "method"), reference: optional(form, "reference"), dueDate: date(form, "dueDate"), collectedAt: date(form, "collectedAt"), collector: optional(form, "collector") ?? session.user.name, status: (optional(form, "status") ?? "PENDING") as never, note: optional(form, "remarks") } });
    } else if (["E-Visa Stamping", "Visa Done"].includes(stage)) {
      record = await prisma.visaProcess.create({ data: { fileId: file.id, visaNumber: optional(form, "visaNumber"), visaType: optional(form, "visaType"), profession: optional(form, "profession"), applicationDate: date(form, "applicationDate"), submissionDate: date(form, "submissionDate"), issueDate: date(form, "issueDate"), stampingDate: date(form, "stampingDate"), expiryDate: date(form, "expiryDate"), status: optional(form, "status") ?? "Pending", visaObjectKey: documentId } });
    } else if (stage === "Manpower") {
      record = await prisma.manpowerProcess.create({ data: { fileId: file.id, reference: optional(form, "reference"), company: optional(form, "company"), profession: optional(form, "profession"), quantity: number(form, "quantity", 1), submittedAt: date(form, "submittedAt"), approvedAt: date(form, "approvedAt"), status: optional(form, "status") ?? "Pending", requirements: { loanNeeded: checked(form, "loanNeeded"), bmetFinger: checked(form, "bmetFinger"), bmetTraining: checked(form, "bmetTraining"), remarks: optional(form, "remarks"), documentId } } });
    } else if (stage === "Flight") {
      record = await prisma.flight.create({ data: { flightNo: required(form, "flightNumber"), airline: required(form, "airline"), pnr: optional(form, "pnr"), departureAt: date(form, "departureAt")!, arrivalAt: date(form, "arrivalAt"), departureAirport: required(form, "departureAirport"), destination: required(form, "destination"), ticketFile: documentId, status: "Scheduled", passengers: { create: { fileId: file.id, ticketNo: optional(form, "ticketNumber"), baggage: optional(form, "baggage") } } } });
    } else if (["Hold File", "E-Visa Hold", "Return File"].includes(stage)) {
      const isReturn = stage === "Return File";
      record = await prisma.$transaction(async (tx) => { const row = await tx.holdReturn.create({ data: { fileId: file.id, type: isReturn ? "RETURN" : "HOLD", previousStage: file.currentStage, reason: required(form, "reason"), actionDate: date(form, "actionDate") ?? new Date(), expectedRelease: date(form, "expectedRelease"), financialImpact: number(form, "financialImpact") || undefined, note: optional(form, "remarks"), attachment: documentId, status: isReturn ? "Returned" : "On Hold", owner: optional(form, "owner") ?? session.user.name } }); await tx.processingFile.update({ where: { id: file.id }, data: { status: isReturn ? "RETURNED" : "HOLD" } }); return row; });
    } else {
      record = await prisma.workflowEvent.create({ data: { fileId: file.id, stage, status: optional(form, "status") ?? "Recorded", completedBy: session.user.name, data: jsonFields(form) } });
    }

    await prisma.auditLog.create({ data: { userId: session.userId, role: session.user.role.name, module: moduleId, recordId: record.id, action: `CREATE_${stage.toUpperCase().replaceAll(/[^A-Z0-9]+/g, "_")}`, newValue: { fileId: file.id, fileNo: file.fileNo, stage, documentId }, correlationId: crypto.randomUUID() } });
    await prisma.activityLog.create({ data: { userId: session.userId, module: moduleId, recordId: file.id, action: "STAGE_RECORD_CREATED", summary: `${stage} record added to ${file.fileNo}`, metadata: { stage, recordId: record.id } } });
    return Response.json({ data: { id: record.id, fileId: file.id, fileNo: file.fileNo, stage } }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
