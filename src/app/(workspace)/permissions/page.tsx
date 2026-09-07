import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AccessControlPanel } from "@/components/modules/access-control-panel";
import { toAppRole } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Role Permissions Matrix & Staff Access | Orbit Overseas",
  description: "Granular CRUD access control, module visibility, and staff user provisioning",
};

export default async function PermissionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (toAppRole(session.user.role.name) !== "SUPER_ADMIN") redirect("/dashboard");
  return <AccessControlPanel />;
}
