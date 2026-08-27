export default function DashboardLoading() {
  return (
    <div style={{ padding: "24px 32px", maxWidth: "1600px", margin: "0 auto", opacity: 0.7, animation: "pulse 1.5s infinite ease-in-out" }}>
      {/* Top Banner Skeleton */}
      <div style={{ height: "100px", width: "100%", background: "#f1f5f9", borderRadius: "16px", marginBottom: "20px" }} />
      {/* KPI Cards Grid Skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: "90px", background: "#f8fafc", borderRadius: "14px" }} />
        ))}
      </div>
      {/* Table Skeleton */}
      <div style={{ height: "380px", width: "100%", background: "#f8fafc", borderRadius: "16px" }} />
    </div>
  );
}
