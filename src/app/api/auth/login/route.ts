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

// Pre-computed dummy bcrypt hash (cost factor 12) for constant-time comparison against nonexistent users
// Prevents user enumeration via timing analysis
const DUMMY_HASH = "$2a$12$4v0P6m3K9u2L1o5J8w7Qye9Z4N8X2V6T0R7P5M3K1J9H7G5F3D2S1";

export async function POST(request: Request) {
  const ctx = requestContext(request);
  try {
    const rawBody = await request.json();
    const parsed = loginSchema.parse(rawBody);
    const rawIdentity = parsed.identity.trim();
    const normalizedIdentity = rawIdentity.toLowerCase();

    // Evaluate risk across both targeted account and client IP
    const risk = await loginRisk(normalizedIdentity, ctx.ip);
    if (risk.locked) {
      await recordLogin({ ...ctx, identity: normalizedIdentity, result: "Rate-Limited", reason: "Too many failures" });
      return NextResponse.json(
        {
          error: {
            code: "TOO_MANY_ATTEMPTS",
            message: "Too many failed attempts. Please try again in 15 minutes.",
          },
          captchaRequired: true,
        },
        { status: 429 }
      );
    }

    if (risk.captchaRequired) {
      await verifyLoginCaptcha(parsed.captchaToken);
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedIdentity },
          { username: normalizedIdentity },
          { username: rawIdentity },
        ],
      },
      include: { role: true },
    });

    // Constant-time password comparison to prevent timing attacks
    const passwordValid = await bcrypt.compare(
      parsed.password,
      user?.passwordHash ?? DUMMY_HASH
    );

    if (!user || user.status !== "ACTIVE" || user.role.status !== "ACTIVE" || !passwordValid) {
      await recordLogin({
        ...ctx,
        userId: user?.id,
        identity: normalizedIdentity,
        result: "Failed",
        reason: !user
          ? "User not found"
          : !passwordValid
          ? "Invalid password"
          : "Account or role inactive",
      });

      // Next attempt will trigger captcha if this failure makes failures >= 3
      const willRequireCaptcha = risk.captchaRequired || (risk.failures + 1 >= 3);

      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials or inactive account.",
          },
          captchaRequired: willRequireCaptcha,
        },
        { status: 401 }
      );
    }

    const expires = sessionExpiresAt(parsed.remember);
    const token = await signSession(
      { userId: user.id, role: user.role.name, officeId: user.officeId ?? undefined },
      expires
    );

    await prisma.$transaction([
      prisma.session.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: expires,
          ip: ctx.ip,
          device: ctx.device,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      prisma.loginHistory.create({
        data: {
          ...ctx,
          userId: user.id,
          identity: normalizedIdentity,
          result: "Success",
        },
      }),
    ]);

    const response = NextResponse.json({
      ok: true,
      token,
      user: {
        name: user.name,
        role: user.role.name,
        home: roleHome(user.role.name),
      },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires,
    });

    return response;
  } catch (error) {
    console.error("Login catch error:", error);
    return errorResponse(error);
  }
}
