"use client";

import { Eye, EyeOff, Headphones, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function Login() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity: form.get("identity"),
        password: form.get("password"),
        remember: form.get("remember") === "on",
        captchaToken: form.get("captchaToken") || undefined,
      }),
    });
    try {
      const text = await response.text();
      let body: any = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = { error: { message: "Server returned an invalid response" } };
      }
      setLoading(false);
      if (!response.ok) {
        setError(body.error?.message || body.error || "Sign in failed");
        setCaptchaRequired(body.error?.code === "CAPTCHA_REQUIRED");
        return;
      }
      toast.success(`Welcome back, ${body.user.name}`);
      router.replace(body.user.home ?? "/dashboard");
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Sign in failed");
    }
  }

  return (
    <div className="login-page">
      <section className="login-visual">
        <div className="login-copy">
          <div className="brand login-brand">
            <span className="brand-mark"><Headphones size={22} /></span>
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
          <h2>Sign in to Call Center</h2>
          <p>Enter your officer credentials to access the panel.</p>
          {error && <div className="form-error">{error}</div>}
          <label>
            Email or username
            <div>
              <Mail />
              <input name="identity" defaultValue="callcenter@orbit.com" required />
            </div>
          </label>
          <label>
            Password
            <div>
              <LockKeyhole />
              <input
                name="password"
                type={show ? "text" : "password"}
                defaultValue="Admin@123"
                required
              />
              <button type="button" onClick={() => setShow(!show)}>
                {show ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>
          {captchaRequired && (
            <label>
              Verification code
              <div>
                <ShieldCheck />
                <input
                  name="captchaToken"
                  placeholder="Enter CAPTCHA token"
                  required
                />
              </div>
              <small>
                Development token: development-captcha. Connect a production
                CAPTCHA provider before launch.
              </small>
            </label>
          )}
          <div className="login-options">
            <label>
              <input name="remember" type="checkbox" defaultChecked /> Remember
              me
            </label>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
          <button className="login-button" disabled={loading}>
            {loading ? "Signing in..." : "Sign in to Office Panel"}
          </button>
          <div className="login-help">
            Call Center Single Role Platform.
            <br />
            Need help? <b>Contact office administrator</b>
          </div>
        </form>
      </section>
    </div>
  );
}

