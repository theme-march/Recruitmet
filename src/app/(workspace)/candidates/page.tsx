import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCandidatesData } from "@/server/data/candidates";
import { AllCandidatesListPage } from "@/components/modules/all-candidates-list-page";
import CandidatesLoading from "./loading";

export const metadata: Metadata = {
  title: "Candidate Central Registry | Orbit Overseas",
  description: "Comprehensive search, tracking, and pipeline management for all candidates",
};

async function CandidatesDataLoader({ sessionPromise }: { sessionPromise: ReturnType<typeof getSession> }) {
  const session = await sessionPromise;
  if (!session) redirect("/login");

  const initialData = await getCandidatesData(session, { page: 1, pageSize: 20 });
  return <AllCandidatesListPage initialData={initialData} />;
}

export default async function CandidatesRoutePage() {
  await connection();
  const sessionPromise = getSession();

  return (
    <Suspense fallback={<CandidatesLoading />}>
      <CandidatesDataLoader sessionPromise={sessionPromise} />
    </Suspense>
  );
}
