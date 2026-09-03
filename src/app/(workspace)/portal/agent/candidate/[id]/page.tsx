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
  const { id } = await params;
  const file = await prisma.processingFile.findFirst({
    where: { OR: [{ id }, { fileNo: id }] },
    select: { fileNo: true, candidate: { select: { fullName: true } } },
  });

  return {
    title: file ? `Dossier: ${file.candidate.fullName} (${file.fileNo}) | Agent Portal` : "Candidate Dossier | Agent Portal",
  };
}

export default async function CandidateDossierPortalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  return <AgentCandidateDossierPage fileId={id} />;
}
