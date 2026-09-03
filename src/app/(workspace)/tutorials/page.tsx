import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { TutorialLibraryPage } from "@/components/modules/tutorial-library-page";

export const metadata: Metadata = {
  title: "SOP & Training Tutorials | Orbit Overseas",
  description: "Standard operating procedures, officer training guides, and compliance tutorials",
};

export default async function TutorialsRoutePage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return <TutorialLibraryPage mode="tutorials" />;
}
