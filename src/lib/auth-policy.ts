export function sessionExpiresAt(remember = false, now = Date.now()) {
  return new Date(now + (remember ? 7 * 24 : 8) * 60 * 60 * 1000);
}

export function authSecret(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.AUTH_SECRET;
  if (env.NODE_ENV === "production" && (!secret || secret.length < 32 || secret === "unsafe-development-secret")) {
    throw new Error("AUTH_SECRET must contain at least 32 characters in production.");
  }
  return new TextEncoder().encode(secret || "unsafe-development-secret");
}
