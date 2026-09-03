import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "75vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "460px",
          width: "100%",
          background: "#fff",
          borderRadius: "16px",
          border: "1px solid #e9e7ef",
          boxShadow: "0 10px 30px rgba(30, 24, 60, 0.06)",
          padding: "40px 32px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "14px",
            background: "#f0edff",
            color: "#7258e8",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 20px",
          }}
        >
          <FileQuestion size={30} />
        </div>

        <span
          style={{
            font: "800 48px/1 var(--font-manrope, Manrope), sans-serif",
            color: "#7258e8",
            display: "block",
            marginBottom: "8px",
          }}
        >
          404
        </span>

        <h2
          style={{
            font: "800 20px/1.3 var(--font-manrope, Manrope), sans-serif",
            color: "#1c1a29",
            margin: "0 0 10px",
          }}
        >
          Page Not Found
        </h2>

        <p
          style={{
            color: "#777386",
            fontSize: "13px",
            lineHeight: 1.6,
            margin: "0 0 24px",
          }}
        >
          The page or recruitment dossier you requested does not exist or may have been moved.
        </p>

        <Link
          href="/dashboard"
          style={{
            height: "42px",
            borderRadius: "9px",
            border: "0",
            padding: "0 22px",
            background: "#7258e8",
            color: "#fff",
            fontWeight: 700,
            fontSize: "13px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            textDecoration: "none",
            boxShadow: "0 6px 16px rgba(114, 88, 232, 0.25)",
          }}
        >
          <ArrowLeft size={16} /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
