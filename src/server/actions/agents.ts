"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import type { ServerActionResult } from "./files";

export type CreateAgentInput = {
  name: string;
  code?: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  country?: string;
  status?: "Active" | "Inactive" | "Blocked";
  commissionRate?: string;
  agreementKey?: string;
  enablePortalLogin?: boolean;
  portalEmail?: string;
  portalPassword?: string;
};

/**
 * Server Action: Create / Register a new channel agent partner
 */
export async function createAgentAction(
  input: CreateAgentInput
): Promise<ServerActionResult<{ id: string; code: string; name: string }>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    if (!input.name || input.name.trim().length < 2) {
      return { success: false, error: "Agent name must be at least 2 characters." };
    }
    if (!input.phone || input.phone.trim().length < 6) {
      return { success: false, error: "A valid phone number is required." };
    }

    // Auto-generate code if missing
    let code = (input.code || "").trim();
    if (!code) {
      const count = await prisma.agent.count();
      code = `AGT-${String(count + 101).padStart(3, "0")}`;
    }

    const agent = await prisma.agent.create({
      data: {
        code,
        name: input.name.trim(),
        contactPerson: input.contactPerson?.trim() || null,
        phone: input.phone.trim(),
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        country: input.country?.trim() || "Dhaka",
        status: input.status || "Active",
        commissionRule: input.commissionRate
          ? { rate: input.commissionRate.trim(), type: "custom" }
          : { rate: "৳ 25,000 / candidate", type: "fixed" },
        agreementKey: input.agreementKey?.trim() || `AGR-${code}`,
      },
    });

    // Portal login provisioning
    if (input.enablePortalLogin) {
      const loginEmail = (input.portalEmail || input.email || "").trim().toLowerCase();
      if (loginEmail) {
        const rawPassword = input.portalPassword?.trim() || "Agent@2026";
        const passwordHash = await bcrypt.hash(rawPassword, 10);
        const username = `agt_${code.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

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
      }
    }

    // Revalidate paths
    revalidatePath("/agents");
    revalidatePath("/dashboard");
    revalidatePath("/module/agents/agent-directory");

    return {
      success: true,
      data: { id: agent.id, code: agent.code, name: agent.name },
      message: `Agent "${agent.name}" (${agent.code}) registered successfully.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create agent";
    return { success: false, error: message };
  }
}
