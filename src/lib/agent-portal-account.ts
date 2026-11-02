import "server-only";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { toAppRole } from "@/lib/roles";

// Portal provisioning must never replace a staff account or the protected owner.
export async function assertPortalEmailAvailable(email: string, agentId?: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { agentId: true, role: { select: { name: true } } } });
  if (user && (toAppRole(user.role.name) !== "AGENT" || !agentId || user.agentId !== agentId)) {
    throw new AppError("PORTAL_EMAIL_IN_USE", "This email belongs to another account. Use a dedicated email for this agent portal.", 409);
  }
}
