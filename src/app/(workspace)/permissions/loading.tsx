export default function PermissionsLoading() {
  return (
    <div style={{ padding: "24px 32px", maxWidth: "1600px", margin: "0 auto", opacity: 0.7, animation: "pulse 1.5s infinite ease-in-out" }}>
      <div style={{ height: "80px", width: "100%", background: "#f1f5f9", borderRadius: "12px", marginBottom: "20px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
        <div style={{ height: "500px", background: "#f8fafc", borderRadius: "14px" }} />
        <div style={{ height: "500px", background: "#f8fafc", borderRadius: "14px" }} />
      </div>
    </div>
  );
}
