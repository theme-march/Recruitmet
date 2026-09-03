import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAgentsData } from "@/server/data/agents";
import { AgentsPage } from "@/components/modules/agents-page";
import AgentsLoading from "./loading";

export const metadata: Metadata = {
  title: "Agent Network & Partners | Orbit Overseas",
  description: "Manage channel agents, commission tiers, and sub-agency performance",
};

async function AgentsDataLoader({ sessionPromise }: { sessionPromise: ReturnType<typeof getSession> }) {
  const session = await sessionPromise;
  if (!session) redirect("/login");

  const initialData = await getAgentsData({ page: 1, pageSize: 50 });
  return <AgentsPage initialData={initialData} />;
}

export default async function AgentsRoutePage() {
  await connection();
  const sessionPromise = getSession();

  return (
    <Suspense fallback={<AgentsLoading />}>
      <AgentsDataLoader sessionPromise={sessionPromise} />
    </Suspense>
  );
}
