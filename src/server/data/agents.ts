import "server-only";
import { prisma } from "@/lib/prisma";

export type AgentQueryOptions = {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export async function getAgentsData(options: AgentQueryOptions = {}) {
  const q = (options.q || "").trim().toLowerCase();
  const status = options.status || "All";
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.max(1, Number(options.pageSize) || 50);

  let allAgents = await prisma.agent.findMany({
    orderBy: { createdAt: "desc" },
  });

  let agentUsers: any[] = [];
  try {
    agentUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        status: true,
        lastLoginAt: true,
      },
    });
  } catch {
    agentUsers = [];
  }

  const userByEmail = new Map<string, any>();
  agentUsers.forEach((u) => {
    if (u.email) userByEmail.set(u.email.toLowerCase().trim(), u);
  });

  const agents = allAgents;

  const files = await prisma.processingFile.findMany({
    select: {
      id: true,
      fileNo: true,
      agent: true,
      country: true,
      currentStage: true,
      status: true,
      candidate: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          source: true,
        },
      },
    },
  });

  const enrichedAgents = agents.map((agent) => {
    const agentFiles = files.filter(
      (f) =>
        (f.agent || "").toLowerCase().trim() === agent.name.toLowerCase().trim() ||
        (f.agent || "").toLowerCase().trim() === agent.code.toLowerCase().trim()
    );

    const activeDossiers = agentFiles.filter((f) => f.status === "ACTIVE" || (f.status as string) === "PROCESSING").length;
    const completedDossiers = agentFiles.filter((f) => f.status === "COMPLETED" || (f.currentStage || "").toLowerCase().includes("flight")).length;

    let commissionRate = "৳ 25,000 / candidate";
    if (agent.commissionRule && typeof agent.commissionRule === "object") {
      const rule = agent.commissionRule as any;
      commissionRate = rule.rate || rule.value || `${rule.amount || 25000} BDT`;
    }

    const estimatedCommission = completedDossiers * 25000;
    const portalUser = agent.email ? userByEmail.get(agent.email.toLowerCase().trim()) : null;

    return {
      id: agent.id,
      code: agent.code,
      name: agent.name,
      contactPerson: agent.contactPerson || "—",
      phone: agent.phone || "—",
      email: agent.email || "—",
      district: agent.country || agent.address || "Dhaka",
      address: agent.address || "—",
      status: agent.status,
      commissionRate,
      agreementKey: agent.agreementKey || "—",
      totalCandidates: agentFiles.length,
      activeDossiers,
      completedDossiers,
      estimatedCommission,
      hasPortalAccess: Boolean(portalUser),
      portalUsername: portalUser?.username || null,
      portalUserStatus: portalUser?.status || null,
      portalLastLoginAt: portalUser?.lastLoginAt ? portalUser.lastLoginAt.toISOString() : null,
      createdAt: agent.createdAt.toISOString(),
    };
  });

  let filtered = enrichedAgents.filter((agent) => {
    if (status !== "All" && agent.status.toLowerCase() !== status.toLowerCase()) {
      return false;
    }
    if (q) {
      return (
        agent.name.toLowerCase().includes(q) ||
        agent.code.toLowerCase().includes(q) ||
        (agent.phone || "").toLowerCase().includes(q) ||
        agent.email.toLowerCase().includes(q) ||
        agent.contactPerson.toLowerCase().includes(q) ||
        agent.district.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stats = {
    totalAgents: enrichedAgents.length,
    activeAgents: enrichedAgents.filter((a) => a.status === "Active").length,
    totalReferredCandidates: enrichedAgents.reduce((sum, a) => sum + a.totalCandidates, 0),
    activeDossiers: enrichedAgents.reduce((sum, a) => sum + a.activeDossiers, 0),
  };

  const offset = (page - 1) * pageSize;
  const paginated = filtered.slice(offset, offset + pageSize);

  return {
    data: paginated,
    stats,
    meta: {
      page,
      pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    },
  };
}
