import { can, officeScope } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "dubai", "View"))) throw new AppError("FORBIDDEN", "View permission is required.", 403);

    const where = { ...officeScope(session), country: { contains: "Dubai" } };
    const [
      passportList, passportEntry, medical, firstPayment, approvalApplication,
      visaStamping, visaHold, secondPayment, visaDone, manpower,
      readyToFlight, flight, holdFile, returnFile,
    ] = await Promise.all([
      prisma.processingFile.count({ where }),
      prisma.processingFile.count({ where: { ...where, passport: { isNot: null } } }),
      prisma.processingFile.count({ where: { ...where, medical: { some: {} } } }),
      prisma.processingFile.count({ where: { ...where, payments: { some: { type: "First Payment" } } } }),
      prisma.processingFile.count({ where: { ...where, currentStage: "Approval Application" } }),
      prisma.processingFile.count({ where: { ...where, visas: { some: {} } } }),
      prisma.processingFile.count({ where: { ...where, OR: [{ currentStage: "E-Visa Hold" }, { holds: { some: { type: "HOLD", previousStage: "E-Visa Hold" } } }] } }),
      prisma.processingFile.count({ where: { ...where, OR: [{ currentStage: { in: ["Second Payment", "Pending 2nd Payment", "Pending Second Payment"] } }, { payments: { some: { type: "Second Payment" } } }] } }),
      prisma.processingFile.count({ where: { ...where, OR: [{ currentStage: "Visa Done" }, { visas: { some: { status: { equals: "Done" } } } }] } }),
      prisma.processingFile.count({ where: { ...where, OR: [{ currentStage: "Manpower" }, { manpower: { some: {} } }] } }),
      prisma.processingFile.count({ where: { ...where, OR: [{ currentStage: "Ready To Flight" }, { workflowEvents: { some: { stage: "Ready To Flight" } } }] } }),
      prisma.processingFile.count({ where: { ...where, OR: [{ currentStage: "Flight" }, { flights: { some: {} } }] } }),
      prisma.processingFile.count({ where: { ...where, holds: { some: { type: "HOLD" } } } }),
      prisma.processingFile.count({ where: { ...where, OR: [{ currentStage: "Return File" }, { status: "RETURNED" }, { holds: { some: { type: "RETURN" } } }] } }),
    ]);

    return Response.json({ data: {
      "Passport List": passportList,
      "Passport Entry": passportEntry,
      Medical: medical,
      "First Payment": firstPayment,
      "Approval Application": approvalApplication,
      "E-Visa Stamping": visaStamping,
      "E-Visa Hold": visaHold,
      "Second Payment": secondPayment,
      "Visa Done": visaDone,
      Manpower: manpower,
      "Ready To Flight": readyToFlight,
      Flight: flight,
      "Hold File": holdFile,
      "Return File": returnFile,
    } });
  } catch (error) {
    return errorResponse(error);
  }
}
