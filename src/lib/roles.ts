export const APP_ROLES = {
  SUPER_ADMIN: "Super Administrator",
  CALL_CENTER: "Call Center",
  AGENT: "Agent Partner",
} as const;

export type AppRole = keyof typeof APP_ROLES | "CUSTOM";

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
  // Built-in names are reserved by the administration API. Never use substring
  // matching: a custom "Branch Admin" must not acquire Super Admin privileges.
  if (roleName === "SUPER_ADMIN" || roleName === APP_ROLES.SUPER_ADMIN) return "SUPER_ADMIN";
  if (roleName === "CALL_CENTER" || roleName === APP_ROLES.CALL_CENTER || roleName === "Call Center Officer") return "CALL_CENTER";
  if (["AGENT", "Agent Partner", "Agent Portal", "Agent"].includes(roleName ?? "")) return "AGENT";
  return "CUSTOM";
}

export function roleLabel(role?: AppRole | string) {
  if (role === "SUPER_ADMIN" || role === "Super Administrator") return "Super Administrator";
  if (role === "AGENT" || role === "Agent Partner" || role === "Agent") return "Agent Partner (Portal)";
  if (role === "CALL_CENTER" || role === "Call Center") return "Call Center Officer";
  return role || "Custom Role";
}

export function roleHome(roleOrName?: AppRole | string) {
  const r = typeof roleOrName === "string" ? toAppRole(roleOrName) : roleOrName;
  if (r === "AGENT") return "/portal/agent";
  return "/dashboard";
}

export function moduleIdsForRole(roleOrName?: AppRole | string): readonly string[] {
  return toAppRole(roleOrName) === "SUPER_ADMIN" ? allModuleIds : [];
}

export function isRole(roleName: string, ...allowed: AppRole[]) {
  const role = toAppRole(roleName);
  return allowed.includes(role);
}


