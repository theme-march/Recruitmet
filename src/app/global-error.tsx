"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Critical Global Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#f7f7fa",
          color: "#1c1a29",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            maxWidth: "460px",
            width: "100%",
            background: "#fff",
            borderRadius: "16px",
            border: "1px solid #e9e7ef",
            padding: "36px 32px",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
          }}
        >
          <h2 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 10px" }}>
            Critical System Error
          </h2>
          <p style={{ color: "#6b7280", fontSize: "14px", lineHeight: 1.5, margin: "0 0 24px" }}>
            A critical application error occurred. Please refresh or try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              height: "40px",
              padding: "0 20px",
              background: "#7258e8",
              color: "#fff",
              border: 0,
              borderRadius: "8px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Refresh Application
          </button>
        </div>
      </body>
    </html>
  );
}
