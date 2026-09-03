import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { PermissionsMatrix } from "@/components/modules/permissions-matrix";

export const metadata: Metadata = {
  title: "Role Permissions Matrix & Staff Access | Orbit Overseas",
  description: "Granular CRUD access control, module visibility, and staff user provisioning",
};

export default async function PermissionsPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return <PermissionsMatrix />;
}
