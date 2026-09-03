import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";
import { getAgentsData } from "@/server/data/agents";
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

    const result = await getAgentsData({ q, status, page, pageSize });
    return NextResponse.json(result);
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

    revalidatePath("/agents");
    revalidatePath("/dashboard");

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
