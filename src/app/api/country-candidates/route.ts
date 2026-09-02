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
    const agent = searchParams.get("agent") || "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize")) || 20));

    const scope = officeScope(session);

    // Country filter
    let countryWhere: any = {};
    if (/saudi/i.test(country)) {
      countryWhere = {
        OR: [
          { country: { contains: "Saudi" } },
          { candidate: { preferredCountry: { contains: "Saudi" } } },
        ],
      };
    } else if (/dubai|uae/i.test(country)) {
      countryWhere = {
        OR: [
          { country: { in: ["Dubai", "UAE", "United Arab Emirates"] } },
          { candidate: { preferredCountry: { in: ["Dubai", "UAE", "United Arab Emirates"] } } },
        ],
      };
    } else if (/^other( country)?$/i.test(country)) {
      countryWhere = {
        OR: [
          { country: { in: ["Other", "Other Country"] } },
          { candidate: { preferredCountry: { in: ["Other", "Other Country"] } } },
          {
            AND: [
              { country: { notIn: ["Saudi", "Saudi Arabia", "Dubai", "UAE", "United Arab Emirates"] } },
              { candidate: { preferredCountry: { notIn: ["Saudi", "Saudi Arabia", "Dubai", "UAE", "United Arab Emirates"] } } },
            ],
          },
        ],
      };
    } else {
      const clean = country.trim();
      countryWhere = {
        OR: [
          { country: { contains: clean } },
          { candidate: { preferredCountry: { contains: clean } } },
        ],
      };
    }

    const andClauses: any[] = [];

    if (stage && stage !== "all") {
      andClauses.push({ currentStage: stage });
    }

    if (status && status !== "all") {
      andClauses.push({ status: status });
    }

    if (officerId) {
      andClauses.push({ assignedToId: officerId });
    }

    if (agent && agent !== "all") {
      if (agent === "Direct") {
        andClauses.push({
          OR: [
            { agent: "Direct" },
            { agent: null },
            { agent: "" },
            { candidate: { source: "Direct" } },
            { candidate: { source: null } },
          ],
        });
      } else if (agent === "HAS_AGENT") {
        andClauses.push({
          OR: [
            { AND: [{ agent: { not: null } }, { agent: { not: "" } }, { agent: { not: "Direct" } }] },
            { AND: [{ candidate: { source: { not: null } } }, { candidate: { source: { not: "" } } }, { candidate: { source: { not: "Direct" } } }] },
          ],
        });
      } else {
        andClauses.push({
          OR: [
            { agent: { contains: agent } },
            { agent: agent },
            { candidate: { source: { contains: agent } } },
            { candidate: { source: agent } },
          ],
        });
      }
    }

    if (search) {
      andClauses.push({
        OR: [
          { fileNo: { contains: search } },
          { candidate: { fullName: { contains: search } } },
          { candidate: { candidateNo: { contains: search } } },
          { candidate: { phone: { contains: search } } },
          { candidate: { passportNo: { contains: search } } },
          { passport: { passportNumber: { contains: search } } },
          { company: { contains: search } },
          { profession: { contains: search } },
          { agent: { contains: search } },
          { candidate: { source: { contains: search } } },
        ],
      });
    }

    const where: any = {
      ...scope,
      ...countryWhere,
    };

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const [total, files, officers, agents, rawStats] = await Promise.all([
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
              source: true,
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
        where: { ...scope, status: "ACTIVE", agentId: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.agent.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          contactPerson: true,
          phone: true,
          email: true,
          address: true,
          country: true,
          status: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.processingFile.findMany({
        where,
        select: {
          currentStage: true,
          status: true,
          agent: true,
          candidate: { select: { source: true } },
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

    // Country Working Agents aggregation
    const agentMap = new Map<string, {
      id: string;
      code: string;
      name: string;
      contactPerson: string;
      phone: string;
      address: string;
      status: string;
      totalCandidates: number;
      activeCount: number;
      completedCount: number;
      totalPaid: number;
    }>();

    for (const item of rawStats) {
      if (/medical/i.test(item.currentStage)) inMedical++;
      if (/mofa|visa/i.test(item.currentStage)) inVisa++;
      if (/manpower/i.test(item.currentStage)) inManpower++;
      if (/flight/i.test(item.currentStage) || item.status === "COMPLETED") inFlight++;
      if (item.status === "HOLD" || /hold/i.test(item.currentStage)) inHold++;
      
      const filePaid = item.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      totalDeposited += filePaid;

      const rawAgent = (item.agent || item.candidate?.source || "Direct Office").trim();
      const isDirect = !rawAgent || /direct/i.test(rawAgent) || /walk-in|online|website|facebook|campaign/i.test(rawAgent);
      const matchedDb = isDirect
        ? null
        : agents.find(
            (a) =>
              a.name.toLowerCase() === rawAgent.toLowerCase() ||
              a.code.toLowerCase() === rawAgent.toLowerCase()
          );

      const key = isDirect ? "DIRECT_OFFICE" : matchedDb ? matchedDb.id : rawAgent;
      if (!agentMap.has(key)) {
        agentMap.set(key, {
          id: isDirect ? "DIRECT_OFFICE" : matchedDb?.id || key,
          code: isDirect ? "DIRECT" : matchedDb?.code || "AGT-REF",
          name: isDirect ? "Direct Office" : matchedDb?.name || rawAgent,
          contactPerson: isDirect ? "Head Office Desk" : matchedDb?.contactPerson || "Office Desk",
          phone: isDirect ? "+880 1700-000000" : matchedDb?.phone || "N/A",
          address: isDirect ? "Dhaka Head Office" : matchedDb?.address || matchedDb?.country || "Dhaka",
          status: matchedDb?.status || "Active",
          totalCandidates: 0,
          activeCount: 0,
          completedCount: 0,
          totalPaid: 0,
        });
      }

      const entry = agentMap.get(key)!;
      entry.totalCandidates += 1;
      if (item.status === "COMPLETED" || /flight/i.test(item.currentStage)) {
        entry.completedCount += 1;
      } else {
        entry.activeCount += 1;
      }
      entry.totalPaid += filePaid;
    }

    const countryAgents = Array.from(agentMap.values()).sort((a, b) => b.totalCandidates - a.totalCandidates);

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
        agent: file.agent || file.candidate?.source || "Direct",
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
      countryAgents,
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
        agents,
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
