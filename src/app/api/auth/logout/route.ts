import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { withApiAccess } from "@/lib/api-access";
import { hashToken, SESSION_COOKIE } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const POST = withApiAccess("auth/logout", POSTHandler);

async function POSTHandler() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    const tokenHash = hashToken(token);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: { include: { role: true } } },
    });

    await prisma.session.deleteMany({
      where: { tokenHash },
    });

    if (session) {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          role: session.user.role.name,
          module: "Authentication",
          recordId: session.userId,
          action: "LOGOUT",
          correlationId: crypto.randomUUID(),
        },
      });
    }
  }

  const response = NextResponse.json({ ok: true, message: "Logged out successfully." });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
