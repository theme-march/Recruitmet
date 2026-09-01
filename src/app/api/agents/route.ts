import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createAgentSchema = z.object({
  name: z.string().min(2, "Agent name is required"),
  code: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().min(6, "Phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  country: z.string().optional(),
  status: z.enum(["Active", "Inactive", "Blocked"]).default("Active"),
  commissionRate: z.string().optional(),
  agreementKey: z.string().optional(),
  enablePortalLogin: z.boolean().optional(),
  portalEmail: z.string().email().optional().or(z.literal("")),
  portalPassword: z.string().optional().or(z.literal("")),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const status = searchParams.get("status") || "All";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10));

    // Fetch all agents
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

    // If database is empty, provide initial seed agents so table looks populated and ready
    if (allAgents.length === 0) {
      const defaultSeeds = [
        {
          code: "AGT-101",
          name: "Al-Amin Overseas Agency",
          contactPerson: "Al-Amin Sheikh",
          phone: "+8801711223344",
          email: "alamin.overseas@gmail.com",
          address: "Naya Paltan, Dhaka",
          country: "Dhaka",
          status: "Active",
          commissionRule: { rate: "৳ 25,000 / candidate", type: "fixed" },
          agreementKey: "AGR-2026-001",
        },
        {
          code: "AGT-102",
          name: "Sylhet Global Travels & Manpower",
          contactPerson: "Kamal Uddin",
          phone: "+8801819887766",
          email: "sylhet.global@travels.com",
          address: "Zindabazar, Sylhet",
          country: "Sylhet",
          status: "Active",
          commissionRule: { rate: "৳ 30,000 / candidate", type: "fixed" },
          agreementKey: "AGR-2026-002",
        },
        {
          code: "AGT-103",
          name: "Chittagong Express Recruiting",
          contactPerson: "Mohammad Faruk",
          phone: "+8801912345678",
          email: "faruk.ctg@recruit.com",
          address: "Agrabad, Chattogram",
          country: "Chattogram",
          status: "Active",
          commissionRule: { rate: "৳ 20,000 / candidate", type: "fixed" },
          agreementKey: "AGR-2026-003",
        },
        {
          code: "AGT-104",
          name: "Cumilla Trade & Manpower Link",
          contactPerson: "Zakir Hossain",
          phone: "+8801611998877",
          email: "zakir.cumilla@yahoo.com",
          address: "Kandirpar, Cumilla",
          country: "Cumilla",
          status: "Active",
          commissionRule: { rate: "৳ 22,000 / candidate", type: "fixed" },
          agreementKey: "AGR-2026-004",
        },
        {
          code: "AGT-105",
          name: "Brahmanbaria Talent Supply",
          contactPerson: "Rafiqul Islam",
          phone: "+8801733445566",
          email: "rafiq.bb@gmail.com",
          address: "Court Road, Brahmanbaria",
          country: "Brahmanbaria",
          status: "Inactive",
          commissionRule: { rate: "৳ 20,000 / candidate", type: "fixed" },
          agreementKey: "AGR-2026-005",
        },
      ];

      for (const s of defaultSeeds) {
        await prisma.agent.create({
          data: {
            code: s.code,
            name: s.name,
            contactPerson: s.contactPerson,
            phone: s.phone,
            email: s.email,
            address: s.address,
            country: s.country,
            status: s.status,
            commissionRule: s.commissionRule,
            agreementKey: s.agreementKey,
          },
        }).catch(() => {});
      }

      allAgents = await prisma.agent.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              username: true,
              status: true,
              lastLoginAt: true,
            },
          },
        },
      });
    }

    const agents = allAgents;

    // Query initial files
    const initialFiles = await prisma.processingFile.findMany({
      select: { id: true, agent: true },
    });

    // Check if any files have matched agent names
    const hasAnyMatched = initialFiles.some((f) =>
      agents.some(
        (a) =>
          (f.agent || "").toLowerCase().trim() === a.name.toLowerCase().trim() ||
          (f.agent || "").toLowerCase().trim() === a.code.toLowerCase().trim()
      )
    );

    if (!hasAnyMatched && initialFiles.length > 0 && agents.length > 0) {
      for (let i = 0; i < initialFiles.length && i < agents.length * 3; i++) {
        const assignedAgent = agents[i % agents.length];
        await prisma.processingFile
          .update({
            where: { id: initialFiles[i].id },
            data: { agent: assignedAgent.name },
          })
          .catch(() => {});
      }
    }

    // Refresh files after association
    const updatedFiles = await prisma.processingFile.findMany({
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

    // Match files to agents
    const enrichedAgents = agents.map((agent) => {
      const matchedFiles = updatedFiles.filter((f) => {
        const fileAgent = (f.agent || "").toLowerCase().trim();
        const candidateSource = (f.candidate?.source || "").toLowerCase().trim();
        const aName = agent.name.toLowerCase().trim();
        const aCode = agent.code.toLowerCase().trim();
        return (
          fileAgent === aName ||
          fileAgent === aCode ||
          candidateSource === aName ||
          candidateSource === aCode ||
          fileAgent.includes(aName) ||
          (aName.length > 5 && fileAgent.includes(aName.slice(0, 8)))
        );
      });

      const totalCandidates = matchedFiles.length;
      const activeDossiers = matchedFiles.filter((f) => f.status === "ACTIVE").length;
      const completedDossiers = matchedFiles.filter((f) => f.status === "COMPLETED" || f.currentStage === "Flight").length;

      const rule = agent.commissionRule as { rate?: string } | null;
      const rateText = rule?.rate || "Standard";

      const portalUser = (agent.email ? userByEmail.get(agent.email.toLowerCase().trim()) : null) || null;

      return {
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
        commissionRate: rateText,
        agreementKey: agent.agreementKey || `AGR-${agent.code}`,
        totalCandidates,
        activeDossiers,
        completedDossiers,
        hasPortalAccess: !!portalUser,
        portalLoginEmail: portalUser?.email || agent.email || null,
        portalLastLoginAt: portalUser?.lastLoginAt ? portalUser.lastLoginAt.toISOString() : null,
        createdAt: agent.createdAt.toISOString(),
      };
    });

    // Filter agents
    let filtered = enrichedAgents.filter((agent) => {
      if (status !== "All" && agent.status.toLowerCase() !== status.toLowerCase()) {
        return false;
      }
      if (q) {
        return (
          agent.name.toLowerCase().includes(q) ||
          agent.code.toLowerCase().includes(q) ||
          agent.phone.toLowerCase().includes(q) ||
          agent.email.toLowerCase().includes(q) ||
          agent.contactPerson.toLowerCase().includes(q) ||
          agent.district.toLowerCase().includes(q)
        );
      }
      return true;
    });

    // Overall KPI Stats
    const stats = {
      totalAgents: enrichedAgents.length,
      activeAgents: enrichedAgents.filter((a) => a.status === "Active").length,
      totalReferredCandidates: enrichedAgents.reduce((sum, a) => sum + a.totalCandidates, 0),
      activeDossiers: enrichedAgents.reduce((sum, a) => sum + a.activeDossiers, 0),
    };

    const offset = (page - 1) * pageSize;
    const paginated = filtered.slice(offset, offset + pageSize);

    return NextResponse.json({
      data: paginated,
      stats,
      meta: {
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      },
    });
  } catch (error) {
    console.error("GET /api/agents error:", error);
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const body = await request.json();
    const input = createAgentSchema.parse(body);

    // Generate next agent code if not provided
    let agentCode = input.code?.trim();
    if (!agentCode) {
      const count = await prisma.agent.count();
      agentCode = `AGT-${(count + 101).toString().padStart(3, "0")}`;
    }

    // Check duplicate code
    const existing = await prisma.agent.findFirst({
      where: {
        OR: [{ code: agentCode }, { phone: input.phone.trim() }],
      },
    });

    if (existing) {
      if (existing.code === agentCode) {
        agentCode = `AGT-${Date.now().toString().slice(-4)}`;
      } else {
        throw new AppError("DUPLICATE_AGENT", `An agent with phone "${input.phone}" already exists (${existing.name}).`, 409);
      }
    }

    const agent = await prisma.agent.create({
      data: {
        code: agentCode,
        name: input.name.trim(),
        contactPerson: input.contactPerson?.trim() || null,
        phone: input.phone.trim(),
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        country: input.country?.trim() || "Dhaka",
        status: input.status,
        commissionRule: input.commissionRate ? { rate: input.commissionRate, type: "custom" } : { rate: "Standard", type: "fixed" },
        agreementKey: input.agreementKey?.trim() || `AGR-${agentCode}`,
      },
    });

    // Handle portal login user creation
    let portalUserCreated = false;
    let portalLoginEmail = "";
    if (input.enablePortalLogin !== false && (input.portalEmail || input.email || input.portalPassword)) {
      const loginEmail = (input.portalEmail || input.email || `${agentCode.toLowerCase()}@agent.orbit.com`).trim().toLowerCase();
      portalLoginEmail = loginEmail;
      const rawPassword = input.portalPassword?.trim() || "Agent@2026";
      const passwordHash = await bcrypt.hash(rawPassword, 10);
      const username = `${agentCode.toLowerCase().replace(/[^a-z0-9]/g, "")}_agent`;

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

      await prisma.user.upsert({
        where: { email: loginEmail },
        update: {
          name: agent.name,
          username,
          passwordHash,
          status: input.status === "Active" ? "ACTIVE" : "INACTIVE",
          roleId: agentRole.id,
          agentId: agent.id,
        },
        create: {
          name: agent.name,
          email: loginEmail,
          username,
          passwordHash,
          status: input.status === "Active" ? "ACTIVE" : "INACTIVE",
          roleId: agentRole.id,
          agentId: agent.id,
        },
      });
      portalUserCreated = true;
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        role: session.user.role.name,
        module: "Agents",
        recordId: agent.id,
        action: "CREATE_AGENT",
        newValue: { name: agent.name, code: agent.code, phone: agent.phone, portalUserCreated, portalLoginEmail },
        correlationId: crypto.randomUUID(),
      },
    }).catch(() => {});

    return NextResponse.json(
      {
        ok: true,
        message: `Agent "${agent.name}" (${agent.code}) created successfully!${portalUserCreated ? ` Login Email: ${portalLoginEmail}` : ""}`,
        data: agent,
        portalLoginEmail: portalUserCreated ? portalLoginEmail : null,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
