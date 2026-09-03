import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { AwaitedSession } from "@/lib/types";
import { toAppRole } from "@/lib/roles";

/**
 * Request-memoized authorization check (React.cache)
 * Reuses permission query results within a single server rendering pass.
 */
export const can = cache(async function can(
  session: AwaitedSession,
  module: string,
  action = "*",
  _page = "*"
): Promise<boolean> {
  if (!session) return false;

  // Super Administrator has all permissions
  const roleName = session.user.role?.name || "";
  const roleKey = toAppRole(roleName);
  if (roleKey === "SUPER_ADMIN") return true;

  // Comprehensive bidirectional module alias mapping
  const moduleAliases: Record<string, string[]> = {
    partners: ["partners", "office-vendor", "demands", "agents"],
    "office-vendor": ["office-vendor", "partners", "demands", "agents"],
    agents: ["agents", "agent", "office-vendor", "partners"],
    agent: ["agent", "agents", "office-vendor", "partners"],
    demands: ["demands", "partners", "office-vendor"],
    registration: ["registration", "interviews", "call-center"],
    interviews: ["interviews", "registration", "call-center"],
    "call-center": ["call-center", "registration", "interviews"],
    ksa: ["ksa", "saudi-arabia", "saudi"],
    "saudi-arabia": ["saudi-arabia", "ksa", "saudi"],
    saudi: ["saudi", "saudi-arabia", "ksa"],
    dubai: ["dubai", "uae"],
    uae: ["uae", "dubai"],
    "other-country": ["other-country", "other", "countries"],
    other: ["other", "other-country"],
    "payment-collection": ["payment-collection", "accounts", "invoices", "payment", "payments"],
    accounts: ["accounts", "payment-collection", "invoices", "payment", "payments"],
    invoices: ["invoices", "payment-collection", "accounts", "payment", "payments"],
    payment: ["payment", "payment-collection", "accounts", "invoices", "payments"],
    payments: ["payments", "payment-collection", "accounts", "invoices", "payment"],
    document: ["document", "documents", "repository"],
    documents: ["documents", "document", "repository"],
    repository: ["repository", "document", "documents"],
    tutorials: ["tutorials", "training", "knowledge"],
    training: ["training", "tutorials", "knowledge"],
    knowledge: ["knowledge", "tutorials", "training"],
    dashboard: ["dashboard", "overview", "analytics"],
    overview: ["overview", "dashboard", "analytics"],
    analytics: ["analytics", "dashboard", "overview"],
  };

  const allowedModuleNames = moduleAliases[module] || [module];
  const reqAction = (action || "*").toLowerCase();

  // Possible action aliases
  let actionAliases: string[] = ["*", "all", "manage", reqAction];
  if (["read", "view", "list"].includes(reqAction)) {
    // If requesting read access, any action permission on the module grants read
    actionAliases = ["*", "all", "manage", "read", "view", "list", "create", "add", "edit", "update", "delete", "remove", "export", "assign"];
  } else if (["create", "add"].includes(reqAction)) {
    actionAliases.push("create", "add");
  } else if (["edit", "update", "write"].includes(reqAction)) {
    actionAliases.push("edit", "update", "write");
  } else if (["delete", "remove"].includes(reqAction)) {
    actionAliases.push("delete", "remove");
  } else if (["export", "download"].includes(reqAction)) {
    actionAliases.push("export", "download");
  } else if (["assign", "dispatch"].includes(reqAction)) {
    actionAliases.push("assign", "dispatch");
  }

  // Check if role has permission granted in RolePermission
  const matchingRolePermission = await prisma.rolePermission.findFirst({
    where: {
      roleId: session.user.roleId,
      permission: {
        module: { in: [...allowedModuleNames, "*"] },
        action: { in: actionAliases },
      },
    },
  });

  return Boolean(matchingRolePermission);
});

export function officeScope(session: AwaitedSession) {
  if (!session || !session.user.officeId) return {};
  return {
    OR: [
      { officeId: session.user.officeId },
      { officeId: null },
    ],
  };
}
