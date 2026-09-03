export default function CountryPipelineLoading() {
  return (
    <div style={{ padding: "24px 32px", maxWidth: "1600px", margin: "0 auto", opacity: 0.7, animation: "pulse 1.5s infinite ease-in-out" }}>
      <div style={{ height: "90px", width: "100%", background: "#f1f5f9", borderRadius: "14px", marginBottom: "24px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: "80px", background: "#f8fafc", borderRadius: "12px" }} />
        ))}
      </div>
      <div style={{ height: "400px", width: "100%", background: "#f8fafc", borderRadius: "16px" }} />
    </div>
  );
}
