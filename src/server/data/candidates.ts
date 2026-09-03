import "server-only";
import { prisma } from "@/lib/prisma";
import type { getSession } from "@/lib/session";

type SessionData = NonNullable<Awaited<ReturnType<typeof getSession>>>;
import { officeScope } from "@/lib/authorization";

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

  const [dbCountries, allCandidates] = await Promise.all([
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
            passport: { select: { passportNumber: true, verificationStatus: true } },
            medical: { select: { result: true }, take: 1 },
            visas: { select: { visaNumber: true, status: true }, take: 1 },
            manpower: { select: { reference: true, status: true }, take: 1 },
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
  ]);

  const activeCountryNames = [
    ...dbCountries.map((c) => c.name),
    "Other",
  ].filter((name, idx, arr) => arr.indexOf(name) === idx);

  const enriched = allCandidates.map((c) => {
    const activeFile = c.files[0];
    const latestCall = c.calls[0];
    const latestInterview = c.interviews[0];

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

    const packageCost = /dubai/i.test(rawCountry) ? 300000 : 350000;
    const dueAmount = Math.max(0, packageCost - totalPaid);
    const additionalPhones = c.phones.filter((p) => !p.isPrimary).map((p) => p.phone);
    const medicalResult = activeFile?.medical?.[0]?.result || null;
    const visaResult = activeFile?.visas?.[0]?.status || null;
    const manpowerResult = activeFile?.manpower?.[0]?.status || null;

    return {
      id: c.id,
      candidateNo: c.candidateNo,
      registrationNo: c.registrationNo || "—",
      fullName: c.fullName,
      phone: c.phone,
      additionalPhones,
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
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      totalPaid,
      packageCost,
      dueAmount,
      activeFile: activeFile
        ? {
            id: activeFile.id,
            fileNo: activeFile.fileNo,
            currentStage: activeFile.currentStage,
            status: activeFile.status,
            company: activeFile.company || activeFile.companyRecord?.name || "Almarai",
            officer: activeFile.assignedTo?.name || "Unassigned",
            medicalResult,
            visaResult,
            manpowerResult,
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
          }
        : null,
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
