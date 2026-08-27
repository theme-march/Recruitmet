import { can, officeScope } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { workflowCountry, workflowCountryWhere, workflowModule } from "@/lib/workflow-country";

const DAY = 86_400_000;
const asObject = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, workflowModule(request), "View"))) throw new AppError("FORBIDDEN", "View permission is required.", 403);
    const url = new URL(request.url);
    const type = url.searchParams.get("type") === "daily" ? "daily" : "total";
    const selectedCountry = workflowCountry(request);
    const countryLabel = /^saudi/i.test(selectedCountry) ? "Saudi Arabia" : /^other/i.test(selectedCountry) ? "Other Country" : "Dubai";
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const from = url.searchParams.get("from") ? new Date(`${url.searchParams.get("from")}T00:00:00`) : defaultStart;
    const to = url.searchParams.get("to") ? new Date(`${url.searchParams.get("to")}T23:59:59.999`) : new Date(defaultStart.getTime() + DAY - 1);
    const inRange = (value?: Date | null) => Boolean(value && value >= from && value <= to);
    const files = await prisma.processingFile.findMany({
      where: { ...officeScope(session), country: workflowCountryWhere(request) },
      take: 10000,
      include: {
        passport: true,
        medical: { orderBy: { createdAt: "desc" } },
        payments: true,
        police: true,
        mofa: true,
        biometrics: true,
        visas: true,
        manpower: true,
        flights: { include: { flight: true } },
        workflowEvents: true,
        holds: true,
      },
    });
    const firstPaid = (file: typeof files[number]) => file.payments.some((payment) => payment.type === "First Payment" && payment.status === "PAID");
    const secondPaid = (file: typeof files[number]) => file.payments.some((payment) => payment.type === "Second Payment" && payment.status === "PAID");
    const medicalFit = (file: typeof files[number]) => /fit/i.test(file.medical[0]?.result ?? "");
    const totalEvents = [
      ["MEDICAL PENDING", files.filter((file) => file.currentStage === "Medical" && !file.medical.length).length],
      ["MEDICAL WAITING/PENDING FOR REPORT", files.filter((file) => file.medical.some((medical) => !medical.reportDate || /pending|waiting/i.test(medical.result))).length],
      ["FIT BUT 1ST PAYMENT DUE", files.filter((file) => medicalFit(file) && !firstPaid(file)).length],
      ["PC PENDING AFTER 1ST PAYMENT", files.filter((file) => firstPaid(file) && !file.police.length).length],
      ["MOFA PENDING AFTER FIT", files.filter((file) => medicalFit(file) && !file.mofa.length).length],
      ["BIO FINGER APPOINTMENT PENDING AFTER MOFA", files.filter((file) => file.mofa.length && !file.biometrics.length).length],
      ["BIO FINGER PRESENT PENDING", files.filter((file) => file.biometrics.some((bio) => /appointment|pending/i.test(bio.status))).length],
      ["BIO FINGER PRESENT", files.filter((file) => file.biometrics.some((bio) => /present|done|complete/i.test(bio.status))).length],
    ] as Array<[string, number]>;
    const generalTotalEvents = [
      ["PASSPORT ENTRY", files.filter((file) => Boolean(file.passport)).length],
      ["MEDICAL PENDING", files.filter((file) => !file.medical.length || file.medical.some((medical) => /pending|waiting/i.test(medical.result))).length],
      ["MEDICAL FIT/DONE", files.filter((file) => medicalFit(file) || file.medical.some((medical) => /done|complete/i.test(medical.result))).length],
      ["FIRST PAYMENT DUE", files.filter((file) => !firstPaid(file)).length],
      ["E-VISA PENDING", files.filter((file) => !file.visas.length || file.visas.some((visa) => /pending|submit|processing/i.test(visa.status))).length],
      ["SECOND PAYMENT DUE", files.filter((file) => !secondPaid(file)).length],
      ["MANPOWER PENDING", files.filter((file) => !file.manpower.length || file.manpower.some((item) => /pending|submit/i.test(item.status))).length],
      ["READY TO FLIGHT", files.filter((file) => /ready.*flight/i.test(file.currentStage)).length],
      ["FLIGHT SCHEDULED", files.filter((file) => file.flights.some((passenger) => !passenger.flown)).length],
      ["HOLD FILE", files.filter((file) => file.holds.some((hold) => hold.type === "HOLD" && !/release|closed/i.test(hold.status))).length],
      ["RETURN FILE", files.filter((file) => file.holds.some((hold) => hold.type === "RETURN")).length],
    ] as Array<[string, number]>;
    const stageCount = (stage: string) => files.reduce((sum, file) => sum + file.workflowEvents.filter((event) => event.stage === stage && inRange(event.createdAt)).length, 0);
    const dailyEvents = [
      ["PASSPORT ENTRY", files.filter((file) => inRange(file.passport?.createdAt)).length],
      ["PASSPORT HOLD", files.reduce((sum, file) => sum + file.holds.filter((hold) => hold.type === "HOLD" && /passport/i.test(hold.previousStage) && inRange(hold.actionDate)).length, 0)],
      ["PASSPORT RETURN", files.reduce((sum, file) => sum + file.holds.filter((hold) => hold.type === "RETURN" && /passport/i.test(hold.previousStage) && inRange(hold.actionDate)).length, 0)],
      ["INTERVIEW IN", stageCount("Interview")],
      ["INTERVIEW RTN", files.reduce((sum, file) => sum + file.holds.filter((hold) => hold.type === "RETURN" && /interview/i.test(hold.previousStage) && inRange(hold.actionDate)).length, 0)],
      ["MEDICAL DONE", files.filter((file) => file.medical.some((medical) => inRange(medical.reportDate))).length],
      ["MEDICAL PENDING", files.filter((file) => file.currentStage === "Medical" && !file.medical.some((medical) => inRange(medical.reportDate))).length],
      ["MEDICAL FIT", files.filter((file) => file.medical.some((medical) => /fit/i.test(medical.result) && inRange(medical.reportDate ?? medical.updatedAt))).length],
      ["MEDICAL CONTACT", files.filter((file) => file.medical.some((medical) => Boolean(asObject(medical.metadata).contactMedical) && inRange(medical.updatedAt))).length],
      ["MEDICAL CONTACT BY OFFICE", files.filter((file) => file.medical.some((medical) => /office/i.test(String(asObject(medical.metadata).contactMedicalDoneBy ?? "")) && inRange(medical.updatedAt))).length],
      ["MEDICAL CONTACT BY CUSTOMER", files.filter((file) => file.medical.some((medical) => /customer/i.test(String(asObject(medical.metadata).contactMedicalDoneBy ?? "")) && inRange(medical.updatedAt))).length],
      ["FIRST PAYMENT", files.reduce((sum, file) => sum + file.payments.filter((payment) => payment.type === "First Payment" && inRange(payment.collectedAt ?? payment.createdAt)).length, 0)],
      ["MOFA SUBMIT", stageCount("MOFA")],
      ["E-VISA STAMPING", stageCount("E-Visa Stamping")],
      ["SECOND PAYMENT", files.reduce((sum, file) => sum + file.payments.filter((payment) => payment.type === "Second Payment" && inRange(payment.collectedAt ?? payment.createdAt)).length, 0)],
      ["MANPOWER", stageCount("Manpower")],
      ["READY TO FLIGHT", stageCount("Ready To Flight")],
      ["FLIGHT", stageCount("Flight")],
      ["RETURN FILE", files.reduce((sum, file) => sum + file.holds.filter((hold) => hold.type === "RETURN" && inRange(hold.actionDate)).length, 0)],
    ] as Array<[string, number]>;
    return Response.json({ data: {
      type,
      country: countryLabel,
      snapshot: now.toISOString(),
      from: from.toISOString(),
      to: to.toISOString(),
      events: (type === "daily" ? dailyEvents : countryLabel === "Saudi Arabia" ? totalEvents : generalTotalEvents).map(([event, count]) => ({ event, count })),
    } });
  } catch (error) {
    return errorResponse(error);
  }
}
