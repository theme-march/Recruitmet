"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCcw, LayoutDashboard } from "lucide-react";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Workspace route error caught:", error);
  }, [error]);

  return (
    <div style={{ padding: "48px 24px", maxWidth: "600px", margin: "40px auto", textAlign: "center" }}>
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "14px",
          background: "#fef2f2",
          color: "#dc2626",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 16px",
        }}
      >
        <AlertCircle size={28} />
      </div>

      <h2 style={{ font: "800 22px/1.2 var(--font-manrope, Manrope), sans-serif", color: "#1e1b2e", margin: "0 0 8px" }}>
        Workspace Module Error
      </h2>

      <p style={{ color: "#6b7280", fontSize: "14px", lineHeight: 1.6, margin: "0 0 20px" }}>
        {error.message || "An error occurred while loading this workspace screen. You can retry or head back to operations."}
      </p>

      {error.digest && (
        <code style={{ display: "inline-block", fontSize: "11px", background: "#f3f4f6", padding: "4px 8px", borderRadius: "4px", marginBottom: "20px" }}>
          Digest: {error.digest}
        </code>
      )}

      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        <button
          onClick={() => reset()}
          style={{
            height: "40px",
            borderRadius: "8px",
            border: "none",
            padding: "0 18px",
            background: "#7258e8",
            color: "#fff",
            fontWeight: 700,
            fontSize: "13px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
          }}
        >
          <RefreshCcw size={15} /> Try Again
        </button>

        <Link
          href="/dashboard"
          style={{
            height: "40px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            padding: "0 18px",
            background: "#fff",
            color: "#374151",
            fontWeight: 600,
            fontSize: "13px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            textDecoration: "none",
          }}
        >
          <LayoutDashboard size={15} /> Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
