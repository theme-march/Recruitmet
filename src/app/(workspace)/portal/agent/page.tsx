import { toAppRole } from "@/lib/roles";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AgentPortalView } from "@/components/modules/agent-portal-view";

export const metadata: Metadata = {
  title: "Agent Partner Portal | Orbit Overseas",
  description: "Live candidate submissions, financial ledger, and file processing status",
};

export default async function AgentPortalPage({
  searchParams,
}: {
  searchParams?: Promise<{ agentId?: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const isAdmin = toAppRole(session.user.role.name) === "SUPER_ADMIN";
  if (!isAdmin && toAppRole(session.user.role.name) !== "AGENT") redirect("/dashboard");
  const sParams = await searchParams;
  const agentId = isAdmin ? sParams?.agentId || session.user.agentId : session.user.agentId;
  const agent = agentId ? await prisma.agent.findUnique({ where: { id: agentId } }) : null;

  if (!agent) {
    return (
      <div style={{ padding: "40px", textAlign: "center", background: "#fff", borderRadius: "16px", margin: "20px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--ink)", marginBottom: "8px" }}>
          No Agent Partner Profile Associated
        </h3>
        <p style={{ color: "var(--muted)", fontSize: "13px" }}>
          Your user account does not have a linked agent profile. Please contact the administrator.
        </p>
      </div>
    );
  }

  return <AgentPortalView agentId={agent.id} />;
}
