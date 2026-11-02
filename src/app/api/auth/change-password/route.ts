import { withApiAccess } from "@/lib/api-access";
import { changeSchema } from "@/features/auth/schemas";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppError, errorResponse } from "@/lib/errors";
import bcrypt from "bcryptjs";

export const POST = withApiAccess("auth/change-password", POSTHandler);

async function POSTHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const rawBody = await request.json();
    const data = changeSchema.parse(rawBody);

    const currentMatches = await bcrypt.compare(data.currentPassword, session.user.passwordHash);
    if (!currentMatches) {
      throw new AppError("CURRENT_PASSWORD_INVALID", "Current password is incorrect.", 400);
    }

    const sameAsOld = await bcrypt.compare(data.password, session.user.passwordHash);
    if (sameAsOld) {
      throw new AppError("PASSWORD_REUSED", "Choose a password different from your current password.", 409);
    }

    const newHash = await bcrypt.hash(data.password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.userId },
        data: { passwordHash: newHash },
      }),
      prisma.session.deleteMany({
        where: {
          userId: session.userId,
          id: { not: session.id },
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: session.userId,
          role: session.user.role.name,
          module: "Authentication",
          recordId: session.userId,
          action: "PASSWORD_CHANGE",
          correlationId: crypto.randomUUID(),
        },
      }),
    ]);

    return Response.json({ ok: true, message: "Password updated successfully." });
  } catch (error) {
    return errorResponse(error);
  }
}
