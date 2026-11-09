import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { GeneralSettingsPage } from "@/components/modules/general-settings-page";

export const metadata: Metadata = {
  title: "General Settings | Orbit Overseas",
  description: "Configure system brand identity, software title, logo, and organization details",
};

export default async function SettingsPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return <GeneralSettingsPage />;
}
