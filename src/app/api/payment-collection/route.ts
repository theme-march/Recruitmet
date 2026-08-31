import { can, officeScope } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
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

    const files = await prisma.processingFile.findMany({
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
    });

    const rows = files.map((file) => {
      const paid = file.payments
        .filter((p) => !p.status || ["PAID", "CONFIRMED", "COMPLETED", "PARTIAL"].includes(p.status))
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const refunded = file.payments
        .flatMap((p) => p.refunds)
        .filter((r) => r.status === "Completed")
        .reduce((sum, r) => sum + Number(r.amount), 0);
      const latest = file.payments[0];

      // Normalize country to 3 standard buckets: Saudi Arabia, Dubai, Other Country
      const rawCountry = file.country || "";
      const normalizedCountry = /saudi|ksa/i.test(rawCountry)
        ? "Saudi Arabia"
        : /dubai|uae|emirates/i.test(rawCountry)
        ? "Dubai"
        : "Other Country";

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
      const matchesCountry =
        !country ||
        country === "All" ||
        row.country === country ||
        (country === "Other Country" && row.country === "Other Country");

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
        countries: ["Saudi Arabia", "Dubai", "Other Country"],
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

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "payment-collection", "Write")))
      throw new AppError("FORBIDDEN", "Payment collection write permission is required.", 403);

    const body = await request.json();
    const { fileId, candidateId, amount, type, method, reference, collectedAt, notes, fileData, fileName } = body;

    let targetFileId = fileId;
    let targetCandidateId = candidateId;

    if (!targetFileId && targetCandidateId) {
      const f = await prisma.processingFile.findFirst({
        where: { candidateId: targetCandidateId },
        orderBy: { createdAt: "desc" },
      });
      if (f) targetFileId = f.id;
    }

    if (!targetCandidateId && targetFileId) {
      const f = await prisma.processingFile.findUnique({
        where: { id: targetFileId },
        select: { candidateId: true },
      });
      if (f) targetCandidateId = f.candidateId;
    }

    if (!targetCandidateId) {
      throw new AppError("BAD_REQUEST", "Candidate or file identifier is required.", 400);
    }

    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
      throw new AppError("BAD_REQUEST", "Payment amount must be greater than 0.", 400);
    }

    const paymentType = type?.trim() || "Candidate Payment Deposit";
    const paymentMethod = method || "Cash at Office";
    const refNo = reference || `REC-${Date.now().toString().slice(-6)}`;
    const colDate = collectedAt ? new Date(collectedAt) : new Date();

    const newPayment = await prisma.payment.create({
      data: {
        paymentNo: `PAY-${Date.now().toString().slice(-8)}`,
        fileId: targetFileId || undefined,
        candidateId: targetCandidateId,
        type: paymentType,
        amount: numAmount,
        currency: "BDT",
        status: "PAID",
        method: paymentMethod,
        reference: refNo,
        collectedAt: colDate,
        collector: session.user.name || "Accounts Department",
        note: notes || "Payment collected via payment collection dashboard",
      },
    });

    if (fileData) {
      await prisma.document.create({
        data: {
          documentNo: `DOC-${Date.now().toString().slice(-8)}`,
          candidateId: targetCandidateId,
          fileId: targetFileId || undefined,
          type: "payment_voucher",
          fileName: fileName || `${paymentType}-Slip.pdf`,
          url: fileData,
        },
      });
    }

    if (targetFileId) {
      await prisma.processingFile.update({
        where: { id: targetFileId },
        data: { updatedAt: new Date() },
      });
    }

    return Response.json({
      success: true,
      message: `Payment of ৳ ${numAmount.toLocaleString()} recorded successfully!`,
      data: newPayment,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
