import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/role-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("CALL_CENTER");
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0b1222" }} />}>
      <AppShell>
        {children}
      </AppShell>
    </Suspense>
  );
}
