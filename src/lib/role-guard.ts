import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { roleHome, toAppRole, type AppRole } from "@/lib/roles";

export async function requireRole(...allowed: AppRole[]) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = toAppRole(session.user.role.name);
  if (allowed.length > 0 && !allowed.includes(role)) {
    redirect(roleHome(role));
  }
  return { session, role };
}


