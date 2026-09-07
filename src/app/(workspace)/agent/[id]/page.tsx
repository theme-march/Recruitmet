import { can } from "@/lib/authorization";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { AgentProfileDetail } from "@/components/modules/agent-profile-detail";
import { toAppRole } from "@/lib/roles";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return { title: "Agent Dossier | Orbit Overseas" };
}

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (!await can(session, "agents", "read")) redirect("/dashboard");

  const roleKey = toAppRole(session.user.role.name);

  // If the logged-in user is an Agent Partner, route them to their read-only portal
  if (roleKey === "AGENT") {
    redirect("/portal/agent");
  }

  const { id } = await params;
  // For Admin / Super Admin: Render full Agent Management Dossier with all actions
  return <AgentProfileDetail id={id} isReadOnly={false} />;
}
