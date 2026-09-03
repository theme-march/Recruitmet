export default function WorkspaceLoading() {
  return (
    <div style={{ padding: "24px 32px", maxWidth: "1600px", margin: "0 auto", opacity: 0.75, animation: "pulse 1.5s infinite ease-in-out" }}>
      {/* Top Breadcrumb & Title Skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <div style={{ height: "14px", width: "160px", background: "#e2e8f0", borderRadius: "4px", marginBottom: "8px" }} />
          <div style={{ height: "28px", width: "240px", background: "#cbd5e1", borderRadius: "6px" }} />
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ height: "36px", width: "110px", background: "#e2e8f0", borderRadius: "8px" }} />
          <div style={{ height: "36px", width: "130px", background: "#cbd5e1", borderRadius: "8px" }} />
        </div>
      </div>

      {/* KPI Stats Grid Skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: "92px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
            <div style={{ height: "12px", width: "80px", background: "#e2e8f0", borderRadius: "4px", marginBottom: "12px" }} />
            <div style={{ height: "24px", width: "120px", background: "#cbd5e1", borderRadius: "6px" }} />
          </div>
        ))}
      </div>

      {/* Main Table / Data Grid Skeleton */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ height: "38px", width: "280px", background: "#f1f5f9", borderRadius: "8px" }} />
          <div style={{ height: "38px", width: "180px", background: "#f1f5f9", borderRadius: "8px" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} style={{ height: "46px", width: "100%", background: "#f8fafc", borderRadius: "8px" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
