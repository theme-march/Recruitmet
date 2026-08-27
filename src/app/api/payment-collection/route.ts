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
        assignedTo: { select: { name: true } },
        office: { select: { name: true } },
        payments: { orderBy: { createdAt: "desc" }, include: { refunds: true } },
      },
    });

    const rows = files.map((file) => {
      const paid = file.payments
        .filter((p) => ["PAID", "PARTIAL"].includes(p.status))
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

      return {
        id: file.id,
        fileNo: file.fileNo,
        candidateNo: file.candidate.candidateNo,
        name: file.candidate.fullName,
        phone: file.candidate.phone,
        passport: file.passport?.passportNumber ?? file.candidate.passportNo ?? "Not entered",
        country: normalizedCountry,
        rawCountry,
        officer: file.assignedTo?.name ?? "Unassigned",
        agent: file.agent ?? "N/A",
        office: file.office?.name ?? "SELF",
        company: file.company ?? "N/A",
        profession: file.profession ?? file.candidate.profession ?? "N/A",
        currentStage: file.currentStage,
        paymentStatus: latest?.status ?? "PENDING",
        paid,
        refunded,
        netPaid: paid - refunded,
        dueDate: latest?.dueDate?.toISOString() ?? null,
        lastPaymentAt: latest?.collectedAt?.toISOString() ?? null,
        paymentCount: file.payments.length,
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

    const offset = (page - 1) * pageSize;
    return Response.json({
      data: filtered.slice(offset, offset + pageSize),
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
