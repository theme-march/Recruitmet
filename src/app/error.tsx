"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service or console
    console.error("Next.js Error Boundary caught an error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          background: "#fff",
          borderRadius: "16px",
          border: "1px solid #e9e7ef",
          boxShadow: "0 10px 30px rgba(30, 24, 60, 0.06)",
          padding: "36px 32px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            background: "#fff0f2",
            color: "#e11d48",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 20px",
          }}
        >
          <AlertTriangle size={28} />
        </div>

        <h2
          style={{
            font: "800 22px/1.25 var(--font-manrope, Manrope), sans-serif",
            color: "#1c1a29",
            margin: "0 0 10px",
          }}
        >
          Something Went Wrong
        </h2>

        <p
          style={{
            color: "#777386",
            fontSize: "13px",
            lineHeight: 1.6,
            margin: "0 0 24px",
          }}
        >
          An unexpected error occurred while processing this page. You can try reloading or return to the dashboard.
        </p>

        {error.digest && (
          <p
            style={{
              fontSize: "11px",
              color: "#9ca3af",
              fontFamily: "monospace",
              background: "#f9fafb",
              padding: "6px 10px",
              borderRadius: "6px",
              margin: "0 0 20px",
            }}
          >
            Error ID: {error.digest}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => reset()}
            style={{
              height: "40px",
              borderRadius: "9px",
              border: "0",
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
              borderRadius: "9px",
              border: "1px solid #e9e7ef",
              padding: "0 18px",
              background: "#fff",
              color: "#504c5c",
              fontWeight: 600,
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
            }}
          >
            <Home size={15} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
