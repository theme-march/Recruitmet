import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateAgentSchema = z.object({
  action: z.string().optional(),
  name: z.string().min(2).optional(),
  contactPerson: z.string().nullable().optional(),
  phone: z.string().min(6).optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  address: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  status: z.enum(["Active", "Inactive", "Blocked"]).optional(),
  commissionRate: z.string().optional(),
  agreementKey: z.string().nullable().optional(),
  enablePortalLogin: z.boolean().optional(),
  portalEmail: z.string().email().nullable().optional().or(z.literal("")),
  portalPassword: z.string().optional().or(z.literal("")),
  candidateId: z.string().optional(),
  fileId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  price: z.union([z.number(), z.string()]).optional(),
  noteId: z.string().optional(),
  docId: z.string().optional(),
  docName: z.string().optional(),
  docType: z.string().optional(),
  docSize: z.string().optional(),
  fileData: z.string().optional(),
  payoutAmount: z.number().optional(),
  payoutNote: z.string().optional(),
  payoutMethod: z.string().optional(),
  // Interview Action Fields
  interviewId: z.string().optional(),
  interviewStatus: z.string().optional(),
  result: z.string().optional(),
  rating: z.union([z.number(), z.string()]).optional(),
  notes: z.string().optional(),
  // Candidate Payment Action Fields
  amount: z.union([z.number(), z.string()]).optional(),
  paymentType: z.string().optional(),
  paymentMethod: z.string().optional(),
  method: z.string().optional(),
  reference: z.string().optional(),
  collectedAt: z.string().optional(),
  paymentNote: z.string().optional(),
  documentUrl: z.string().optional(),
  fileName: z.string().optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const { id } = await params;

    let agent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      agent = await prisma.agent.findFirst({
        where: { code: id },
      });
    }

    if (!agent) {
      throw new AppError("NOT_FOUND", "Agent partner not found.", 404);
    }

    // 1. Fetch all files referred by this agent
    const files = await prisma.processingFile.findMany({
      where: {
        OR: [
          { agent: agent.name },
          { agent: agent.code },
          { candidate: { source: agent.name } },
          { candidate: { source: agent.code } },
        ],
      },
      include: {
        candidate: {
          select: {
            id: true,
            candidateNo: true,
            fullName: true,
            phone: true,
            passportNo: true,
            nationalId: true,
            preferredCountry: true,
            profession: true,
            district: true,
            status: true,
            createdAt: true,
            interviews: {
              include: {
                schedule: true,
              },
              orderBy: { scheduledAt: "desc" },
            },
          },
        },
        passport: { select: { passportNumber: true, expiryDate: true, verificationStatus: true } },
        medical: { select: { result: true, testDate: true, expiryDate: true }, take: 1, orderBy: { createdAt: "desc" } },
        police: { select: { applicationNumber: true, expiryDate: true, status: true }, take: 1, orderBy: { createdAt: "desc" } },
        visas: { select: { visaNumber: true, status: true, expiryDate: true }, take: 1, orderBy: { createdAt: "desc" } },
        manpower: { select: { reference: true, status: true }, take: 1, orderBy: { createdAt: "desc" } },
        flights: { select: { ticketNo: true, flight: { select: { flightNo: true, departureAt: true } } }, take: 1 },
        workflowEvents: { where: { stage: "AGENT_NOTE" }, orderBy: { createdAt: "desc" } },
        payments: {
          select: {
            id: true,
            paymentNo: true,
            amount: true,
            type: true,
            method: true,
            reference: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch all interviews associated with candidates of this agent
    const agentInterviews = await prisma.interview.findMany({
      where: {
        OR: [
          { candidate: { source: agent.name } },
          { candidate: { source: agent.code } },
          { candidate: { files: { some: { OR: [{ agent: agent.name }, { agent: agent.code }] } } } },
        ],
      },
      include: {
        schedule: true,
      },
      orderBy: { scheduledAt: "desc" },
    });

    // 3. Also fetch available candidates (for the "Link Candidate" modal search)
    const availableCandidates = await prisma.candidate.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        candidateNo: true,
        fullName: true,
        phone: true,
        passportNo: true,
        preferredCountry: true,
        profession: true,
        files: {
          select: {
            id: true,
            fileNo: true,
            country: true,
            currentStage: true,
            agent: true,
          },
          take: 1,
        },
      },
    });

    // 4. Calculate Country-wise breakdown & candidate ledger
    const countryMap: Record<
      string,
      { country: string; candidateCount: number; totalPackage: number; totalCollected: number; totalDue: number; totalAdvance: number; inProcess: number; completed: number }
    > = {};

    let grandTotalCollected = 0;
    let grandTotalPackage = 0;
    let grandTotalDue = 0;
    let grandTotalAdvance = 0;

    const normalizeCountry = (c: string) => /saudi/i.test(c) ? "Saudi Arabia" : /dubai|uae|emirates/i.test(c) ? "Dubai" : c || "Other Country";
    const getPackageCostForCountry = (c: string) => /dubai/i.test(c) ? 300000 : 350000;

    const candidateLedger = files.map((f) => {
      const isCompleted =
        f.status === "COMPLETED" ||
        f.currentStage === "Flight" ||
        f.flights.length > 0;

      const normCountry = normalizeCountry(f.country || f.candidate.preferredCountry || "Other");
      const candidatePackage = 350000; // Simplified default
      const candidatePaid = f.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const dueAmount = Math.max(0, candidatePackage - candidatePaid);
      const advanceAmount = Math.max(0, candidatePaid - candidatePackage);

      grandTotalCollected += candidatePaid;
      grandTotalPackage += candidatePackage;
      grandTotalDue += dueAmount;
      grandTotalAdvance += advanceAmount;

      if (!countryMap[normCountry]) {
        countryMap[normCountry] = {
          country: normCountry,
          candidateCount: 0,
          totalPackage: 0,
          totalCollected: 0,
          totalDue: 0,
          totalAdvance: 0,
          inProcess: 0,
          completed: 0,
        };
      }

      countryMap[normCountry].candidateCount += 1;
      countryMap[normCountry].totalPackage += candidatePackage;
      countryMap[normCountry].totalCollected += candidatePaid;
      countryMap[normCountry].totalDue += dueAmount;
      countryMap[normCountry].totalAdvance += advanceAmount;

      if (isCompleted) {
        countryMap[normCountry].completed += 1;
      } else {
        countryMap[normCountry].inProcess += 1;
      }

      const completionStatus = isCompleted ? "Completed" : "Incomplete";
      const completionNote = isCompleted
        ? (f.flights.length > 0 ? "✈️ Flight Scheduled / Done" : "✅ Visa Stamped & Approved")
        : `⏳ Stage: ${f.currentStage || "Passport Entry"}`;

      const latestInterview = f.candidate.interviews?.[0];
      const interviewStatus = latestInterview
        ? latestInterview.result === "Scheduled"
          ? "Waiting For Interview"
          : latestInterview.result
        : "Not Scheduled";

      // Evaluate Missing & Completed Documents
      const missingDocs: Array<{
        id: string;
        name: string;
        category: "PASSPORT" | "MEDICAL" | "POLICE" | "NID" | "VISA" | "MANPOWER" | "FLIGHT";
        stage: string;
        severity: "CRITICAL" | "HIGH" | "MEDIUM";
        reason: string;
        actionRequired: string;
      }> = [];

      const completedDocs: Array<{
        name: string;
        category: string;
        value: string;
        status: string;
      }> = [];

      // 1. Passport
      const passportNum = f.passport?.passportNumber || f.candidate.passportNo;
      if (!passportNum || passportNum === "N/A" || passportNum === "—") {
        missingDocs.push({
          id: "passport",
          name: "Original Passport Copy / Scan",
          category: "PASSPORT",
          stage: "Passport Entry",
          severity: "CRITICAL",
          reason: "Passport number or scan copy not entered in file.",
          actionRequired: "Collect original 10-year MRP/E-Passport copy from candidate.",
        });
      } else {
        completedDocs.push({
          name: "Passport",
          category: "PASSPORT",
          value: passportNum,
          status: f.passport?.verificationStatus || "Verified",
        });
      }

      // 2. GAMCA Medical Slip
      const med = f.medical[0];
      const hasMedical = Boolean(med?.result && med.result !== "Pending" && med.result !== "UNFIT");
      if (!hasMedical && f.currentStage !== "Passport Entry" && f.currentStage !== "Passport") {
        missingDocs.push({
          id: "medical",
          name: "GCC GAMCA Medical Fitness Certificate",
          category: "MEDICAL",
          stage: "Medical",
          severity: "CRITICAL",
          reason: med?.result === "Pending" ? "Medical test result still pending." : "GAMCA medical checkup slip/fit result missing.",
          actionRequired: "Ensure candidate completes GAMCA medical at authorized GCC center.",
        });
      } else if (hasMedical) {
        completedDocs.push({
          name: "GAMCA Medical",
          category: "MEDICAL",
          value: `Fit Result (${med?.result || "FIT"})`,
          status: "FIT",
        });
      }

      // 3. Police Clearance (PCC)
      const pcc = f.police[0];
      const hasPolice = Boolean(pcc?.applicationNumber || pcc?.status === "Clear" || pcc?.status === "Verified");
      const pccNeededStages = ["Police Clearance", "PCC", "Mofa", "Visa Stamping", "Manpower", "Flight"];
      if (!hasPolice && pccNeededStages.includes(f.currentStage)) {
        missingDocs.push({
          id: "police",
          name: "Police Clearance Certificate (PCC)",
          category: "POLICE",
          stage: "Police Clearance",
          severity: "HIGH",
          reason: "Police verification certificate / MOFA attested PCC missing.",
          actionRequired: "Submit candidate online police verification slip / SP office clearance.",
        });
      } else if (hasPolice) {
        completedDocs.push({
          name: "Police PCC",
          category: "POLICE",
          value: pcc?.applicationNumber || "PCC Verified",
          status: "Clear",
        });
      }

      // 4. National ID Card (NID)
      const nid = f.candidate.nationalId;
      if (!nid) {
        missingDocs.push({
          id: "nid",
          name: "National ID (NID / Smart Card)",
          category: "NID",
          stage: "Registration",
          severity: "MEDIUM",
          reason: "NID / Smart card number not provided during registration.",
          actionRequired: "Collect copy of 10 or 17 digit Bangladesh National ID card.",
        });
      } else {
        completedDocs.push({
          name: "National ID",
          category: "NID",
          value: nid,
          status: "Registered",
        });
      }

      // 5. Visa Stamped Copy
      const visa = f.visas[0];
      const hasVisa = Boolean(visa?.visaNumber && visa.visaNumber !== "Pending");
      const visaNeededStages = ["Mofa", "Visa Stamping", "E-Visa Stamping", "Manpower", "Flight"];
      if (!hasVisa && visaNeededStages.includes(f.currentStage)) {
        missingDocs.push({
          id: "visa",
          name: "Electronic Visa / Stamped Visa Copy",
          category: "VISA",
          stage: "Visa Stamping",
          severity: "HIGH",
          reason: "Embassy Visa Stamping / Dubai E-Visa permit copy not attached.",
          actionRequired: "Upload embassy stamped visa copy or labor entry permit.",
        });
      } else if (hasVisa) {
        completedDocs.push({
          name: "Visa Document",
          category: "VISA",
          value: visa?.visaNumber || "Stamped",
          status: "Stamped",
        });
      }

      // 6. BMET Smart Card
      const manpower = f.manpower?.[0];
      const hasManpower = Boolean(manpower?.reference || manpower?.status === "Issued" || manpower?.status === "Approved");
      if (!hasManpower && (f.currentStage === "Manpower" || f.currentStage === "Flight")) {
        missingDocs.push({
          id: "manpower",
          name: "BMET Manpower Emigration Smart Card",
          category: "MANPOWER",
          stage: "Manpower",
          severity: "HIGH",
          reason: "Bureau of Manpower, Employment and Training smart clearance card missing.",
          actionRequired: "Complete BMET fingerprint briefing and issue smart card.",
        });
      } else if (hasManpower) {
        completedDocs.push({
          name: "BMET Smart Card",
          category: "MANPOWER",
          value: manpower?.reference || "Issued",
          status: "Issued",
        });
      }

      // 7. Flight Ticket
      const flight = f.flights[0];
      const hasFlight = Boolean(flight?.ticketNo || flight?.flight?.flightNo);
      if (!hasFlight && f.currentStage === "Flight") {
        missingDocs.push({
          id: "flight",
          name: "Confirmed Air Flight E-Ticket",
          category: "FLIGHT",
          stage: "Flight",
          severity: "HIGH",
          reason: "Airlines confirmed booking ticket not attached.",
          actionRequired: "Book airline ticket and attach itinerary.",
        });
      } else if (hasFlight) {
        completedDocs.push({
          name: "Flight Ticket",
          category: "FLIGHT",
          value: flight?.ticketNo || flight?.flight?.flightNo || "Confirmed",
          status: "Booked",
        });
      }

      return {
        fileId: f.id,
        fileNo: f.fileNo,
        candidateId: f.candidate.id,
        candidateNo: f.candidate.candidateNo,
        fullName: f.candidate.fullName,
        phone: f.candidate.phone,
        passportNumber: passportNum || "N/A",
        country: normCountry,
        profession: f.profession || f.candidate.profession || "General Worker",
        currentStage: f.currentStage || "Passport",
        status: f.status,
        isCompleted,
        completionStatus,
        completionNote,
        missingDocs,
        missingDocsCount: missingDocs.length,
        completedDocs,
        hasMissingDocs: missingDocs.length > 0,
        documentStatus: missingDocs.length === 0 ? "Complete" : "Incomplete",
        interviewStatus,
        interviewRating: latestInterview?.rating || null,
        interviewDate: latestInterview?.scheduledAt?.toISOString() || null,
        interviewTitle: latestInterview?.schedule?.title || latestInterview?.title || null,
        interviewCompany: latestInterview?.schedule?.company || latestInterview?.company || null,
        passportVerification: f.passport?.verificationStatus || "Pending",
        passportExpiryDate: f.passport?.expiryDate ? f.passport.expiryDate.toISOString() : null,
        medicalResult: f.medical[0]?.result || "Pending",
        medicalExpiryDate: f.medical[0]?.expiryDate ? f.medical[0].expiryDate.toISOString() : null,
        medicalTestDate: f.medical[0]?.testDate ? f.medical[0].testDate.toISOString() : null,
        policeExpiryDate: f.police?.[0]?.expiryDate ? f.police[0].expiryDate.toISOString() : null,
        visaNumber: f.visas[0]?.visaNumber || "Pending",
        visaStatus: f.visas[0]?.status || "Pending",
        visaExpiryDate: f.visas[0]?.expiryDate ? f.visas[0].expiryDate.toISOString() : null,
        flightDate: f.flights[0]?.flight?.departureAt?.toISOString() || null,
        totalPackage: candidatePackage,
        totalPaid: candidatePaid,
        dueAmount,
        advanceAmount,
        notes: f.workflowEvents.map((w) => {
          const d = (w.data as Record<string, unknown>) || {};
          return {
            id: w.id,
            title: String(d.title || "Note"),
            description: String(d.description || ""),
            price: Number(d.price) || 0,
            fileName: d.fileName ? String(d.fileName) : null,
            fileSize: d.fileSize ? String(d.fileSize) : null,
            fileData: d.fileData ? String(d.fileData) : null,
            createdBy: w.completedBy || "Admin",
            createdAt: w.createdAt.toISOString(),
          };
        }),
        payments: f.payments.map((p) => ({
          id: p.id,
          paymentNo: p.paymentNo,
          amount: Number(p.amount),
          type: p.type,
          method: p.method || "Cash",
          reference: p.reference || "N/A",
          createdAt: p.createdAt.toISOString(),
        })),
        createdAt: f.createdAt.toISOString(),
      };
    });

    const countryBreakdown = Object.values(countryMap);

    const totalCandidates = files.length;
    const completedCount = candidateLedger.filter((c) => c.isCompleted).length;
    const incompleteCount = totalCandidates - completedCount;
    const completionPercentage = totalCandidates > 0 ? Math.round((completedCount / totalCandidates) * 100) : 0;
    const activeDossiers = files.filter((f) => f.status === "ACTIVE").length;
    const completedFlights = files.filter((f) => f.status === "COMPLETED" || f.currentStage === "Flight").length;
    const visaStamped = files.filter((f) => f.visas.length > 0).length;

    // Missing documents metric calculation
    const totalCandidatesWithMissingDocs = candidateLedger.filter((c) => c.hasMissingDocs).length;
    const totalCompleteDocsCandidates = totalCandidates - totalCandidatesWithMissingDocs;
    const totalMissingDocsCount = candidateLedger.reduce((sum, c) => sum + c.missingDocsCount, 0);
    const missingPassports = candidateLedger.filter((c) => (c.missingDocs || []).some((d: any) => d.category === "PASSPORT")).length;
    const missingMedicals = candidateLedger.filter((c) => (c.missingDocs || []).some((d: any) => d.category === "MEDICAL")).length;
    const missingPolices = candidateLedger.filter((c) => (c.missingDocs || []).some((d: any) => d.category === "POLICE")).length;
    const missingNids = candidateLedger.filter((c) => (c.missingDocs || []).some((d: any) => d.category === "NID")).length;
    const missingVisas = candidateLedger.filter((c) => (c.missingDocs || []).some((d: any) => d.category === "VISA")).length;

    // 5. Structure Interviews list
    const interviewList = files.map((f) => {
      const inv = f.candidate.interviews?.[0];
      const normResult = inv
        ? inv.result === "Scheduled"
          ? "Waiting For Interview"
          : inv.result
        : "Waiting For Interview";

      return {
        id: inv?.id || `inv-direct-${f.candidate.id}`,
        candidateId: f.candidate.id,
        candidateNo: f.candidate.candidateNo,
        fullName: f.candidate.fullName,
        phone: f.candidate.phone,
        passportNo: f.passport?.passportNumber || f.candidate.passportNo || "N/A",
        country: f.country || f.candidate.preferredCountry || "Saudi Arabia",
        scheduleId: inv?.scheduleId || null,
        scheduleTitle: inv?.schedule?.title || inv?.title || "Direct File Registration",
        company: inv?.schedule?.company || inv?.company || f.company || "General",
        profession: inv?.schedule?.profession || inv?.profession || f.profession || f.candidate.profession || "General Worker",
        scheduledAt: inv?.scheduledAt ? inv.scheduledAt.toISOString() : f.createdAt.toISOString(),
        venue: inv?.schedule?.venue || inv?.venue || "Office Interview Center",
        interviewer: inv?.schedule?.interviewer || inv?.interviewer || "Selection Officer",
        rating: inv?.rating ?? null,
        result: normResult,
        notes: inv?.notes || "",
        fileId: f.id,
        fileNo: f.fileNo,
        fileCurrentStage: f.currentStage || "Passport Entry",
        fileStatus: f.status,
      };
    });

    // 6. Calculate Interview Metrics
    const totalInterviewRegistrations = interviewList.length;
    const totalSelected = interviewList.filter((i) => /selected|passed|attended/i.test(i.result)).length;
    const totalWaiting = interviewList.filter((i) => /waiting|scheduled/i.test(i.result)).length;
    const totalRejected = interviewList.filter((i) => /reject/i.test(i.result)).length;
    const totalAbsent = interviewList.filter((i) => /absent|rescheduled/i.test(i.result)).length;
    const selectionRate = totalInterviewRegistrations > 0 ? Math.round((totalSelected / totalInterviewRegistrations) * 100) : 0;
    const inProcessFromInterview = interviewList.filter((i) => i.fileId && i.fileStatus !== "COMPLETED").length;

    // Parse commission rate & agent notes / documents
    const rule = (agent.commissionRule as Record<string, unknown>) || {};
    const rateString = String(rule?.rate || "৳ 25,000 / candidate");
    const numericRateMatch = rateString.replace(/[^0-9]/g, "");
    const perCandidateRate = numericRateMatch ? parseInt(numericRateMatch, 10) : 25000;
    const totalCommissionEarned = totalCandidates * perCandidateRate;

    const agentNotes = (rule.agentNotes as Array<{ id: string; title: string; content: string; tag?: string; author?: string; createdAt: string }>) || [
      {
        id: "NOTE-DEFAULT-1",
        title: "Agreed Deployment Terms & SLA",
        content: `Agency agreement active with ${agent.name}. Commission settled on candidate visa stamping & flight departure.`,
        tag: "Agreement",
        author: "Management",
        createdAt: agent.createdAt.toISOString(),
      },
    ];

    const documents = (rule.documents as Array<{ id: string; name: string; type: string; size: string; fileData?: string; uploadedBy?: string; createdAt: string }>) || [
      {
        id: "DOC-DEFAULT-1",
        name: `${agent.name.replace(/[^a-zA-Z0-9]/g, "_")}_Agency_Agreement.pdf`,
        type: "Agency Agreement Deed",
        size: "1.4 MB",
        uploadedBy: "Admin",
        createdAt: agent.createdAt.toISOString(),
      },
      {
        id: "DOC-DEFAULT-2",
        name: "Trade_License_Scan.pdf",
        type: "Trade License",
        size: "820 KB",
        uploadedBy: "Admin",
        createdAt: agent.createdAt.toISOString(),
      },
    ];

    const portalUser = await prisma.user.findFirst({
      where: {
        OR: [
          { agentId: agent.id },
          ...(agent.email ? [{ email: agent.email.toLowerCase().trim() }] : []),
        ],
      },
      select: {
        id: true,
        email: true,
        username: true,
        status: true,
        lastLoginAt: true,
      },
    }).catch(() => null);

    return NextResponse.json({
      data: {
        id: agent.id,
        code: agent.code,
        name: agent.name,
        contactPerson: agent.contactPerson || "N/A",
        phone: agent.phone || "N/A",
        email: agent.email || "N/A",
        address: agent.address || "Bangladesh",
        country: agent.country || "Dhaka",
        district: agent.country || "Dhaka",
        status: agent.status,
        commissionRate: rateString,
        agreementKey: agent.agreementKey || `AGR-${agent.code}`,
        hasPortalAccess: !!portalUser && portalUser.status === "ACTIVE",
        portalLoginEmail: portalUser?.email || agent.email || null,
        portalLastLoginAt: portalUser?.lastLoginAt ? new Date(portalUser.lastLoginAt).toISOString() : null,
        totalEarnedCommission: totalCommissionEarned,
        totalCandidateCount: totalCandidates,
        completedCandidateCount: completedCount,
        incompleteCandidateCount: incompleteCount,
        grandTotalCollected: grandTotalCollected,
        grandTotalPackage: grandTotalPackage,
        grandTotalDue: grandTotalDue,
        grandTotalAdvance: grandTotalAdvance,
        agentNotes,
        documents,
        createdAt: agent.createdAt.toISOString(),
        updatedAt: agent.updatedAt.toISOString(),
        metrics: {
          totalCandidates,
          completedCount,
          incompleteCount,
          completionPercentage,
          activeDossiers,
          completedFlights,
          visaStamped,
          totalPackage: grandTotalPackage,
          totalCollectedFromCandidates: grandTotalCollected,
          totalDue: grandTotalDue,
          totalAdvance: grandTotalAdvance,
          perCandidateRate,
          totalCommissionEarned,
          totalCandidatesWithMissingDocs,
          totalCompleteDocsCandidates,
          totalMissingDocsCount,
          missingPassports,
          missingMedicals,
          missingPolices,
          missingNids,
          missingVisas,
        },
        interviewMetrics: {
          totalRegistered: totalInterviewRegistrations,
          totalSelected,
          totalWaiting,
          totalRejected,
          totalAbsent,
          selectionRate,
          inProcessCount: inProcessFromInterview,
        },
        interviews: interviewList,
        countryBreakdown,
        candidates: candidateLedger,
        availableCandidates: availableCandidates.map((c) => ({
          id: c.id,
          candidateNo: c.candidateNo,
          fullName: c.fullName,
          phone: c.phone,
          passportNo: c.passportNo || "N/A",
          country: c.preferredCountry || "Saudi Arabia",
          profession: c.profession || "General",
          fileId: c.files[0]?.id || null,
          fileNo: c.files[0]?.fileNo || null,
          currentAgent: c.files[0]?.agent || null,
        })),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const { id } = await params;
    const body = await request.json();
    const input = updateAgentSchema.parse(body);

    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent) throw new AppError("NOT_FOUND", "Agent not found.", 404);

    const currentRule = (agent.commissionRule as Record<string, unknown>) || {};

    // 0. Update Candidate Interview Result & Notes
    if (input.action === "update-interview" && (input.interviewId || input.candidateId)) {
      const parsedRating = input.rating !== undefined && input.rating !== "" ? Number(input.rating) : undefined;
      const statusToSet = input.interviewStatus || input.result || "Waiting For Interview";

      let updatedInv;
      if (input.interviewId && !input.interviewId.startsWith("inv-direct-")) {
        updatedInv = await prisma.interview.update({
          where: { id: input.interviewId },
          data: {
            result: statusToSet,
            rating: parsedRating,
            notes: input.notes !== undefined ? input.notes : undefined,
          },
        });
      } else if (input.candidateId) {
        const existingInv = await prisma.interview.findFirst({
          where: { candidateId: input.candidateId },
        });

        if (existingInv) {
          updatedInv = await prisma.interview.update({
            where: { id: existingInv.id },
            data: {
              result: statusToSet,
              rating: parsedRating,
              notes: input.notes !== undefined ? input.notes : undefined,
            },
          });
        } else {
          updatedInv = await prisma.interview.create({
            data: {
              candidateId: input.candidateId,
              title: "Direct Agency Screening",
              company: "General",
              profession: "General Worker",
              scheduledAt: new Date(),
              result: statusToSet,
              rating: parsedRating,
              notes: input.notes !== undefined ? input.notes : undefined,
            },
          });
        }
      }

      // Sync back with WorkCall lead if exists
      if (updatedInv?.candidateId) {
        const lead = await prisma.workCall.findFirst({ where: { candidateId: updatedInv.candidateId } });
        if (lead) {
          const notesObj = lead.notes && typeof lead.notes === "object" && !Array.isArray(lead.notes) ? (lead.notes as Record<string, unknown>) : {};
          const interviewObj = notesObj.interview && typeof notesObj.interview === "object" && !Array.isArray(notesObj.interview) ? (notesObj.interview as Record<string, unknown>) : {};
          const workObj = notesObj.work && typeof notesObj.work === "object" && !Array.isArray(notesObj.work) ? (notesObj.work as Record<string, unknown>) : {};

          interviewObj.status = statusToSet;
          if (statusToSet === "Selected" || statusToSet === "Passed") {
            workObj.fileStatus = "Confirm";

            // If processing file not created yet, create it
            const existingFile = await prisma.processingFile.findFirst({
              where: { candidateId: updatedInv.candidateId },
            });

            if (!existingFile) {
              const isDubai = /sobha|dubai|uae/i.test(updatedInv.title || updatedInv.company || "");
              const country = isDubai ? "Dubai" : "Saudi Arabia";
              const fileNo = `FILE-${Math.floor(100000 + Math.random() * 900000)}`;

              const newFile = await prisma.processingFile.create({
                data: {
                  fileNo,
                  candidateId: updatedInv.candidateId,
                  country,
                  currentStage: "Passport Entry",
                  status: "ACTIVE",
                  profession: updatedInv.profession || lead?.workCategory || "General Worker",
                  company: updatedInv.company || "Saudi Binladen Group",
                  agent: agent.name,
                  assignedToId: session.userId,
                  officeId: session.user.officeId || null,
                },
              });

              workObj.processingFileId = newFile.id;
              workObj.fileNo = newFile.fileNo;
            }
          }

          await prisma.workCall.update({
            where: { id: lead.id },
            data: {
              notes: { ...notesObj, interview: interviewObj, work: workObj } as unknown as Prisma.InputJsonObject,
            },
          });
        }
      }

      return NextResponse.json({
        ok: true,
        message: `Interview status updated to "${statusToSet}" successfully!`,
        data: updatedInv,
      });
    }

    // 0.6. Record Candidate Payment Directly from Agent Profile
    if (input.action === "record-candidate-payment" && (input.fileId || input.candidateId)) {
      let fileId = input.fileId;
      let candidateId = input.candidateId;

      if (!fileId && candidateId) {
        const f = await prisma.processingFile.findFirst({
          where: { candidateId },
          orderBy: { createdAt: "desc" },
        });
        if (f) fileId = f.id;
      }

      if (!candidateId && fileId) {
        const f = await prisma.processingFile.findUnique({
          where: { id: fileId },
          select: { candidateId: true },
        });
        if (f) candidateId = f.candidateId;
      }

      if (!candidateId) {
        throw new AppError("BAD_REQUEST", "Candidate not found.", 400);
      }

      const numAmount = input.amount !== undefined ? Number(input.amount) : 0;
      if (numAmount <= 0) {
        throw new AppError("BAD_REQUEST", "Payment amount must be greater than 0.", 400);
      }

      const paymentType = input.paymentType?.trim() || input.title?.trim() || "Candidate Payment Deposit";
      const paymentMethod = input.paymentMethod || input.method || "Cash at Office";
      const reference = input.reference || `REC-${Date.now().toString().slice(-6)}`;
      const collectedDate = input.collectedAt ? new Date(input.collectedAt) : new Date();

      const newPayment = await prisma.payment.create({
        data: {
          paymentNo: `PAY-${Date.now().toString().slice(-8)}`,
          fileId: fileId || undefined,
          candidateId,
          type: paymentType,
          amount: numAmount,
          currency: "BDT",
          status: "PAID",
          method: paymentMethod,
          reference,
          collectedAt: collectedDate,
          collector: session.user.name || "Agent Accounts",
          note: input.paymentNote || input.description || `Collected via Agent ${agent.name}`,
        },
      });

      // If a receipt voucher file was uploaded, attach to document table
      if (input.documentUrl || input.fileData) {
        await prisma.document.create({
          data: {
            documentNo: `DOC-${Date.now().toString().slice(-8)}`,
            candidateId,
            fileId: fileId || undefined,
            type: "payment_voucher",
            fileName: input.fileName || `${paymentType}-Receipt.pdf`,
            url: input.documentUrl || input.fileData,
          },
        }).catch(() => {});
      }

      // If file exists, ensure it stays ACTIVE
      if (fileId) {
        await prisma.processingFile.update({
          where: { id: fileId },
          data: { status: "ACTIVE" },
        }).catch(() => {});
      }

      return NextResponse.json({
        ok: true,
        message: `Payment of ৳ ${numAmount.toLocaleString()} BDT (${paymentType}) recorded successfully!`,
        data: newPayment,
      });
    }

    // 1. Link / Assign a Candidate File to this Agent
    if (input.action === "link-candidate" && (input.fileId || input.candidateId)) {
      if (input.fileId) {
        await prisma.processingFile.update({
          where: { id: input.fileId },
          data: { agent: agent.name },
        });
      }
      if (input.candidateId) {
        await prisma.candidate.update({
          where: { id: input.candidateId },
          data: { source: agent.name },
        });
      }
      return NextResponse.json({
        ok: true,
        message: `Candidate file successfully assigned to Agent "${agent.name}"!`,
      });
    }

    // 2. Unlink a Candidate File from this Agent
    if (input.action === "unlink-candidate" && input.fileId) {
      await prisma.processingFile.update({
        where: { id: input.fileId },
        data: { agent: "Direct" },
      });
      return NextResponse.json({
        ok: true,
        message: `Candidate unlinked from Agent "${agent.name}".`,
      });
    }

    // 3. Create Candidate Note / Price Remarks
    if (input.action === "create-note" && input.fileId) {
      if (!input.title) throw new AppError("VALIDATION_ERROR", "Note title is required", 400);

      const parsedPrice = typeof input.price === "string" ? parseFloat(input.price.replace(/[^0-9.]/g, "")) : Number(input.price) || 0;

      await prisma.workflowEvent.create({
        data: {
          fileId: input.fileId,
          stage: "AGENT_NOTE",
          status: input.title.trim(),
          completedBy: session.user.name,
          data: {
            title: input.title.trim(),
            description: input.description?.trim() || "",
            price: parsedPrice,
            fileName: input.docName || null,
            fileSize: input.docSize || null,
            fileData: input.fileData || null,
            agentName: agent.name,
            createdAt: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        ok: true,
        message: `Note "${input.title}" added successfully for this candidate!`,
      });
    }

    // 4. Delete Candidate Note
    if (input.action === "delete-note" && input.noteId) {
      await prisma.workflowEvent.delete({
        where: { id: input.noteId },
      }).catch(() => {});

      return NextResponse.json({
        ok: true,
        message: "Note removed successfully.",
      });
    }

    // 5. Add Direct Agent Profile Note
    if (input.action === "add-agent-note") {
      if (!input.title && !input.description) throw new AppError("VALIDATION_ERROR", "Note title or description is required", 400);
      const existingNotes = (currentRule.agentNotes as Array<Record<string, unknown>>) || [];
      const newNote = {
        id: `NOTE-${Date.now()}`,
        title: input.title?.trim() || "Administrative Note",
        content: input.description?.trim() || "",
        tag: input.docType || "General",
        author: session.user.name,
        createdAt: new Date().toISOString(),
      };

      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          commissionRule: JSON.parse(JSON.stringify({
            ...currentRule,
            agentNotes: [newNote, ...existingNotes],
          })),
        },
      });

      return NextResponse.json({
        ok: true,
        message: "Agent profile note added successfully!",
      });
    }

    // 6. Delete Direct Agent Profile Note
    if (input.action === "delete-agent-note" && input.noteId) {
      const existingNotes = (currentRule.agentNotes as Array<{ id: string }>) || [];
      const filtered = existingNotes.filter((n) => n.id !== input.noteId);

      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          commissionRule: JSON.parse(JSON.stringify({
            ...currentRule,
            agentNotes: filtered,
          })),
        },
      });

      return NextResponse.json({
        ok: true,
        message: "Agent profile note deleted.",
      });
    }

    // 7. Upload Agent Document / File
    if (input.action === "upload-agent-document") {
      if (!input.docName) throw new AppError("VALIDATION_ERROR", "Document file name is required", 400);
      const existingDocs = (currentRule.documents as Array<Record<string, unknown>>) || [];
      const newDoc = {
        id: `DOC-${Date.now()}`,
        name: input.docName.trim(),
        type: input.docType || "Trade License",
        size: input.docSize || "1.2 MB",
        fileData: input.fileData || null,
        uploadedBy: session.user.name,
        createdAt: new Date().toISOString(),
      };

      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          commissionRule: JSON.parse(JSON.stringify({
            ...currentRule,
            documents: [newDoc, ...existingDocs],
          })),
        },
      });

      return NextResponse.json({
        ok: true,
        message: `Document "${input.docName}" uploaded successfully for agent!`,
      });
    }

    // 8. Delete Agent Document
    if (input.action === "delete-agent-document" && input.docId) {
      const existingDocs = (currentRule.documents as Array<{ id: string }>) || [];
      const filtered = existingDocs.filter((d) => d.id !== input.docId);

      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          commissionRule: JSON.parse(JSON.stringify({
            ...currentRule,
            documents: filtered,
          })),
        },
      });

      return NextResponse.json({
        ok: true,
        message: "Document removed successfully.",
      });
    }

    // 9. Regular Agent Details Update
    const updateData: Record<string, unknown> = {};
    if (input.name) updateData.name = input.name.trim();
    if (input.contactPerson !== undefined) updateData.contactPerson = input.contactPerson ? input.contactPerson.trim() : null;
    if (input.phone) updateData.phone = input.phone.trim();
    if (input.email !== undefined) updateData.email = input.email ? input.email.trim() : null;
    if (input.address !== undefined) updateData.address = input.address ? input.address.trim() : null;
    if (input.country !== undefined) updateData.country = input.country ? input.country.trim() : null;
    if (input.status) updateData.status = input.status;
    if (input.agreementKey !== undefined) updateData.agreementKey = input.agreementKey;
    if (input.commissionRate) {
      updateData.commissionRule = { ...currentRule, rate: input.commissionRate, type: "custom" };
    }

    const updated = await prisma.agent.update({
      where: { id },
      data: updateData,
    });

    // Update or create portal user login credentials if provided
    if (input.enablePortalLogin !== undefined || input.portalPassword || input.portalEmail) {
      const loginEmail = (input.portalEmail || input.email || agent.email || `${agent.code.toLowerCase()}@agent.orbit.com`).trim().toLowerCase();

      let agentRole = await prisma.role.findFirst({
        where: { OR: [{ name: "Agent Partner" }, { name: "Agent Portal" }, { name: "Agent" }] },
      });
      if (!agentRole) {
        agentRole = await prisma.role.create({
          data: {
            name: "Agent Partner",
            description: "Read-only access for agent partners to view their candidates and commissions.",
          },
        });
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: loginEmail },
            ...(agent.email ? [{ email: agent.email.toLowerCase().trim() }] : []),
          ],
        },
      });

      if (input.enablePortalLogin === false) {
        if (existingUser) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { status: "INACTIVE" },
          }).catch(() => {});
        }
      } else {
        const userUpdateData: Record<string, unknown> = {
          name: input.name?.trim() || agent.name,
          email: loginEmail,
          status: (input.status === "Inactive" || input.status === "Blocked") ? "INACTIVE" : "ACTIVE",
          roleId: agentRole.id,
        };

        if (input.portalPassword?.trim()) {
          userUpdateData.passwordHash = await bcrypt.hash(input.portalPassword.trim(), 10);
        }

        if (existingUser) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: userUpdateData,
          });
        } else {
          const rawPwd = input.portalPassword?.trim() || "Agent@2026";
          userUpdateData.passwordHash = await bcrypt.hash(rawPwd, 10);
          userUpdateData.username = `${agent.code.toLowerCase().replace(/[^a-z0-9]/g, "")}_agent`;
          await prisma.user.create({
            data: userUpdateData as any,
          });
        }
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        role: session.user.role.name,
        module: "Agents",
        recordId: updated.id,
        action: "UPDATE_AGENT",
        newValue: JSON.parse(JSON.stringify(updateData)),
        correlationId: crypto.randomUUID(),
      },
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      message: `Agent "${updated.name}" details updated successfully.`,
      data: updated,
    });
  } catch (error) {
    console.error("PATCH /api/agents/[id] error:", error);
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const { id } = await params;
    const existing = await prisma.agent.findUnique({ where: { id } });
    if (!existing) throw new AppError("NOT_FOUND", "Agent not found.", 404);

    await prisma.agent.delete({ where: { id } });

    return NextResponse.json({
      ok: true,
      message: `Agent "${existing.name}" removed successfully.`,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
