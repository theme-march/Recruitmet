"use client";

export function ComponentSkeleton() {
  return (
    <div
      style={{
        maxWidth: "1600px",
        margin: "0 auto",
        animation: "fadeIn 0.2s ease-in-out",
      }}
    >
      {/* Header Skeleton */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "grid", gap: "8px" }}>
          <div
            className="skeleton-pulse"
            style={{ width: "140px", height: "12px", borderRadius: "6px", background: "var(--line)" }}
          />
          <div
            className="skeleton-pulse"
            style={{ width: "240px", height: "24px", borderRadius: "8px", background: "var(--line)" }}
          />
          <div
            className="skeleton-pulse"
            style={{ width: "320px", height: "14px", borderRadius: "6px", background: "var(--line)" }}
          />
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <div
            className="skeleton-pulse"
            style={{ width: "110px", height: "38px", borderRadius: "10px", background: "var(--line)" }}
          />
          <div
            className="skeleton-pulse"
            style={{ width: "130px", height: "38px", borderRadius: "10px", background: "var(--line)" }}
          />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="skeleton-pulse"
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "14px",
              padding: "16px 18px",
              height: "76px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ width: "70%", height: "12px", borderRadius: "4px", background: "var(--line)" }} />
            <div style={{ width: "40%", height: "22px", borderRadius: "6px", background: "var(--line)" }} />
          </div>
        ))}
      </div>

      {/* Main Table / Container Skeleton */}
      <div
        className="skeleton-pulse"
        style={{
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: "16px",
          padding: "20px 24px",
          minHeight: "380px",
          display: "grid",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ width: "260px", height: "36px", borderRadius: "10px", background: "var(--line)" }} />
          <div style={{ width: "120px", height: "36px", borderRadius: "10px", background: "var(--line)" }} />
        </div>
        {[1, 2, 3, 4, 5, 6].map((row) => (
          <div
            key={row}
            style={{
              width: "100%",
              height: "42px",
              borderRadius: "8px",
              background: "#fafafd",
              border: "1px solid var(--line)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
