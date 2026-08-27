import { can, officeScope } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { pageResult, parsePagination } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { Prisma } from "@prisma/client";

const fileModules = new Set(["files", "ksa", "dubai", "other-country"]);
const nonStageTabs = new Set(["All Files", "All Candidates", "New Files", "Active Files", "Completed Files", "Hold Files", "Return Files", "Expired Files", "File Details", "Passport Management", "Passport List"]);
const countryFor = (moduleId: string) => moduleId === "ksa" ? "Saudi Arabia" : moduleId === "dubai" ? "Dubai" : undefined;
const dateAtStart = (value: string | null) => (value ? new Date(`${value}T00:00:00`) : undefined);
const dateAtEnd = (value: string | null) => (value ? new Date(`${value}T23:59:59.999`) : undefined);

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const url = new URL(request.url);
    const moduleId = url.searchParams.get("module") ?? "call-center";
    const tab = url.searchParams.get("tab") ?? "Work Call List";
    if (!(await can(session, moduleId, "View"))) throw new AppError("FORBIDDEN", "View permission is required.", 403);
    const p = parsePagination(request.url);

    if (fileModules.has(moduleId)) {
      const country = countryFor(moduleId);
      const where: Prisma.ProcessingFileWhereInput = {
        ...officeScope(session),
        ...(country ? { country } : {}),
        ...(p.q ? { OR: [{ fileNo: { contains: p.q } }, { candidate: { fullName: { contains: p.q } } }, { candidate: { phone: { contains: p.q } } }] } : {}),
      };
      const [files, total] = await Promise.all([
        prisma.processingFile.findMany({
          where,
          skip: p.skip,
          take: p.take,
          orderBy: { updatedAt: "desc" },
          include: { candidate: true, assignedTo: true },
        }),
        prisma.processingFile.count({ where }),
      ]);
      return Response.json(
        pageResult(
          files.map((file) => ({
            id: file.fileNo,
            dbId: file.id,
            name: file.candidate.fullName,
            phone: file.candidate.phone,
            passport: file.candidate.passportNo ?? "Not provided",
            country: file.country,
            stage: file.currentStage,
            owner: file.assignedTo?.name ?? "Unassigned",
            status: file.status,
            actionUrl: `/module/call-center/work-call-list`,
          })),
          total,
          p.page,
          p.pageSize
        )
      );
    }

    if (moduleId === "call-center") {
      const callStatus = url.searchParams.get("callStatus") || undefined;
      const priority = Number(url.searchParams.get("priority")) || undefined;
      const followUpFrom = dateAtStart(url.searchParams.get("followUpFrom"));
      const followUpTo = dateAtEnd(url.searchParams.get("followUpTo"));
      const where: Prisma.WorkCallWhereInput = {
        ...(p.q ? { OR: [{ fullName: { contains: p.q } }, { phone: { contains: p.q } }, { leadNo: { contains: p.q } }] } : {}),
        ...(callStatus ? { status: callStatus } : {}),
        ...(priority ? { priority } : {}),
        ...(followUpFrom || followUpTo ? { followUpAt: { ...(followUpFrom ? { gte: followUpFrom } : {}), ...(followUpTo ? { lte: followUpTo } : {}) } } : {}),
      };
      const [rows, total] = await Promise.all([
        prisma.workCall.findMany({ where, skip: p.skip, take: p.take, orderBy: { updatedAt: "desc" }, include: { assignedTo: true } }),
        prisma.workCall.count({ where }),
      ]);
      return Response.json(
        pageResult(
          rows.map((row) => ({
            id: row.leadNo,
            dbId: row.id,
            name: row.fullName,
            phone: row.phone,
            passport: row.purpose ?? "—",
            country: row.country ?? "—",
            stage: row.followUpAt ? `Follow-up ${row.followUpAt.toLocaleDateString()}` : row.status,
            owner: row.assignedTo?.name ?? "Unassigned",
            status: `P${row.priority}`,
          })),
          total,
          p.page,
          p.pageSize
        )
      );
    }

    if (moduleId === "registration") {
      if (/Interview/.test(tab)) {
        const upcoming = tab.includes("Upcoming");
        const where: Prisma.InterviewScheduleWhereInput = {
          ...(p.q ? { OR: [{ title: { contains: p.q } }, { company: { contains: p.q } }, { profession: { contains: p.q } }] } : {}),
          ...(upcoming ? { scheduledAt: { gte: new Date() } } : {}),
        };
        const [rows, total] = await Promise.all([
          prisma.interviewSchedule.findMany({ where, skip: p.skip, take: p.take, orderBy: { scheduledAt: "desc" }, include: { _count: { select: { interviews: true } } } }),
          prisma.interviewSchedule.count({ where }),
        ]);
        return Response.json(
          pageResult(
            rows.map((row) => ({
              id: row.id.slice(-8),
              dbId: row.id,
              name: row.title,
              phone: `${row._count.interviews}/${row.capacity} candidates`,
              passport: row.company ?? "No company",
              country: row.profession ?? "All professions",
              stage: row.scheduledAt.toLocaleString(),
              owner: row.interviewer ?? row.venue ?? "Unassigned",
              status: row.status,
            })),
            total,
            p.page,
            p.pageSize
          )
        );
      }
      const preferredCountry = url.searchParams.get("country") || undefined;
      const profession = url.searchParams.get("profession") || undefined;
      const where: Prisma.CandidateWhereInput = {
        ...officeScope(session),
        ...(preferredCountry ? { preferredCountry: { contains: preferredCountry } } : {}),
        ...(profession ? { profession: { contains: profession } } : {}),
        ...(p.q ? { OR: [{ candidateNo: { contains: p.q } }, { fullName: { contains: p.q } }, { phone: { contains: p.q } }, { passportNo: { contains: p.q } }] } : {}),
      };
      const [rows, total] = await Promise.all([
        prisma.candidate.findMany({ where, skip: p.skip, take: p.take, orderBy: { updatedAt: "desc" }, include: { interviews: { take: 1, orderBy: { scheduledAt: "desc" } } } }),
        prisma.candidate.count({ where }),
      ]);
      return Response.json(
        pageResult(
          rows.map((row) => ({
            id: row.candidateNo,
            dbId: row.id,
            name: row.fullName,
            phone: row.phone,
            passport: row.passportNo ?? "Not provided",
            country: row.preferredCountry ?? "—",
            stage: row.interviews[0]?.result ?? "Not scheduled",
            owner: row.profession ?? "Not assigned",
            status: row.status,
          })),
          total,
          p.page,
          p.pageSize
        )
      );
    }

    if (moduleId === "accounts") {
      const where: Prisma.PaymentWhereInput = {
        ...(p.q ? { OR: [{ paymentNo: { contains: p.q } }, { candidate: { fullName: { contains: p.q } } }] } : {}),
      };
      const [rows, total] = await Promise.all([
        prisma.payment.findMany({ where, skip: p.skip, take: p.take, orderBy: { createdAt: "desc" }, include: { candidate: true } }),
        prisma.payment.count({ where }),
      ]);
      return Response.json(
        pageResult(
          rows.map((row) => ({
            id: row.paymentNo,
            dbId: row.id,
            name: row.candidate?.fullName ?? "Unlinked payment",
            phone: `৳${Number(row.amount).toLocaleString()}`,
            passport: row.method ?? "—",
            country: row.currency,
            stage: row.type,
            owner: row.collector ?? "System",
            status: row.status,
          })),
          total,
          p.page,
          p.pageSize
        )
      );
    }

    if (moduleId === "documents") {
      const where: Prisma.DocumentWhereInput = {
        ...(p.q ? { OR: [{ documentNo: { contains: p.q } }, { candidate: { fullName: { contains: p.q } } }] } : {}),
      };
      const [rows, total] = await Promise.all([
        prisma.document.findMany({ where, skip: p.skip, take: p.take, orderBy: { createdAt: "desc" }, include: { candidate: true } }),
        prisma.document.count({ where }),
      ]);
      return Response.json(
        pageResult(
          rows.map((row) => ({
            id: row.documentNo,
            dbId: row.id,
            name: row.candidate?.fullName ?? "Unlinked document",
            phone: row.type,
            passport: row.number ?? row.candidate?.passportNo ?? "—",
            country: "Bangladesh",
            stage: row.expiryDate ? `Expires ${row.expiryDate.toLocaleDateString()}` : `Version ${row.version}`,
            owner: row.verifiedBy ?? "Unverified",
            status: row.status,
          })),
          total,
          p.page,
          p.pageSize
        )
      );
    }

    if (moduleId === "flights") {
      const where: Prisma.FlightWhereInput = {
        ...(p.q ? { OR: [{ flightNo: { contains: p.q } }, { airline: { contains: p.q } }] } : {}),
      };
      const [rows, total] = await Promise.all([
        prisma.flight.findMany({ where, skip: p.skip, take: p.take, orderBy: { departureAt: "desc" }, include: { _count: { select: { passengers: true } } } }),
        prisma.flight.count({ where }),
      ]);
      return Response.json(
        pageResult(
          rows.map((row) => ({
            id: row.flightNo,
            dbId: row.id,
            name: row.airline,
            phone: `${row._count.passengers} passengers`,
            passport: row.pnr ?? "No PNR",
            country: row.destination,
            stage: row.departureAt.toLocaleString(),
            owner: row.departureAirport,
            status: row.status,
          })),
          total,
          p.page,
          p.pageSize
        )
      );
    }

    if (moduleId === "partners") {
      const [rows, total] = await Promise.all([
        prisma.demand.findMany({ skip: p.skip, take: p.take, orderBy: { createdAt: "desc" }, include: { company: true } }),
        prisma.demand.count(),
      ]);
      return Response.json(
        pageResult(
          rows.map((row) => ({
            id: row.demandNo,
            dbId: row.id,
            name: row.title,
            phone: `${row.assignedQuantity}/${row.quantity} assigned`,
            passport: row.profession,
            country: row.country,
            stage: row.company.name,
            owner: row.deadline?.toLocaleDateString() ?? "No deadline",
            status: row.status,
          })),
          total,
          p.page,
          p.pageSize
        )
      );
    }

    if (moduleId === "tutorials") {
      const [rows, total] = await Promise.all([
        prisma.tutorial.findMany({ skip: p.skip, take: p.take, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], include: { category: true } }),
        prisma.tutorial.count(),
      ]);
      return Response.json(
        pageResult(
          rows.map((row) => ({
            id: row.title,
            dbId: row.id,
            name: row.title,
            phone: row.type,
            passport: row.language,
            country: row.audience ?? "All users",
            stage: row.category.name,
            owner: row.durationMin ? `${row.durationMin} min` : "—",
            status: row.status,
            actionUrl: row.resourceUrl,
          })),
          total,
          p.page,
          p.pageSize
        )
      );
    }

    if (moduleId === "notifications") {
      const where = { recipient: session.userId };
      const [rows, total] = await Promise.all([
        prisma.notification.findMany({ where, skip: p.skip, take: p.take, orderBy: { createdAt: "desc" } }),
        prisma.notification.count({ where }),
      ]);
      return Response.json(
        pageResult(
          rows.map((row) => ({
            id: row.id.slice(-8),
            dbId: row.id,
            name: row.title,
            phone: row.channel,
            passport: row.type,
            country: row.priority,
            stage: row.scheduledAt?.toLocaleString() ?? row.createdAt.toLocaleString(),
            owner: row.recipient,
            status: row.readAt ? "Read" : row.status,
          })),
          total,
          p.page,
          p.pageSize
        )
      );
    }

    if (moduleId === "common") {
      const [rows, total] = await Promise.all([
        prisma.auditLog.findMany({ skip: p.skip, take: p.take, orderBy: { createdAt: "desc" }, include: { user: true } }),
        prisma.auditLog.count(),
      ]);
      return Response.json(
        pageResult(
          rows.map((row) => ({
            id: row.correlationId ?? row.id.slice(-8),
            dbId: row.id,
            name: row.action,
            phone: row.module,
            passport: row.recordId,
            country: row.role ?? "System",
            stage: row.createdAt.toLocaleString(),
            owner: row.user?.name ?? "System",
            status: "Recorded",
          })),
          total,
          p.page,
          p.pageSize
        )
      );
    }

    return Response.json(pageResult([], 0, p.page, p.pageSize));
  } catch (error) {
    return errorResponse(error);
  }
}


