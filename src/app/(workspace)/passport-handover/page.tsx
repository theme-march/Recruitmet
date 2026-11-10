import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { PassportHandoverPage } from "@/components/modules/passport-handover-page";

export const metadata: Metadata = {
  title: "Passport Handover | Orbit Overseas",
  description: "Manage passport handover and collection records",
};

export default async function PassportHandoverRoutePage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return <PassportHandoverPage />;
}
