export default function SuperAdminLoading() {
  return (
    <div style={{ padding: "32px", maxWidth: "1500px", margin: "0 auto", opacity: 0.75, animation: "pulse 1.5s infinite ease-in-out" }}>
      {/* Super Admin Top Banner Skeleton */}
      <div style={{ height: "70px", width: "100%", background: "#1e1b4b", opacity: 0.1, borderRadius: "14px", marginBottom: "28px" }} />

      {/* Header Skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <div style={{ height: "14px", width: "180px", background: "#e2e8f0", borderRadius: "4px", marginBottom: "8px" }} />
          <div style={{ height: "32px", width: "300px", background: "#cbd5e1", borderRadius: "8px" }} />
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ height: "40px", width: "130px", background: "#e2e8f0", borderRadius: "10px" }} />
          <div style={{ height: "40px", width: "140px", background: "#cbd5e1", borderRadius: "10px" }} />
        </div>
      </div>

      {/* Control Tabs Skeleton */}
      <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "24px" }}>
        {[1, 2, 3, 4, 5, 6].map((t) => (
          <div key={t} style={{ height: "36px", width: "120px", background: "#f1f5f9", borderRadius: "8px" }} />
        ))}
      </div>

      {/* Table Skeleton */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px" }}>
        <div style={{ height: "44px", width: "100%", background: "#f8fafc", borderRadius: "8px", marginBottom: "16px" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
            <div key={row} style={{ height: "48px", width: "100%", background: "#f8fafc", borderRadius: "8px" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
