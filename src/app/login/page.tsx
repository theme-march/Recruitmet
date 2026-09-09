"use client";

import { Eye, EyeOff, Headphones, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { LoginChallenge } from "@/components/auth/login-challenge";

export default function Login() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const router = useRouter();
  const client = useQueryClient();
  const [captchaToken, setCaptchaToken] = useState("");
  const [challengeAttempt, setChallengeAttempt] = useState(0);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: form.get("identity"), password: form.get("password"),
          remember: form.get("remember") === "on", captchaToken: captchaToken || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(typeof body.error === "string" ? body.error : body.error?.message || "Sign in failed");
        setCaptchaRequired(body.error?.code === "CAPTCHA_REQUIRED");
        setCaptchaToken("");
        setChallengeAttempt(attempt => attempt + 1);
        return;
      }
      client.clear();
      toast.success(`Welcome back, ${body.user.name}`);
      router.replace(body.user.home ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Unable to sign in. Check your connection and try again.");
      setCaptchaToken("");
      setChallengeAttempt(attempt => attempt + 1);
    } finally { setLoading(false); }
  }

  return (
    <div className="login-page">
      <section className="login-visual">
        <div className="login-copy">
          <div className="brand login-brand">
            <span className="brand-mark" style={{ display: "grid", placeItems: "center", background: "transparent", overflow: "hidden" }}>
              <img src="/logo.png" alt="Logo" width={32} height={32} style={{ objectFit: "contain" }} />
            </span>
            <span>
              <b>ORBIT</b>
              <small>CALL CENTER PANEL</small>
            </span>
          </div>
          <div className="visual-badge">
            <ShieldCheck /> Call Center &amp; Office Workspace
          </div>
          <h1>
            Lead Management.<br />
            <em>Fast &amp; Accurate.</em>
          </h1>
          <p>
            Create work calls, manage follow-up priorities, schedule interviews, and convert candidates effortlessly.
          </p>
          <div className="visual-metrics">
            <div>
              <b>100%</b>
              <span>Lead Tracking</span>
            </div>
            <div>
              <b>Real-time</b>
              <span>Follow-up Alerts</span>
            </div>
            <div>
              <b>Direct</b>
              <span>Interview Schedules</span>
            </div>
          </div>
        </div>
      </section>
      <section className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <div className="mobile-logo">
            <span className="brand-mark"><Headphones size={22} /></span>
            <b>ORBIT CALL CENTER</b>
          </div>
          <span className="welcome">OFFICE LOGIN</span>
          <h2>Sign in to ORBIT</h2>
          <p>Enter your staff credentials to access your permitted work.</p>
          {error && <div className="form-error" role="alert">{error}</div>}
          <label>
            Email or username
            <div>
              <Mail />
              <input name="identity" autoComplete="username" required />
            </div>
          </label>
          <label>
            Password
            <div>
              <LockKeyhole />
              <input
                name="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
              />
              <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}>
                {show ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>
          {captchaRequired && <LoginChallenge key={challengeAttempt} onToken={setCaptchaToken} />}
          <div className="login-options">
            <label>
              <input name="remember" type="checkbox" defaultChecked /> Remember
              me
            </label>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
          <button className="login-button" disabled={loading || (captchaRequired && !captchaToken)}>
            {loading ? "Signing in..." : "Sign in to Office Panel"}
          </button>
          <div className="login-help">
            Role-based recruitment workspace.
            <br />
            Need help? <b>Contact office administrator</b>
          </div>
        </form>
      </section>
    </div>
  );
}
