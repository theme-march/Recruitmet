import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ComponentSkeleton } from "@/components/component-skeleton";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <Suspense fallback={<ComponentSkeleton />}>{children}</Suspense>
    </AppShell>
  );
}
