import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AgentPortalView } from "@/components/agent-portal-view";

export default async function AgentPortalPage({
  searchParams,
}: {
  searchParams?: Promise<{ agentId?: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const sParams = await searchParams;
  let agent = null;

  // 1. If explicit agentId is requested
  if (sParams?.agentId) {
    agent = await prisma.agent.findUnique({
      where: { id: sParams.agentId },
    });
  }

  // 2. Otherwise locate the agent record associated with logged-in user
  if (!agent && session.user.agentId) {
    agent = await prisma.agent.findUnique({
      where: { id: session.user.agentId },
    });
  }

  if (!agent && session.user.email) {
    agent = await prisma.agent.findFirst({
      where: {
        OR: [
          { email: session.user.email },
          { name: session.user.name },
        ],
      },
    });
  }

  // Fallback: If admin visits portal page to preview, pick the first agent
  if (!agent) {
    agent = await prisma.agent.findFirst({
      orderBy: { createdAt: "desc" },
    });
  }

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
