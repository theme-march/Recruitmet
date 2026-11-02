"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const identity = String(new FormData(e.currentTarget).get("identity") || "");
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity }),
      });
      const body = await response.json();
      setMessage(body.message || body.error?.message || "Reset request processed.");
      setToken(body.developmentToken || "");
    } catch {
      setMessage("Failed to send reset instructions. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-simple">
      <form className="auth-panel" onSubmit={submit}>
        <span>ACCOUNT RECOVERY</span>
        <h1>Forgot password</h1>
        <p>Enter your email or username. Recovery instructions expire after 30 minutes.</p>

        <label>
          Email or username
          <input name="identity" required placeholder="Enter your email or username" />
        </label>

        <button data-action-ui="primary" data-action-size="normal" className="login-button" type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send reset instructions"}
        </button>

        {message && <div className="auth-message">{message}</div>}
        {token && (
          <Link className="dev-reset" href={`/reset-password?token=${token}`}>
            Development only: continue to reset
          </Link>
        )}

        <Link href="/login" className="back-link">
          Back to sign in
        </Link>
      </form>
    </div>
  );
}
