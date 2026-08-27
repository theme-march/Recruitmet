import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { officeScope } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") || "Saudi";
    const stage = searchParams.get("stage") || "";
    const status = searchParams.get("status") || "";
    const search = (searchParams.get("search") || "").trim();
    const officerId = searchParams.get("officer") || "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize")) || 20));

    const scope = officeScope(session);

    // Country filter
    let countryWhere: any = {};
    if (/saudi/i.test(country)) {
      countryWhere = { contains: "Saudi" };
    } else if (/dubai|uae/i.test(country)) {
      countryWhere = { in: ["Dubai", "UAE", "United Arab Emirates"] };
    } else {
      countryWhere = { notIn: ["Saudi", "Saudi Arabia", "Dubai", "UAE", "United Arab Emirates"] };
    }

    const where: any = {
      ...scope,
      country: countryWhere,
    };

    if (stage && stage !== "all") {
      where.currentStage = stage;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (officerId) {
      where.assignedToId = officerId;
    }

    if (search) {
      where.OR = [
        { fileNo: { contains: search } },
        { candidate: { fullName: { contains: search } } },
        { candidate: { candidateNo: { contains: search } } },
        { candidate: { phone: { contains: search } } },
        { candidate: { passportNo: { contains: search } } },
        { passport: { passportNumber: { contains: search } } },
        { company: { contains: search } },
        { profession: { contains: search } },
      ];
    }

    const [total, files, officers, rawStats] = await Promise.all([
      prisma.processingFile.count({ where }),
      prisma.processingFile.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          candidate: {
            select: {
              fullName: true,
              candidateNo: true,
              phone: true,
              passportNo: true,
              district: true,
              dob: true,
              profession: true,
            },
          },
          passport: {
            select: {
              passportNumber: true,
              expiryDate: true,
            },
          },
          visas: {
            select: {
              visaNumber: true,
              status: true,
            },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
          medical: {
            select: {
              result: true,
            },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
          payments: {
            select: {
              amount: true,
              type: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
          office: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.user.findMany({
        where: { ...scope, status: "ACTIVE" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.processingFile.findMany({
        where: { ...scope, country: countryWhere },
        select: {
          currentStage: true,
          status: true,
          payments: { select: { amount: true } },
        },
      }),
    ]);

    // KPI Metrics calculation
    let totalDeposited = 0;
    let inMedical = 0;
    let inVisa = 0;
    let inManpower = 0;
    let inFlight = 0;
    let inHold = 0;

    for (const item of rawStats) {
      if (/medical/i.test(item.currentStage)) inMedical++;
      if (/mofa|visa/i.test(item.currentStage)) inVisa++;
      if (/manpower/i.test(item.currentStage)) inManpower++;
      if (/flight/i.test(item.currentStage) || item.status === "COMPLETED") inFlight++;
      if (item.status === "HOLD" || /hold/i.test(item.currentStage)) inHold++;
      for (const p of item.payments) {
        totalDeposited += Number(p.amount) || 0;
      }
    }

    const rows = files.map((file) => {
      const paid = file.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const totalCost = /dubai/i.test(file.country) ? 300000 : 350000;
      const balance = Math.max(0, totalCost - paid);

      const dob = file.candidate?.dob;
      const age = dob ? Math.max(0, Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000)) : null;

      return {
        id: file.id,
        fileNo: file.fileNo,
        candidateNo: file.candidate?.candidateNo || "N/A",
        name: file.candidate?.fullName || "Unnamed Candidate",
        phone: file.candidate?.phone || "N/A",
        passportNumber: file.passport?.passportNumber || file.candidate?.passportNo || "N/A",
        passportExpiry: file.passport?.expiryDate ? file.passport.expiryDate.toISOString() : null,
        district: file.candidate?.district || "Dhaka",
        age,
        profession: file.profession || file.candidate?.profession || "General Worker",
        company: file.company || "N/A",
        country: file.country,
        currentStage: file.currentStage,
        status: file.status,
        visaNumber: file.visas?.[0]?.visaNumber || null,
        visaStatus: file.visas?.[0]?.status || null,
        medicalResult: file.medical?.[0]?.result || null,
        totalPaid: paid,
        totalPackage: totalCost,
        balanceDue: balance,
        officerName: file.assignedTo?.name || "Unassigned",
        officeName: file.office?.name || "Main Branch",
        updatedAt: file.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      data: rows,
      stats: {
        totalCandidates: rawStats.length,
        inMedical,
        inVisa,
        inManpower,
        inFlight,
        inHold,
        totalDeposited,
      },
      filters: {
        officers,
      },
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
