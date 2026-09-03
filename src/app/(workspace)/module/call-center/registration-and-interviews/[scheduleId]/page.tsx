import { InterviewDetailPage } from "@/components/modules/interview-detail-page";
import { getSession } from "@/lib/session";
import { connection } from "next/server";
import { redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ scheduleId: string }> }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  const { scheduleId } = await params;
  return <InterviewDetailPage scheduleId={scheduleId} />;
}

