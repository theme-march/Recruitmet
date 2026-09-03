import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { WorksDemandsPage } from "@/components/modules/works-demands-page";

export const metadata: Metadata = {
  title: "Foreign Employer Demands | Orbit Overseas",
  description: "Manage international job orders, quota fulfillment, and company contracts",
};

export default async function DemandsRoutePage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return <WorksDemandsPage />;
}
