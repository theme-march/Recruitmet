"use client";

import { AlertCircle, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { LoginChallenge } from "@/components/auth/login-challenge";
import styles from "./login.module.css";

export default function Login() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const client = useQueryClient();
  const [captchaToken, setCaptchaToken] = useState("");
  const [challengeAttempt, setChallengeAttempt] = useState(0);
  const [savedSession, setSavedSession] = useState<{ name: string; home: string } | null>(null);
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4000);
    let active = true;

    void fetch("/api/me", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const body = await response.json();
        const name = body?.data?.name;
        const home = body?.data?.home;
        if (typeof name === "string" && typeof home === "string" && home.startsWith("/") && !home.startsWith("//")) {
          setSavedSession({ name, home });
        }
      })
      .catch(() => {
        // An unavailable or expired session leaves the normal sign-in form usable.
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setInteractive(true);
      });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const identity = (form.get("identity") as string)?.trim() ?? "";
    const password = (form.get("password") as string) ?? "";

    if (!identity || identity.length < 3) {
      setError("Please enter an email or username with at least 3 characters.");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity,
          password,
          remember: form.get("remember") === "on",
          captchaToken: captchaToken || undefined,
        }),
      });

      let body: any;
      try {
        body = await response.json();
      } catch {
        setError(
          response.status >= 500
            ? "Authentication service is currently unavailable. Please try again shortly."
            : "An unexpected server response occurred. Please try again."
        );
        return;
      }

      if (!response.ok) {
        const errorMsg =
          typeof body.error === "string"
            ? body.error
            : body.error?.message || "Sign in failed. Please check your credentials.";

        setError(errorMsg);

        // Turnstile captcha handshake: activate if server says captchaRequired OR error code warrants it
        const isCaptchaNeeded =
          body.captchaRequired === true ||
          body.error?.code === "CAPTCHA_REQUIRED" ||
          body.error?.code === "TOO_MANY_ATTEMPTS";

        setCaptchaRequired(isCaptchaNeeded);
        setCaptchaToken("");
        setChallengeAttempt((attempt) => attempt + 1);
        return;
      }

      const sessionResponse = await fetch("/api/me", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!sessionResponse.ok) {
        setError(
          sessionResponse.status === 401
            ? "Sign-in succeeded, but this device did not keep the session. Reload the app and try again."
            : "Sign-in succeeded, but your workspace could not be loaded. Please try again."
        );
        return;
      }

      client.clear();
      toast.success(`Welcome back, ${body.user.name}`);
      const destination = body.user?.home ?? "/dashboard";
      window.location.href = destination;
    } catch {
      setError("Unable to connect to the authentication server. Please check your internet connection.");
      setCaptchaToken("");
      setChallengeAttempt((attempt) => attempt + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <form className={styles.form} onSubmit={submit}>
          <span className={styles.welcome}>OFFICE LOGIN</span>
          <h1 className={styles.title}>Sign in to ORBIT</h1>
          <p className={styles.subtitle}>Enter your staff credentials to access your permitted work.</p>

          {error && (
            <div className={styles.errorBox} role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {savedSession && (
            <button
              type="button"
              className={styles.savedSessionBtn}
              disabled={loading}
              onClick={() => window.location.assign(savedSession.home)}
            >
              Continue as {savedSession.name}
            </button>
          )}

          <label className={styles.field}>
            Email or username
            <div className={styles.inputWrap}>
              <Mail className={styles.inputIcon} size={18} />
              <input
                className={styles.input}
                name="identity"
                autoComplete="username"
                required
                minLength={3}
                maxLength={190}
                placeholder="Enter email or username"
              />
            </div>
          </label>

          <label className={styles.field}>
            Password
            <div className={styles.inputWrap}>
              <LockKeyhole className={styles.inputIcon} size={18} />
              <input
                className={styles.input}
                name="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                minLength={8}
                maxLength={128}
                placeholder="Enter password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {captchaRequired && <LoginChallenge key={challengeAttempt} onToken={setCaptchaToken} />}

          <div className={styles.optionsRow}>
            <label className={styles.rememberLabel}>
              <input className={styles.checkbox} name="remember" type="checkbox" defaultChecked />
              <span>Remember me</span>
            </label>
            <Link href="/forgot-password" className={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!interactive || loading || (captchaRequired && !captchaToken)}
          >
            {loading ? "Signing in…" : "Sign in to Office Panel"}
          </button>

          <div className={styles.helpText}>
            Role-based recruitment workspace.
            <br />
            Need help? <b>Contact office administrator</b>
          </div>
        </form>
      </div>
    </div>
  );
}
