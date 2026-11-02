import { AppError } from "@/lib/errors";

export async function verifyLoginCaptcha(token: string | undefined) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const hostname = process.env.TURNSTILE_HOSTNAME;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!secret || !siteKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[AUTH] Cloudflare Turnstile keys not configured in non-production. Bypassing captcha verification.");
      return;
    }
    throw new AppError("LOGIN_THROTTLED", "Security service temporarily unavailable. Please try again later or contact your administrator.", 429);
  }

  if (!token || token.length > 2048) {
    throw new AppError("CAPTCHA_REQUIRED", "Complete the security verification before trying again.", 429);
  }

  let valid = false;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    const result = await response.json();
    valid =
      response.ok &&
      result.success === true &&
      (!hostname || result.hostname === hostname) &&
      result.action === "login";
  } catch {
    /* Fail closed on provider/network errors. Never log raw tokens. */
  }

  if (!valid) {
    throw new AppError("CAPTCHA_REQUIRED", "Security verification expired or failed. Please complete the verification again.", 429);
  }
}
