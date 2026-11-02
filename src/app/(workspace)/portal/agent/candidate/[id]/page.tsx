import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AgentCandidateDossierPage } from "@/components/modules/agent-candidate-dossier-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return { title: "Candidate Dossier | Agent Portal" };
}

export default async function CandidateDossierPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ agentId?: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const query = await searchParams;
  return <AgentCandidateDossierPage fileId={id} agentId={query?.agentId} />;
}
