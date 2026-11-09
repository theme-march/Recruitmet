import "server-only";
import { prisma } from "@/lib/prisma";
import type { getSession } from "@/lib/session";

type SessionData = NonNullable<Awaited<ReturnType<typeof getSession>>>;
import { officeScope } from "@/lib/authorization";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export type CandidateQueryOptions = {
  q?: string;
  country?: string;
  stage?: string;
  status?: string;
  interviewStatus?: string;
  page?: number;
  pageSize?: number;
};

export async function getCandidatesData(session: SessionData, options: CandidateQueryOptions = {}) {
  const q = (options.q ?? "").trim().toLowerCase();
  const country = (options.country ?? "").trim();
  const stage = (options.stage ?? "").trim();
  const status = (options.status ?? "").trim();
  const interviewStatus = (options.interviewStatus ?? "").trim();
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(options.pageSize) || 20));

  const [dbCountries, allCandidates, registeredAgents] = await Promise.all([
    prisma.country.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.candidate.findMany({
      where: officeScope(session),
      orderBy: { createdAt: "desc" },
      include: {
        phones: true,
        office: { select: { id: true, name: true } },
        files: {
          orderBy: { createdAt: "desc" },
          include: {
            assignedTo: { select: { id: true, name: true } },
            companyRecord: { select: { id: true, name: true } },
            payments: { select: { amount: true, status: true, type: true } },
            passport: { select: { passportNumber: true, verificationStatus: true, issueDate: true, expiryDate: true, issuingAuthority: true } },
            medical: { select: { result: true, center: true, testDate: true, expiryDate: true }, take: 1 },
            mofa: { select: { mofaNumber: true, status: true, submitDate: true, doneDate: true }, take: 1 },
            takamul: { select: { registrationNumber: true, certificateNumber: true, status: true, reportStatus: true }, take: 1 },
            biometrics: { select: { status: true, appointmentDate: true }, take: 1 },
            police: { select: { applicationNumber: true, result: true, status: true, issueDate: true, expiryDate: true }, take: 1 },
            visas: { select: { visaNumber: true, status: true, issueDate: true, expiryDate: true }, take: 1 },
            manpower: { select: { reference: true, status: true, company: true, profession: true, approvedAt: true }, take: 1 },
            flights: { select: { ticketNo: true, flown: true, baggage: true }, take: 1 },
          },
        },
        calls: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            assignedTo: { select: { id: true, name: true } },
          },
        },
        interviews: {
          orderBy: { scheduledAt: "desc" },
          take: 1,
          include: {
            schedule: { select: { id: true, title: true, company: true, profession: true } },
          },
        },
      },
    }),
    prisma.agent.findMany({
      select: { id: true, code: true, name: true },
    }),
  ]);

  const agentLookup = new Map<string, string>();
  for (const ag of registeredAgents) {
    if (ag.id) agentLookup.set(ag.id.toLowerCase().trim(), ag.id);
    if (ag.code) agentLookup.set(ag.code.toLowerCase().trim(), ag.id);
    if (ag.name) agentLookup.set(ag.name.toLowerCase().trim(), ag.id);
  }

  const activeCountryNames = [
    ...dbCountries.map((c) => c.name),
    "Other",
  ].filter((name, idx, arr) => arr.indexOf(name) === idx);

  const enriched = allCandidates.map((c) => {
    const activeFile = c.files[0];
    const latestCall = c.calls[0];
    const latestInterview = c.interviews[0];
    const callNotes = objectValue(latestCall?.notes);
    const interviewOptions = objectValue(callNotes.interview);
    const workOptions = objectValue(callNotes.work);

    const totalPaid = c.files.reduce((sum, f) => {
      const filePaid = f.payments
        .filter((p) => !p.status || ["PAID", "CONFIRMED", "COMPLETED", "PARTIAL"].includes(p.status))
        .reduce((pSum, p) => pSum + Number(p.amount), 0);
      return sum + filePaid;
    }, 0);

    const rawCountry = (activeFile?.country || c.preferredCountry || "").trim();
    const matchedDb = dbCountries.find(
      (dc) =>
        dc.name.toLowerCase() === rawCountry.toLowerCase() ||
        (/saudi/i.test(rawCountry) && /saudi/i.test(dc.name)) ||
        (/dubai|uae/i.test(rawCountry) && /dubai/i.test(dc.name))
    );
    const displayCountry = matchedDb ? matchedDb.name : rawCountry || "Other";

    const rawGross = (activeFile as any)?.contractPackage !== null && (activeFile as any)?.contractPackage !== undefined
      ? Number((activeFile as any).contractPackage)
      : (/dubai/i.test(rawCountry) ? 300000 : 350000);
    const discount = Number((activeFile as any)?.discount || 0);
    const packageCost = Math.max(0, rawGross - discount);
    const dueAmount = Math.max(0, packageCost - totalPaid);
    const packageTitle = (activeFile as any)?.packageTitle || null;
    const additionalPhones = c.phones.filter((p) => !p.isPrimary).map((p) => p.phone);
    const medicalResult = activeFile?.medical?.[0]?.result || null;
    const visaResult = activeFile?.visas?.[0]?.status || null;
    const manpowerResult = activeFile?.manpower?.[0]?.status || null;

    const agent = (activeFile?.agent && !/^(direct|direct walk-in)$/i.test(activeFile.agent))
      ? activeFile.agent
      : (c.source && !["Direct", "Walk-in", "Website"].includes(c.source))
        ? c.source
        : (activeFile?.agent || c.source || "Direct Office");

    const isDirect = /^(direct|direct walk-in|website|walk-in)$/i.test(agent.trim());
    const matchedAgentId = !isDirect ? (agentLookup.get(agent.trim().toLowerCase()) || null) : null;

    return {
      id: c.id,
      candidateNo: c.candidateNo,
      registrationNo: c.registrationNo || "—",
      fullName: c.fullName,
      phone: c.phone,
      additionalPhones,
      photo: c.photo || null,
      profileImageUrl: c.photo ? (/^https?:\/\//.test(c.photo) ? c.photo : `/api/candidates/${c.id}/photo?v=${c.updatedAt.getTime()}`) : null,
      email: c.email || "—",
      district: c.district || "—",
      address: c.address || "—",
      dob: c.dob ? c.dob.toISOString().split("T")[0] : "—",
      gender: c.gender || "—",
      maritalStatus: c.maritalStatus || "—",
      education: c.education || "—",
      experience: c.experience || "—",
      profession: activeFile?.profession || c.profession || "General Trade",
      preferredCountry: displayCountry,
      rawCountry,
      passportNo: c.passportNo || "—",
      nationalId: c.nationalId || "—",
      source: c.source || (latestCall?.source ? latestCall.source : "Direct"),
      agent,
      agentId: matchedAgentId,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      totalPaid,
      packageCost,
      discount,
      packageTitle,
      dueAmount,
      activeFile: activeFile
        ? {
            id: activeFile.id,
            fileNo: activeFile.fileNo,
            currentStage: activeFile.currentStage,
            status: activeFile.status,
            company: activeFile.company || activeFile.companyRecord?.name || "Almarai",
            officer: activeFile.assignedTo?.name || "Unassigned",
            agent: activeFile.agent || null,
            medicalResult,
            visaResult,
            manpowerResult,
            stageDetails: {
              "Passport Entry": {
                status: activeFile.passport?.verificationStatus || (activeFile.passport ? "Verified" : "Pending"),
                number: activeFile.passport?.passportNumber || c.passportNo || "—",
                issueDate: activeFile.passport?.issueDate ? activeFile.passport.issueDate.toISOString().split("T")[0] : "—",
                expiryDate: activeFile.passport?.expiryDate ? activeFile.passport.expiryDate.toISOString().split("T")[0] : "—",
                authority: activeFile.passport?.issuingAuthority || "DIP/DHAKA",
              },
              "Medical": {
                status: activeFile.medical?.[0]?.result ? "Completed" : "Pending",
                result: activeFile.medical?.[0]?.result || "Pending / In Progress",
                center: activeFile.medical?.[0]?.center || "Ibn Sina GCC Medical Center, Dhaka",
                testDate: activeFile.medical?.[0]?.testDate ? activeFile.medical[0].testDate.toISOString().split("T")[0] : "—",
                expiryDate: activeFile.medical?.[0]?.expiryDate ? activeFile.medical[0].expiryDate.toISOString().split("T")[0] : "—",
              },
              "MOFA": {
                status: activeFile.mofa?.[0]?.status || "Pending",
                mofaNumber: activeFile.mofa?.[0]?.mofaNumber || "—",
                submitDate: activeFile.mofa?.[0]?.submitDate ? activeFile.mofa[0].submitDate.toISOString().split("T")[0] : "—",
                doneDate: activeFile.mofa?.[0]?.doneDate ? activeFile.mofa[0].doneDate.toISOString().split("T")[0] : "—",
              },
              "Takamul": {
                status: activeFile.takamul?.[0]?.status || "Pending",
                reportStatus: activeFile.takamul?.[0]?.reportStatus || "Pending",
                certNo: activeFile.takamul?.[0]?.certificateNumber || "—",
                regNo: activeFile.takamul?.[0]?.registrationNumber || "—",
                profession: activeFile.profession || c.profession || "Electrician",
              },
              "Bio Finger": {
                status: activeFile.biometrics?.[0]?.status || "Pending",
                date: activeFile.biometrics?.[0]?.appointmentDate ? activeFile.biometrics[0].appointmentDate.toISOString().split("T")[0] : "Scheduled",
                center: "VFS Global / GCC Bio Center",
              },
              "Police Clearance": {
                status: activeFile.police?.[0]?.status || "Pending",
                result: activeFile.police?.[0]?.result || "Clear / Verified",
                appNo: activeFile.police?.[0]?.applicationNumber || "—",
                issueDate: activeFile.police?.[0]?.issueDate ? activeFile.police[0].issueDate.toISOString().split("T")[0] : "—",
                expiryDate: activeFile.police?.[0]?.expiryDate ? activeFile.police[0].expiryDate.toISOString().split("T")[0] : "—",
              },
              "First Payment": {
                status: totalPaid > 0 ? "Deposited" : "Pending",
                totalPaid: `৳ ${totalPaid.toLocaleString("en-IN")}`,
                dueAmount: `৳ ${dueAmount.toLocaleString("en-IN")}`,
                packageTitle: packageTitle || "General Work Visa",
              },
              "Visa Stamping": {
                status: activeFile.visas?.[0]?.status || "Visa Done",
                visaNumber: activeFile.visas?.[0]?.visaNumber || "—",
                issueDate: activeFile.visas?.[0]?.issueDate ? activeFile.visas[0].issueDate.toISOString().split("T")[0] : "—",
                expiryDate: activeFile.visas?.[0]?.expiryDate ? activeFile.visas[0].expiryDate.toISOString().split("T")[0] : "—",
              },
              "Second Payment": {
                status: dueAmount === 0 ? "Fully Paid" : "Pending / Due",
                totalPaid: `৳ ${totalPaid.toLocaleString("en-IN")}`,
                dueAmount: `৳ ${dueAmount.toLocaleString("en-IN")}`,
              },
              "Manpower": {
                status: activeFile.manpower?.[0]?.status || "Approved",
                smartCardNo: activeFile.manpower?.[0]?.reference || "—",
                company: activeFile.manpower?.[0]?.company || activeFile.company || "Almarai",
                approvedAt: activeFile.manpower?.[0]?.approvedAt ? activeFile.manpower[0].approvedAt.toISOString().split("T")[0] : "—",
              },
              "Ready For Flight": {
                status: activeFile.flights?.[0]?.ticketNo ? "Flight Ready" : "Pending",
                ticketNo: activeFile.flights?.[0]?.ticketNo || "—",
                baggage: activeFile.flights?.[0]?.baggage || "30 kg Check-in + 7 kg Cabin",
              },
              "Flight": {
                status: activeFile.flights?.[0]?.flown ? "Flown / Departed" : (activeFile.flights?.[0]?.ticketNo ? "Confirmed" : "Pending"),
                ticketNo: activeFile.flights?.[0]?.ticketNo || "—",
              },
            },
          }
        : null,
      latestCall: latestCall
        ? {
            id: latestCall.id,
            leadNo: latestCall.leadNo,
            status: latestCall.status,
            officer: latestCall.assignedTo?.name || "Unassigned",
            followUpAt: latestCall.followUpAt?.toISOString() || null,
          }
        : null,
      latestInterview: latestInterview
        ? {
            id: latestInterview.id,
            status: latestInterview.result || "Scheduled",
            scheduledAt: latestInterview.scheduledAt.toISOString(),
            title: latestInterview.schedule?.title || latestInterview.title || "Walk-in Interview",
            company: latestInterview.schedule?.company || latestInterview.company || "—",
            scheduleId: latestInterview.schedule?.id || latestInterview.scheduleId || null,
          }
        : null,
      interviewOptions: {
        interviewScheduleId: String(
          interviewOptions.scheduleId ?? latestInterview?.scheduleId ?? "",
        ),
        interviewSchedule: String(
          interviewOptions.scheduleTitle ?? latestInterview?.schedule?.title ?? "",
        ),
        interviewDate: String(
          interviewOptions.date ?? latestInterview?.scheduledAt?.toISOString() ?? "",
        ),
        workCategory: String(workOptions.category ?? latestCall?.workCategory ?? ""),
        workSubCategory: String(workOptions.subCategory ?? latestInterview?.profession ?? ""),
        company: String(
          workOptions.company ??
            latestCall?.company ??
            latestInterview?.schedule?.company ??
            latestInterview?.company ??
            "",
        ),
        interviewStatus: String(
          interviewOptions.status ?? latestInterview?.result ?? "",
        ),
        fileStatus: String(workOptions.fileStatus ?? ""),
      },
    };
  });

  const filtered = enriched.filter((row) => {
    if (q) {
      const match = [
        row.fullName,
        row.phone,
        row.candidateNo,
        row.passportNo,
        row.district,
        row.profession,
        row.preferredCountry,
        row.agent,
        row.source,
        row.activeFile?.fileNo || "",
        row.latestCall?.leadNo || "",
        ...row.additionalPhones,
      ].some((v) => v.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (country && country !== "All" && country !== "All Countries") {
      const target = country.trim().toLowerCase();
      const rowC = row.preferredCountry.toLowerCase();
      const rowRaw = row.rawCountry.toLowerCase();

      const match =
        rowC === target ||
        rowRaw === target ||
        (target.includes("saudi") && (rowC.includes("saudi") || rowRaw.includes("saudi"))) ||
        (target.includes("dubai") && (rowC.includes("dubai") || rowRaw.includes("dubai"))) ||
        (target.includes("other") && !/saudi|dubai|uae|emirates/i.test(rowC));

      if (!match) return false;
    }

    if (stage && stage !== "all" && stage !== "All Recruitment Stages" && stage !== "All Pipeline Stages") {
      if (stage === "No File") {
        if (row.activeFile) return false;
      } else {
        const normFilter = stage.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normCurrent = (row.activeFile?.currentStage || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!normCurrent.includes(normFilter) && !normFilter.includes(normCurrent)) {
          return false;
        }
      }
    }

    if (status && status.toLowerCase() !== "all") {
      const normStatus = status.trim().toUpperCase();
      const candStatus = (row.status || "").toUpperCase();
      const fileStatus = (row.activeFile?.status || "").toUpperCase();
      const fileStage = (row.activeFile?.currentStage || "").toLowerCase();

      let matchesStatus = false;
      if (normStatus === "ACTIVE") {
        matchesStatus =
          candStatus === "ACTIVE" ||
          candStatus === "VERIFIED" ||
          fileStatus === "ACTIVE" ||
          fileStatus === "PROCESSING";
      } else if (normStatus === "PENDING") {
        matchesStatus =
          candStatus === "PENDING" ||
          candStatus === "NEW" ||
          fileStatus === "PENDING" ||
          !row.activeFile;
      } else if (normStatus === "COMPLETED") {
        matchesStatus =
          candStatus === "COMPLETED" ||
          candStatus === "ARCHIVED" ||
          fileStatus === "COMPLETED" ||
          fileStatus === "DONE" ||
          fileStage.includes("flight");
      } else if (normStatus === "HOLD") {
        matchesStatus =
          candStatus === "HOLD" ||
          candStatus === "ON_HOLD" ||
          fileStatus === "HOLD" ||
          fileStage.includes("hold");
      } else if (normStatus === "RETURNED") {
        matchesStatus =
          candStatus === "RETURNED" ||
          candStatus === "REJECTED" ||
          fileStatus === "RETURNED" ||
          fileStatus === "CANCELLED" ||
          fileStage.includes("return");
      } else {
        matchesStatus = fileStatus === normStatus || candStatus === normStatus;
      }

      if (!matchesStatus) return false;
    }

    if (interviewStatus && interviewStatus !== "all") {
      if (row.latestInterview?.status !== interviewStatus) return false;
    }

    return true;
  });

  const countryScopeCandidates = country && country !== "All" && country !== "All Countries"
    ? enriched.filter((row) => {
        const target = country.trim().toLowerCase();
        const rowC = row.preferredCountry.toLowerCase();
        const rowRaw = row.rawCountry.toLowerCase();
        return (
          rowC === target ||
          rowRaw === target ||
          (target.includes("saudi") && (rowC.includes("saudi") || rowRaw.includes("saudi"))) ||
          (target.includes("dubai") && (rowC.includes("dubai") || rowRaw.includes("dubai"))) ||
          (target.includes("other") && !/saudi|dubai|uae|emirates/i.test(rowC))
        );
      })
    : enriched;

  const totalCandidates = countryScopeCandidates.length;
  const inProcessingFiles = countryScopeCandidates.filter((r) => Boolean(r.activeFile)).length;
  const withInterviews = countryScopeCandidates.filter((r) => Boolean(r.latestInterview)).length;
  const withoutFiles = countryScopeCandidates.filter((r) => !r.activeFile).length;

  const offset = (page - 1) * pageSize;

  const getCountrySpecificStages = (cName: string) => {
    const norm = (cName || "").trim().toLowerCase();
    if (!cName || norm === "all" || norm === "all countries") {
      return [
        "Passport Entry", "Medical", "MOFA", "Takamul", "Bio Finger", "Police Clearance",
        "First Payment", "Approval Application", "Visa Stamping", "Visa Hold", "Second Payment",
        "Manpower", "Ready For Flight", "Flight", "Hold File", "No File",
      ];
    }
    if (norm.includes("saudi") || norm.includes("ksa")) {
      return [
        "Passport Entry", "Medical", "MOFA", "Takamul", "Bio Finger", "Police Clearance",
        "First Payment", "Visa Stamping", "Visa Hold", "Second Payment", "Manpower",
        "Ready For Flight", "Flight", "Hold File", "No File",
      ];
    }
    if (norm.includes("dubai") || norm.includes("uae") || norm.includes("emirates")) {
      return [
        "Passport Entry", "Medical", "Police Clearance", "First Payment", "Approval Application",
        "Visa Stamping", "Visa Hold", "Second Payment", "Manpower", "Ready For Flight", "Flight",
        "Hold File", "No File",
      ];
    }
    return [
      "Passport Entry", "Medical", "Police Clearance", "First Payment", "Visa Stamping",
      "Visa Hold", "Second Payment", "Manpower", "Ready For Flight", "Flight", "Hold File", "No File",
    ];
  };

  return {
    data: filtered.slice(offset, offset + pageSize),
    summary: {
      totalCandidates,
      inProcessingFiles,
      withInterviews,
      withoutFiles,
    },
    filters: {
      countries: activeCountryNames,
      stages: getCountrySpecificStages(country),
    },
    meta: {
      page,
      pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    },
  };
}
