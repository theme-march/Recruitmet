export default function AdminLoading() {
  return (
    <div style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto", opacity: 0.75, animation: "pulse 1.5s infinite ease-in-out" }}>
      {/* Admin Header Skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <div style={{ height: "14px", width: "140px", background: "#e2e8f0", borderRadius: "4px", marginBottom: "8px" }} />
          <div style={{ height: "32px", width: "260px", background: "#cbd5e1", borderRadius: "8px" }} />
        </div>
        <div style={{ height: "40px", width: "160px", background: "#e2e8f0", borderRadius: "10px" }} />
      </div>

      {/* Tabs Skeleton */}
      <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "24px" }}>
        {[1, 2, 3, 4, 5].map((t) => (
          <div key={t} style={{ height: "36px", width: "110px", background: "#f1f5f9", borderRadius: "8px" }} />
        ))}
      </div>

      {/* Control Plane Table Skeleton */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ height: "38px", width: "300px", background: "#f8fafc", borderRadius: "8px" }} />
          <div style={{ height: "38px", width: "120px", background: "#f8fafc", borderRadius: "8px" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {[1, 2, 3, 4, 5, 6, 7].map((row) => (
            <div key={row} style={{ height: "48px", width: "100%", background: "#f8fafc", borderRadius: "8px" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
