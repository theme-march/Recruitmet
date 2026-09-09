import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken, SESSION_COOKIE, signSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/features/auth/schemas";
import { loginRisk, recordLogin } from "@/features/auth/service";
import { errorResponse } from "@/lib/errors";
import { requestContext } from "@/lib/request-context";
import { roleHome } from "@/lib/roles";
import { sessionExpiresAt } from "@/lib/auth-policy";
import { verifyLoginCaptcha } from "@/features/auth/captcha";

export async function POST(request: Request) {
  const ctx = requestContext(request);
  try {
    const parsed = loginSchema.parse(await request.json());
    const identity = parsed.identity.trim().toLowerCase();

    if (process.env.NODE_ENV === "production") {
      const risk = await loginRisk(identity);
      if (risk.locked) {
        await recordLogin({ ...ctx, identity, result: "Rate-Limited", reason: "Too many failures" });
        return NextResponse.json({ error: "Too many failed attempts. Try again in 15 minutes." }, { status: 429 });
      }
      if (risk.captchaRequired) await verifyLoginCaptcha(parsed.captchaToken);
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identity },
          { username: identity },
        ],
      },
      include: { role: true },
    });

    let passwordValid = false;
    if (user) {
      passwordValid = await bcrypt.compare(parsed.password, user.passwordHash);
    }

    if (!user || user.status !== "ACTIVE" || user.role.status !== "ACTIVE" || !passwordValid) {
      await recordLogin({ ...ctx, userId: user?.id, identity, result: "Failed", reason: "Invalid credentials or account state" });
      return NextResponse.json({ error: "Invalid credentials or inactive account.", captchaRequired: false }, { status: 401 });
    }

    const expires = sessionExpiresAt(parsed.remember);
    const token = await signSession({ userId: user.id, role: user.role.name, officeId: user.officeId ?? undefined }, expires);

    await prisma.$transaction([
        prisma.session.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: expires, ip: ctx.ip, device: ctx.device } }),
        prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
        prisma.loginHistory.create({ data: { ...ctx, userId: user.id, identity, result: "Success" } }),
    ]);

    const response = NextResponse.json({ ok: true, user: { name: user.name, role: user.role.name, home: roleHome(user.role.name) } });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires });
    return response;
  } catch (error) {
    console.error("Login catch error:", error);
    return errorResponse(error);
  }
}
