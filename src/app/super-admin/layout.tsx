import { Suspense } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { requireRole } from "@/lib/role-guard";
import { roleLabel } from "@/lib/roles";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { session, role } = await requireRole("SUPER_ADMIN");
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#060913" }} />}>
      <AdminShell
        variant="super-admin"
        profile={{ name: session.user.name, role: roleLabel(role), office: session.user.office?.name ?? null }}
      >
        {children}
      </AdminShell>
    </Suspense>
  );
}
