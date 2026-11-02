"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: params.get("token"),
          password: data.password,
          confirmPassword: data.confirmPassword,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message || "Password reset failed. Please request a new link.");
        return;
      }

      router.replace("/login");
    } catch {
      setError("Unable to process request. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-panel" onSubmit={submit}>
      <span>SECURE RESET</span>
      <h1>Choose a new password</h1>
      <p>Use at least 10 characters with upper/lowercase, a number and a symbol.</p>
      {error && <div className="form-error" role="alert">{error}</div>}
      <label>
        New password
        <input name="password" type="password" required minLength={10} />
      </label>
      <label>
        Confirm password
        <input name="confirmPassword" type="password" required minLength={10} />
      </label>
      <button data-action-ui="primary" data-action-size="normal" className="login-button" disabled={loading}>
        {loading ? "Resetting..." : "Reset password"}
      </button>
      <Link href="/login">Back to sign in</Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-simple">
      <Suspense fallback={<div>Loading verification…</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
