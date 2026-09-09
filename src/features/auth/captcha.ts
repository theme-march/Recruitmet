import { AppError } from "@/lib/errors";

export async function verifyLoginCaptcha(token: string | undefined) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const hostname = process.env.TURNSTILE_HOSTNAME;
  if (!secret || !hostname || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    throw new AppError("LOGIN_THROTTLED", "Too many failed attempts. Try again in 15 minutes or contact your administrator.", 429);
  }
  if (!token || token.length > 2048) throw new AppError("CAPTCHA_REQUIRED", "Complete the security verification before trying again.", 429);
  let valid = false;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
      signal: AbortSignal.timeout(8_000), cache: "no-store",
    });
    const result = await response.json();
    valid = response.ok && result.success === true && result.hostname === hostname && result.action === "login";
  } catch { /* Fail closed on provider/network errors. Never log the token. */ }
  if (!valid) throw new AppError("CAPTCHA_REQUIRED", "Security verification expired or failed. Please try again.", 429);
}
