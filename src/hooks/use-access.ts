"use client";
import { useQuery } from "@tanstack/react-query";
import { canonicalModule } from "@/lib/permission-policy";
import { meQueryOptions } from "@/lib/queries/me";
export function useAccess() {
  const query = useQuery(meQueryOptions());
  return {
    isSuperAdmin: query.data?.data?.roleKey === "SUPER_ADMIN",
    allows: (module: string, action: string) => query.data?.data?.roleKey === "SUPER_ADMIN" || (query.data?.data?.granularPermissions[canonicalModule(module)] ?? []).includes(action),
  };
}
