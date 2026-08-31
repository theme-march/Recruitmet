import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Dashboard, type DashboardData } from "@/components/dashboard";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export default async function Page() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [
    totalLeads,
    dueToday,
    overdue,
    scheduledInterviewsCount,
    converted,
    recentCalls,
    processingFiles,
    payments,
    interviewSchedules,
  ] = await Promise.all([
    prisma.workCall.count(),
    prisma.workCall.count({
      where: {
        followUpAt: { gte: startOfToday, lte: endOfToday },
        status: { notIn: ["Converted", "Closed", "Not Interested"] },
      },
    }),
    prisma.workCall.count({
      where: {
        followUpAt: { lt: startOfToday },
        status: { notIn: ["Converted", "Closed", "Not Interested"] },
      },
    }),
    prisma.interviewSchedule.count({
      where: { scheduledAt: { gte: startOfToday } },
    }),
    prisma.workCall.count({
      where: { status: "Converted" },
    }),
    prisma.workCall.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        leadNo: true,
        fullName: true,
        phone: true,
        country: true,
        workCategory: true,
        priority: true,
        status: true,
        followUpAt: true,
        createdAt: true,
      },
    }),
    prisma.processingFile.findMany({
      orderBy: { updatedAt: "desc" },
      take: 500,
      include: {
        candidate: true,
        passport: true,
        visas: true,
        manpower: true,
        companyRecord: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.payment.findMany({
      select: { amount: true, status: true },
    }),
    prisma.interviewSchedule.findMany({
      take: 4,
      orderBy: { scheduledAt: "asc" },
      include: {
        interviews: true,
      },
    }),
  ]);

  // Compute live financial summaries
  const totalCollected = payments
    .filter((p) => !p.status || ["PAID", "CONFIRMED", "COMPLETED", "PARTIAL"].includes(p.status))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  let totalContractPackage = 0;
  let totalDue = 0;
  let totalAdvance = 0;

  // Compute stage breakdown counts
  const stageCounts = {
    workCall: totalLeads,
    passport: 0,
    medical: 0,
    police: 0,
    takamul: 0,
    visa: 0,
    manpower: 0,
    flight: 0,
  };

  // Country counts
  const countryBreakdown = {
    saudi: { count: 0, inProcess: 0, completed: 0 },
    dubai: { count: 0, inProcess: 0, completed: 0 },
    other: { count: 0, inProcess: 0, completed: 0 },
  };

  let visasProcessing = 0;
  let manpowerCompleted = 0;
  let flightsReady = 0;

  const activeProcessingFiles = processingFiles.map((file) => {
    const rawCountry = file.country || "";
    const isDubai = /dubai|uae|emirates/i.test(rawCountry);
    const isSaudi = /saudi|ksa/i.test(rawCountry);
    const normalizedCountry = isSaudi ? "Saudi Arabia" : isDubai ? "Dubai" : "Other Country";

    const packageCost = isDubai ? 300000 : 350000;
    const paid = file.payments
      .filter((p) => !p.status || ["PAID", "CONFIRMED", "COMPLETED", "PARTIAL"].includes(p.status))
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const dueAmount = Math.max(0, packageCost - paid);
    const advanceAmount = Math.max(0, paid - packageCost);

    totalContractPackage += packageCost;
    totalDue += dueAmount;
    totalAdvance += advanceAmount;

    // Categorize country counts
    if (isSaudi) {
      countryBreakdown.saudi.count++;
      if (file.currentStage === "flight" || file.status === "COMPLETED") countryBreakdown.saudi.completed++;
      else countryBreakdown.saudi.inProcess++;
    } else if (isDubai) {
      countryBreakdown.dubai.count++;
      if (file.currentStage === "flight" || file.status === "COMPLETED") countryBreakdown.dubai.completed++;
      else countryBreakdown.dubai.inProcess++;
    } else {
      countryBreakdown.other.count++;
      if (file.currentStage === "flight" || file.status === "COMPLETED") countryBreakdown.other.completed++;
      else countryBreakdown.other.inProcess++;
    }

    // Stage counts
    const st = (file.currentStage || "").toLowerCase();
    if (st.includes("passport")) stageCounts.passport++;
    else if (st.includes("medical")) stageCounts.medical++;
    else if (st.includes("police")) stageCounts.police++;
    else if (st.includes("takamul")) stageCounts.takamul++;
    else if (st.includes("visa")) {
      stageCounts.visa++;
      visasProcessing++;
    } else if (st.includes("manpower")) {
      stageCounts.manpower++;
      manpowerCompleted++;
    } else if (st.includes("flight")) {
      stageCounts.flight++;
      flightsReady++;
    } else {
      stageCounts.passport++;
    }

    const companyName = file.company || file.companyRecord?.name || file.manpower?.[0]?.company || "Almarai";
    const professionName = file.profession || file.visas?.[0]?.profession || file.candidate?.profession || file.manpower?.[0]?.profession || "Driver";

    return {
      id: file.id,
      fileNo: file.fileNo,
      candidateName: file.candidate.fullName,
      candidateNo: file.candidate.candidateNo,
      phone: file.candidate.phone,
      passport: file.passport?.passportNumber ?? file.candidate.passportNo ?? "Not entered",
      country: normalizedCountry,
      profession: professionName,
      company: companyName,
      stage: file.currentStage,
      status: file.status,
      paid,
      packageCost,
      dueAmount,
      advanceAmount,
      updatedAt: file.updatedAt.toISOString(),
    };
  });

  const upcomingInterviews = interviewSchedules.map((item) => ({
    id: item.id,
    title: item.title,
    company: item.company || "Almarai Group",
    profession: item.profession || "General Trade",
    scheduledAt: item.scheduledAt.toISOString(),
    venue: item.venue || "Dhaka Head Office",
    candidateCount: item.interviews.length,
    status: item.status,
  }));

  // Construct urgent alerts
  const actionAlerts = [
    ...(overdue > 0
      ? [
          {
            id: "alert-overdue-calls",
            type: "overdue_call" as const,
            title: `${overdue} Overdue Candidate Calls`,
            subtitle: "Follow-up phone calls requiring immediate officer action",
            timeAgo: "Needs Attention",
            actionUrl: "/module/call-center/work-call-list",
            urgency: "high" as const,
          },
        ]
      : []),
    ...(dueToday > 0
      ? [
          {
            id: "alert-due-today",
            type: "overdue_call" as const,
            title: `${dueToday} Scheduled Calls Today`,
            subtitle: "Candidate appointment reminders queued for today",
            timeAgo: "Today",
            actionUrl: "/module/call-center/work-call-list",
            urgency: "medium" as const,
          },
        ]
      : []),
    {
      id: "alert-documents-check",
      type: "medical_pending" as const,
      title: "Active Candidate Document Verification",
      subtitle: `${processingFiles.length} candidate dossiers in verification stream`,
      timeAgo: "Active",
      actionUrl: "/dashboard/document",
      urgency: "low" as const,
    },
  ];

  const data: DashboardData = {
    userName: session.user.name,
    officeName: session.user.office?.name ?? "Dhaka Head Office",
    metrics: {
      totalLeads,
      totalFiles: processingFiles.length,
      dueToday,
      overdue,
      scheduledInterviews: scheduledInterviewsCount,
      converted,
      totalCollected,
      totalDue,
      totalAdvance,
      visasProcessing,
      manpowerCompleted,
      flightsReady,
    },
    stageCounts,
    countryBreakdown,
    recentCalls: recentCalls.map((c) => ({
      id: c.id,
      leadNo: c.leadNo,
      fullName: c.fullName,
      phone: c.phone,
      country: c.country ?? "—",
      workCategory: c.workCategory ?? "—",
      priority: c.priority,
      status: c.status,
      followUpAt: c.followUpAt ? c.followUpAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    })),
    activeProcessingFiles: activeProcessingFiles.slice(0, 8),
    upcomingInterviews,
  };

  return <Dashboard data={data} />;
}


