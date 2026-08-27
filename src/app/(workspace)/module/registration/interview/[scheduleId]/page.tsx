import { redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ scheduleId: string }> }) {
  const { scheduleId } = await params;
  redirect(`/module/call-center/registration-and-interviews/${scheduleId}`);
}
