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

  const [files, candidates] = await Promise.all([
    prisma.processingFile.findMany({
      select: {
        id: true,
        fileNo: true,
        agent: true,
        country: true,
        currentStage: true,
        status: true,
        candidateId: true,
        candidate: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            source: true,
          },
        },
      },
    }),
    prisma.candidate.findMany({
      select: {
        id: true,
        fullName: true,
        phone: true,
        source: true,
      },
    }),
  ]);

  const enrichedAgents = agents.map((agent) => {
    const agentName = (agent.name || "").toLowerCase().trim();
    const agentCode = (agent.code || "").toLowerCase().trim();

    // 1. Gather all unique candidate IDs referred by this agent
    const candidateIdsForAgent = new Set<string>();

    for (const c of candidates) {
      const src = (c.source || "").toLowerCase().trim();
      if (src && (src === agentName || src === agentCode)) {
        candidateIdsForAgent.add(c.id);
      }
    }

    for (const f of files) {
      const fAgent = (f.agent || "").toLowerCase().trim();
      const candSource = (f.candidate?.source || "").toLowerCase().trim();
      if (
        (fAgent && (fAgent === agentName || fAgent === agentCode)) ||
        (candSource && (candSource === agentName || candSource === agentCode))
      ) {
        if (f.candidate?.id) candidateIdsForAgent.add(f.candidate.id);
        if (f.candidateId) candidateIdsForAgent.add(f.candidateId);
      }
    }

    // 2. Gather all processing files associated with this agent or their candidates
    const agentFiles = files.filter((f) => {
      const fAgent = (f.agent || "").toLowerCase().trim();
      const candSource = (f.candidate?.source || "").toLowerCase().trim();
      return (
        (fAgent && (fAgent === agentName || fAgent === agentCode)) ||
        (candSource && (candSource === agentName || candSource === agentCode)) ||
        (f.candidateId && candidateIdsForAgent.has(f.candidateId))
      );
    });

    const totalCandidates = Math.max(candidateIdsForAgent.size, agentFiles.length);
    const activeDossiers = agentFiles.filter((f) => f.status === "ACTIVE" || (f.status as string) === "PROCESSING").length;
    const completedDossiers = agentFiles.filter((f) => f.status === "COMPLETED" || (f.currentStage || "").toLowerCase().includes("flight")).length;

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
      agreementKey: agent.agreementKey || "—",
      totalCandidates: agentFiles.length,
      activeDossiers,
      completedDossiers,
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
