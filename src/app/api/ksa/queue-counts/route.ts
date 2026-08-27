import { can, officeScope } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { workflowCountry, workflowModule } from "@/lib/workflow-country";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, workflowModule(request), "View"))) throw new AppError("FORBIDDEN", "View permission is required.", 403);
    const where = { ...officeScope(session), country: { contains: workflowCountry(request) } };
    const [total, passportEntry, medical, mofa, takamul, bioFinger, police, firstPayment, preConfirm, visaStamping, visaHold, secondPayment, manpower, readyFlight, flights, returned, grouped] = await Promise.all([
      prisma.processingFile.count({ where }),
      prisma.processingFile.count({ where: { ...where, passport: { isNot: null } } }),
      prisma.processingFile.count({ where: { ...where, medical: { some: {} } } }),
      prisma.processingFile.count({ where: { ...where, mofa: { some: {} } } }),
      prisma.processingFile.count({ where: { ...where, takamul: { some: {} } } }),
      prisma.processingFile.count({ where: { ...where, biometrics: { some: { type: "KSA Bio Finger" } } } }),
      prisma.processingFile.count({ where: { ...where, police: { some: {} } } }),
      prisma.processingFile.count({ where: { ...where, payments: { some: { type: "First Payment" } } } }),
      prisma.processingFile.count({ where: { ...where, currentStage: "Pre Confirm File" } }),
      prisma.processingFile.count({ where: { ...where, visas: { some: {} } } }),
      prisma.processingFile.count({ where: { ...where, OR: [{ currentStage: "E-Visa Hold" }, { holds: { some: { type: "HOLD", previousStage: "E-Visa Hold" } } }] } }),
      prisma.processingFile.count({ where: { ...where, OR: [{ currentStage: { in: ["Pending 2nd Payment", "Pending Second Payment"] } }, { payments: { some: { type: "Second Payment", status: { not: "PAID" } } } }] } }),
      prisma.processingFile.count({ where: { ...where, OR: [{ currentStage: "Manpower" }, { manpower: { some: {} } }] } }),
      prisma.processingFile.count({ where: { ...where, OR: [{ currentStage: "Ready To Flight" }, { workflowEvents: { some: { stage: "Ready To Flight" } } }] } }),
      prisma.processingFile.count({ where: { ...where, OR: [{ currentStage: "Flight" }, { flights: { some: {} } }] } }),
      prisma.processingFile.count({ where: { ...where, OR: [{ currentStage: "Return File" }, { status: "RETURNED" }, { holds: { some: { type: "RETURN" } } }] } }),
      prisma.processingFile.groupBy({ by: ["currentStage"], where, _count: { _all: true } }),
    ]);
    const counts: Record<string, number> = { "Passport List": total, "Passport Entry": passportEntry, Medical: medical, MOFA: mofa, Takamul: takamul, "KSA Bio Finger": bioFinger, "Police Clearance": police, "First Payment": firstPayment, "Pre Confirm File": preConfirm, "E-Visa Stamping": visaStamping, "E-Visa Hold": visaHold, "Pending Second Payment": secondPayment, "Second Payment": secondPayment, Manpower: manpower, "Ready To Flight": readyFlight, Flight: flights, "Return File": returned };
    for (const row of grouped) { const label = row.currentStage === "Pending 2nd Payment" ? "Pending Second Payment" : row.currentStage; if (!(["Passport Entry", "Medical", "MOFA", "Takamul", "KSA Bio Finger", "Police Clearance", "First Payment", "Pre Confirm File", "E-Visa Stamping", "E-Visa Hold", "Pending Second Payment", "Manpower", "Ready To Flight", "Flight", "Return File"].includes(label))) counts[label] = row._count._all; }
    return Response.json({ data: counts });
  } catch (error) { return errorResponse(error); }
}
