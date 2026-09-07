/** Shared, serializable permission vocabulary. UI choices and server checks use
 * the same IDs. Unregistered grants and missing grants never imply access. */
export const permissionActions = ["read", "create", "edit", "delete", "export", "assign", "import", "verify", "refund", "hold", "return", "reprocess", "approve"] as const;
export type PermissionAction = typeof permissionActions[number];
export type PermissionMap = Record<string, string[]>;
export type PermissionModule = { id: string; label: string; description: string; actions: readonly PermissionAction[] };
const crud: PermissionAction[] = ["read", "create", "edit", "delete", "export"];
export const permissionModules: PermissionModule[] = [
  { id: "dashboard", label: "Analytics Dashboard", description: "Executive overview, operational and financial summaries", actions: ["read"] },
  { id: "call-center", label: "Candidates & Call Center", description: "Candidate register, leads, calls and follow-ups", actions: [...crud, "assign", "import", "verify", "approve"] },
  { id: "registration", label: "Registration & Interviews", description: "Schedules, assessments and interview conversion", actions: [...crud, "assign"] },
  { id: "office-vendor", label: "Works & Demands", description: "Companies, demand contracts and attached files", actions: crud },
  { id: "agents", label: "Agents", description: "Partner directory and dossiers; portal account provisioning remains Super Admin only", actions: [...crud, "assign"] },
  { id: "payment-collection", label: "Payments & Accounts", description: "Collections, ledger, receipts and refunds", actions: [...crud, "refund"] },
  { id: "document", label: "Documents", description: "Upload, download and verification", actions: [...crud, "verify"] },
  { id: "country-setup", label: "Country Setup", description: "Destination configuration and workflows", actions: ["read", "create", "edit", "delete"] },
  { id: "tutorials", label: "Tutorials", description: "Training library", actions: crud },
  { id: "files", label: "All-country File Register", description: "Cross-country file operations; grant only when all destinations are required", actions: [...crud, "assign"] },
  { id: "flights", label: "Flights", description: "Flight schedules and passenger operations", actions: [...crud, "approve"] },
  { id: "exceptions", label: "Holds & Returns", description: "Hold, return and reprocessing actions", actions: ["read", "hold", "return", "reprocess"] },
  { id: "notifications", label: "Notifications", description: "Sending and managing notifications", actions: ["read", "create", "edit"] },
  { id: "master-data", label: "Master Data", description: "Shared operational reference records", actions: crud },
  { id: "reports", label: "Management Reports", description: "Cross-module operational and financial reporting", actions: ["read", "export"] },
];
export function countryModule(country: string) {
  const key = country.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (["sa", "saudi", "saudi-arabia", "ksa"].includes(key)) return "ksa";
  if (["ae", "uae", "united-arab-emirates", "dubai"].includes(key)) return "dubai";
  if (["other", "others", "other-country"].includes(key)) return "other-country";
  return key;
}
export function permissionCatalog(countries: { name: string }[] = []): PermissionModule[] {
  const names = ["Saudi Arabia", "Dubai", "Other Country", ...countries.map(c => c.name)];
  const unique = new Map(names.map(name => [countryModule(name), name]));
  const destinations: PermissionModule[] = [...unique].filter(([id]) => !permissionModules.some(m => m.id === id)).map(([id, name]) => ({ id, label: `${name} Dossiers`, description: "Candidate dossiers and processing stages for this destination", actions: [...crud, "assign", "import", "approve"] }));
  return [...permissionModules.slice(0, 3), ...destinations, ...permissionModules.slice(3)];
}
const aliases: Record<string, string> = {
  candidate: "call-center", candidates: "call-center", lead: "call-center", leads: "call-center",
  interviews: "registration", interviewSchedule: "registration", partners: "office-vendor", demands: "office-vendor", agent: "agents",
  accounts: "payment-collection", invoices: "payment-collection", payment: "payment-collection", payments: "payment-collection",
  documents: "document", repository: "document", training: "tutorials", knowledge: "tutorials",
  overview: "dashboard", analytics: "dashboard", file: "files", flight: "flights", exception: "exceptions", notification: "notifications", master: "master-data",
};
export const canonicalModule = (value: string) => aliases[value] ?? countryModule(value);
export function canonicalAction(value: string): string {
  const key = value.toLowerCase();
  return ({ view: "read", list: "read", add: "create", update: "edit", write: "edit", remove: "delete", download: "export", print: "export", dispatch: "assign", all: "*", manage: "*" } as Record<string, string>)[key] ?? key;
}
export function hasPermission(grants: { module: string; action: string; page: string }[], module: string, action: string, page = "*") {
  return grants.some(grant => (grant.module === "*" || canonicalModule(grant.module) === canonicalModule(module)) && (grant.page === "*" || (page !== "*" && grant.page === page)) && (canonicalAction(grant.action) === "*" || canonicalAction(grant.action) === canonicalAction(action)));
}
export function expandPermissions(grants: { module: string; action: string; page: string }[], catalog: PermissionModule[]): PermissionMap {
  return Object.fromEntries(catalog.map(m => [m.id, m.actions.filter(a => hasPermission(grants, m.id, a))]));
}
