import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AgentCandidateDossierPage } from "@/components/agent-candidate-dossier-page";

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
