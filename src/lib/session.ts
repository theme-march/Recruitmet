import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { authSecret, sessionExpiresAt } from "@/lib/auth-policy";

export const SESSION_COOKIE = "orbit_session";

export type SessionPayload = JWTPayload & { userId: string; role: string; officeId?: string };

export async function signSession(payload: Omit<SessionPayload, "iat" | "exp">, expires = sessionExpiresAt()) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setJti(crypto.randomUUID()).setIssuedAt().setExpirationTime(Math.floor(expires.getTime() / 1000)).sign(authSecret());
}

export async function verifySessionToken(token?: string) {
  if (!token) return null;
  try { return (await jwtVerify(token, authSecret(), { algorithms: ["HS256"] })).payload as SessionPayload; }
  catch { return null; }
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Request-memoized session retriever (React.cache)
 * Prevents duplicate cookie lookups and database queries across layouts, pages, and metadata.
 */
export const getSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await verifySessionToken(token);
  if (!payload || !token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { role: true, office: true } } },
  });
  if (!session || session.expiresAt < new Date() || session.user.status !== "ACTIVE" || session.user.role.status !== "ACTIVE") return null;
  return session;
});
