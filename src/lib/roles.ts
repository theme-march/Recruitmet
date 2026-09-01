export const APP_ROLES = {
  SUPER_ADMIN: "Super Administrator",
  CALL_CENTER: "Call Center",
  AGENT: "Agent Partner",
} as const;

export type AppRole = keyof typeof APP_ROLES;

export const allModuleIds = [
  "dashboard",
  "call-center",
  "ksa",
  "dubai",
  "other-country",
  "office-vendor",
  "agents",
  "payment-collection",
  "document",
  "tutorials",
  "country-setup",
  "registration",
  "accounts",
  "documents",
  "flights",
  "partners",
  "exceptions",
  "notifications",
  "master-data",
  "common",
] as const;

export const operationalModuleIds = allModuleIds;

export function toAppRole(roleName?: string): AppRole {
  if (!roleName) return "CALL_CENTER";
  const normalized = roleName.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.includes("super") || normalized.includes("admin")) return "SUPER_ADMIN";
  if (normalized.includes("agent")) return "AGENT";
  return "CALL_CENTER";
}

export function roleLabel(role?: AppRole | string) {
  if (role === "SUPER_ADMIN" || role === "Super Administrator") return "Super Administrator";
  if (role === "AGENT" || role === "Agent Partner" || role === "Agent") return "Agent Partner (Portal)";
  return "Call Center Officer";
}

export function roleHome(roleOrName?: AppRole | string) {
  const r = typeof roleOrName === "string" ? toAppRole(roleOrName) : roleOrName;
  if (r === "AGENT") return "/portal/agent";
  return "/dashboard";
}

export function moduleIdsForRole(_roleOrName?: AppRole | string): readonly string[] {
  return allModuleIds;
}

export function isRole(roleName: string, ...allowed: AppRole[]) {
  const role = toAppRole(roleName);
  return allowed.includes(role);
}



