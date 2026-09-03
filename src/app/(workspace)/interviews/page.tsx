import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getInterviewsData } from "@/server/data/interviews";
import { InterviewListPage } from "@/components/modules/interview-list-page";
import InterviewsLoading from "./loading";

export const metadata: Metadata = {
  title: "Interview Schedules & Assessments | Orbit Overseas",
  description: "Delegation assessments, technical trade tests, and employer interviews",
};

async function InterviewsDataLoader({ sessionPromise }: { sessionPromise: ReturnType<typeof getSession> }) {
  const session = await sessionPromise;
  if (!session) redirect("/login");

  const initialData = await getInterviewsData({ pageSize: 100 });
  return <InterviewListPage initialData={initialData} />;
}

export default async function InterviewsRoutePage() {
  await connection();
  const sessionPromise = getSession();

  return (
    <Suspense fallback={<InterviewsLoading />}>
      <InterviewsDataLoader sessionPromise={sessionPromise} />
    </Suspense>
  );
}
