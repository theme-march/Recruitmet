import { withApiAccess } from "@/lib/api-access";
export const GET = withApiAccess("payment-collection", GETHandler);
export const POST = withApiAccess("payment-collection", POSTHandler);
import { can, officeScope } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { recordDeposit, resolvePaymentFile } from "@/features/payments/service";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function GETHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "payment-collection", "Read")))
      throw new AppError("FORBIDDEN", "Payment collection view permission is required.", 403);

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const status = url.searchParams.get("status") ?? "";
    const country = url.searchParams.get("country") ?? "";
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize")) || 20));

    const [files, dbCountries] = await Promise.all([
      prisma.processingFile.findMany({
        where: officeScope(session),
        orderBy: { updatedAt: "desc" },
        take: 5000,
        include: {
          candidate: true,
          passport: true,
          visas: true,
          manpower: true,
          companyRecord: true,
          assignedTo: { select: { name: true } },
          office: { select: { name: true } },
          payments: { orderBy: { createdAt: "desc" }, include: { refunds: true } },
        },
      }),
      prisma.country.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const activeCountryNames = [
      ...dbCountries.map((c) => c.name),
      "Other",
    ].filter((name, idx, arr) => arr.indexOf(name) === idx);

    const rows = files.map((file) => {
      const paid = file.payments
        .filter((p) => !p.status || ["PAID", "CONFIRMED", "COMPLETED", "PARTIAL"].includes(p.status))
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const refunded = file.payments
        .flatMap((p) => p.refunds)
        .filter((r) => r.status === "Completed")
        .reduce((sum, r) => sum + Number(r.amount), 0);
      const latest = file.payments[0];

      // Match against database active countries
      const rawCountry = (file.country || "").trim();
      const matchedDb = dbCountries.find(
        (c) =>
          c.name.toLowerCase() === rawCountry.toLowerCase() ||
          (/saudi/i.test(rawCountry) && /saudi/i.test(c.name)) ||
          (/dubai|uae/i.test(rawCountry) && /dubai/i.test(c.name))
      );
      const normalizedCountry = matchedDb ? matchedDb.name : rawCountry || "Other";

      const packageCost = /dubai/i.test(rawCountry) ? 300000 : 350000;
      const dueAmount = Math.max(0, packageCost - paid);
      const advanceAmount = Math.max(0, paid - packageCost);

      const calculatedPaymentStatus =
        advanceAmount > 0
          ? "ADVANCE"
          : paid >= packageCost
          ? "PAID"
          : paid > 0
          ? "PARTIAL"
          : "PENDING";

      const companyName = file.company || file.companyRecord?.name || file.manpower?.[0]?.company || "Almarai";
      const professionName = file.profession || file.visas?.[0]?.profession || file.candidate?.profession || file.manpower?.[0]?.profession || "General Worker";

      return {
        id: file.id,
        fileNo: file.fileNo,
        candidateId: file.candidateId,
        candidateNo: file.candidate.candidateNo,
        name: file.candidate.fullName,
        phone: file.candidate.phone,
        passport: file.passport?.passportNumber ?? file.candidate.passportNo ?? "Not entered",
        country: normalizedCountry,
        rawCountry,
        officer: file.assignedTo?.name ?? "Unassigned",
        agent: file.agent ?? "N/A",
        office: file.office?.name ?? "SELF",
        company: companyName,
        profession: professionName,
        currentStage: file.currentStage,
        paymentStatus: calculatedPaymentStatus,
        paid,
        refunded,
        netPaid: paid - refunded,
        totalPackage: packageCost,
        dueAmount,
        advanceAmount,
        dueDate: latest?.dueDate?.toISOString() ?? null,
        lastPaymentAt: latest?.collectedAt?.toISOString() ?? null,
        paymentCount: file.payments.length,
        payments: file.payments.map((p) => ({
          id: p.id,
          paymentNo: p.paymentNo,
          amount: Number(p.amount),
          type: p.type,
          method: p.method || "Cash",
          reference: p.reference || "N/A",
          createdAt: p.createdAt.toISOString(),
        })),
      };
    });

    const filtered = rows.filter((row) => {
      const matchesQ =
        !q ||
        [row.name, row.phone, row.passport, row.fileNo, row.candidateNo, row.country, row.rawCountry].some((v) =>
          v.toLowerCase().includes(q)
        );
      const matchesStatus = !status || row.paymentStatus === status;
      const targetCountry = country.trim().toLowerCase();
      const matchesCountry =
        !country ||
        targetCountry === "all" ||
        targetCountry === "all countries" ||
        row.country.toLowerCase() === targetCountry ||
        row.rawCountry.toLowerCase() === targetCountry ||
        (targetCountry.includes("saudi") && row.country.toLowerCase().includes("saudi")) ||
        (targetCountry.includes("dubai") && (row.country.toLowerCase().includes("dubai") || row.rawCountry.toLowerCase().includes("dubai"))) ||
        (targetCountry.includes("other") && !/saudi|dubai|uae|emirates/i.test(row.country));

      return matchesQ && matchesStatus && matchesCountry;
    });

    const totalCollected = filtered.reduce((sum, r) => sum + r.paid, 0);
    const totalRefunded = filtered.reduce((sum, r) => sum + r.refunded, 0);
    const totalNet = totalCollected - totalRefunded;
    const totalDue = filtered.reduce((sum, r) => sum + (r.dueAmount || 0), 0);
    const totalAdvance = filtered.reduce((sum, r) => sum + (r.advanceAmount || 0), 0);
    const paidCount = filtered.filter((r) => r.paid > 0).length;
    const pendingCount = filtered.filter((r) => r.paid === 0).length;

    const offset = (page - 1) * pageSize;
    return Response.json({
      data: filtered.slice(offset, offset + pageSize),
      summary: {
        totalCandidates: filtered.length,
        totalCollected,
        totalRefunded,
        totalNet,
        totalDue,
        totalAdvance,
        paidCount,
        pendingCount,
      },
      filters: {
        statuses: [...new Set(rows.map((r) => r.paymentStatus))].sort(),
        countries: activeCountryNames,
      },
      meta: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function POSTHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "payment-collection", "Create")))
      throw new AppError("FORBIDDEN", "Payment collection write permission is required.", 403);

    const body = await request.json();
    const file = await resolvePaymentFile(session, body.fileId, body.candidateId);
    const payment = await recordDeposit({
      fileId: file.id, candidateId: file.candidateId, amount: body.amount,
      type: body.type?.trim() || "Candidate Payment Deposit",
      method: body.method || "Cash at Office", reference: body.reference || undefined,
      collectedAt: body.collectedAt || undefined, note: body.notes || undefined,
      voucher: body.fileData || undefined, fileName: body.fileName || undefined,
    }, request.headers.get("idempotency-key") || "", session);
    return Response.json({ success: true, message: "Payment recorded successfully.", data: payment });
  } catch (error) {
    return errorResponse(error);
  }
}
