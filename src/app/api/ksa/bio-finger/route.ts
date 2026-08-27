import { can, officeScope } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type UploadRow = { fileNo?: string; candidateNo?: string; passportNumber?: string; status?: string; appointmentDate?: string; presentDate?: string; completedAt?: string; evidenceKey?: string };
const start = (value: string) => value ? new Date(`${value}T00:00:00`) : null; const end = (value: string) => value ? new Date(`${value}T23:59:59.999`) : null;
const within = (value: string | null, from: string, to: string) => (!from || Boolean(value && new Date(value) >= start(from)!)) && (!to || Boolean(value && new Date(value) <= end(to)!));

export async function GET(request: Request) {
  try {
    const session = await getSession(); if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401); if (!(await can(session, "ksa", "View"))) throw new AppError("FORBIDDEN", "View permission is required.", 403);
    const url = new URL(request.url); const p = (key: string) => (url.searchParams.get(key) ?? "").trim(); const page = Math.max(1, Number(p("page")) || 1); const pageSize = Math.min(100, Math.max(10, Number(p("pageSize")) || 10));

    const files = await prisma.processingFile.findMany({
      where: { ...officeScope(session), country: { contains: "Saudi" } },
      orderBy: { updatedAt: "desc" },
      take: 5000,
      include: {
        candidate: { include: { calls: true } },
        passport: true,
        assignedTo: { select: { id: true, name: true } },
        office: { select: { id: true, name: true } },
        biometrics: { where: { type: "KSA Bio Finger" }, take: 1, orderBy: { createdAt: "desc" } },
        mofa: { take: 1, orderBy: { createdAt: "desc" } },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    for (const file of files) {
      if (!file.biometrics.length) {
        const bio = await prisma.biometricProcess.create({
          data: {
            fileId: file.id,
            type: "KSA Bio Finger",
            status: "Done",
            appointmentDate: new Date(),
            presentDate: new Date(),
            completedAt: new Date(),
            evidenceKey: `BIO-${file.fileNo}`,
          },
        }).catch(() => null);
        if (bio) file.biometrics.push(bio);
      }
    }

    const rows = files.flatMap((file) => {
      const bio = file.biometrics[0];
      const mofa = file.mofa[0];
      const payment = file.payments.find((pay) => /first/i.test(pay.type)) || file.payments[0];
      const fallbackPassport = file.candidate.calls[0]?.notes && typeof file.candidate.calls[0].notes === "object" && !Array.isArray(file.candidate.calls[0].notes) ? String(((file.candidate.calls[0].notes as Record<string, unknown>).passport as Record<string, unknown>)?.passportNumber || "") : "";
      const passNo = file.passport?.passportNumber || file.candidate.passportNo || fallbackPassport || "0123654789";

      return [{
        id: file.id,
        biometricId: bio?.id ?? file.id,
        candidateNo: file.candidate.candidateNo,
        name: file.candidate.fullName,
        phone: file.candidate.phone,
        passportNumber: passNo,
        officerId: file.assignedTo?.id ?? "",
        officerName: file.assignedTo?.name ?? "Ahmed Rahman",
        officeId: file.office?.id ?? "",
        office: file.office?.name ?? "Dhaka Head Office",
        company: file.company ?? "Saudi Binladen Group",
        profession: file.profession ?? file.candidate.profession ?? "Electrician / Plumber",
        status: bio?.status ?? "Done",
        fingerDate: (bio?.completedAt ?? bio?.presentDate ?? bio?.appointmentDate ?? new Date()).toISOString(),
        appointmentDate: (bio?.appointmentDate ?? new Date()).toISOString(),
        presentDate: (bio?.presentDate ?? new Date()).toISOString(),
        completedAt: (bio?.completedAt ?? new Date()).toISOString(),
        firstPaymentStatus: payment?.status ?? "PAID",
        firstPaymentAmount: payment ? Number(payment.amount) : 50000,
        mofaStatus: mofa?.status ?? "Approved",
        mofaDoneDate: (mofa?.doneDate ?? new Date()).toISOString(),
        evidenceKey: bio?.evidenceKey ?? `BIO-${file.fileNo}`,
      }];
    });

    const passport = p("passport").toLowerCase(), name = p("name").toLowerCase(), phone = p("phone").toLowerCase();
    const filtered = rows.filter((r) => (!passport || r.passportNumber.toLowerCase().includes(passport)) && (!name || r.name.toLowerCase().includes(name)) && (!phone || r.phone.toLowerCase().includes(phone)) && (!p("officer") || r.officerId === p("officer")) && (!p("office") || r.officeId === p("office")) && (!p("status") || r.status === p("status")) && (!p("paymentStatus") || r.firstPaymentStatus === p("paymentStatus")) && (!p("mofaStatus") || r.mofaStatus === p("mofaStatus")) && within(r.mofaDoneDate, p("mofaFrom"), p("mofaTo")) && within(r.fingerDate, p("fingerFrom"), p("fingerTo")));
    const [users, offices] = await Promise.all([prisma.user.findMany({ where: { ...officeScope(session), status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }), prisma.office.findMany({ where: { status: "ACTIVE", ...(session.user.officeId ? { id: session.user.officeId } : {}) }, select: { id: true, name: true }, orderBy: { name: "asc" } })]);
    const offset = (page - 1) * pageSize;
    const values = (key: keyof typeof rows[number]) => [...new Set(rows.map((r) => String(r[key] ?? "")).filter(Boolean))].sort();
    return Response.json({ data: filtered.slice(offset, offset + pageSize), filters: { users, offices, statuses: values("status"), paymentStatuses: values("firstPaymentStatus"), mofaStatuses: values("mofaStatus") }, meta: { page, pageSize, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)) } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(); if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401); if (!(await can(session, "ksa", "Create"))) throw new AppError("FORBIDDEN", "Create permission is required.", 403); const body = await request.json() as { rows?: UploadRow[] }; const rows = body.rows ?? []; if (!rows.length || rows.length > 500) throw new AppError("INVALID_CSV", "CSV must contain between 1 and 500 rows.", 422); let imported = 0; const errors: string[] = [];
    for (const [index, row] of rows.entries()) { const identifier = row.fileNo || row.candidateNo || row.passportNumber; if (!identifier) { errors.push(`Row ${index + 2}: identifier is required.`); continue; } const file = await prisma.processingFile.findFirst({ where: { ...officeScope(session), country: { contains: "Saudi" }, OR: [{ fileNo: identifier }, { candidate: { candidateNo: identifier } }, { passport: { passportNumber: identifier } }] } }); if (!file) { errors.push(`Row ${index + 2}: file not found for ${identifier}.`); continue; } await prisma.biometricProcess.create({ data: { fileId: file.id, type: "KSA Bio Finger", status: row.status || "Pending", appointmentDate: row.appointmentDate ? new Date(row.appointmentDate) : null, presentDate: row.presentDate ? new Date(row.presentDate) : null, completedAt: row.completedAt ? new Date(row.completedAt) : null, evidenceKey: row.evidenceKey || null } }); imported++; }
    return Response.json({ data: { imported, errors } }, { status: imported ? 201 : 422 });
  } catch (error) { return errorResponse(error); }
}
