import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string(),
  role: z.string(),
  roleKey: z.enum(["SUPER_ADMIN", "CALL_CENTER", "CUSTOM", "AGENT"]),
  home: z.string(),
  office: z.string().nullable(),
  unreadNotifications: z.number(),
  allowedModules: z.array(z.string()),
  granularPermissions: z.record(z.string(), z.array(z.string())),
  permissions: z.record(z.string(), z.boolean()),
});

export type CurrentUserProfile = z.infer<typeof profileSchema>;
export type MeResponse = { data: CurrentUserProfile | null };
export const meKey = ["me"] as const;

// Every observer must cache the same envelope. Use `select` in consumers that
// need the inner profile; returning it from another queryFn corrupts this cache.
export const meQueryOptions = () => queryOptions({
  queryKey: meKey,
  queryFn: async ({ signal }): Promise<MeResponse> => {
    const response = await fetch("/api/me", { signal, cache: "no-store" });
    // A confirmed expired/revoked session must clear cached access, whereas
    // temporary network/server failures must not replace good data with null.
    if (response.status === 401) return { data: null };
    if (!response.ok) throw new Error("Unable to load your navigation and access permissions.");
    const body = await response.json();
    return { data: profileSchema.parse(body.data) };
  },
  staleTime: 30_000,
  refetchInterval: 30_000,
  refetchOnWindowFocus: true,
});
