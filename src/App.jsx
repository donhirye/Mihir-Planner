import { useState } from "react";

export default function App() {
  const [screen, setScreen] = useState(0);
  const screens = ["Annual", "Quarterly", "Weekly Merge", "Timetable", "Retro"];

  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#F8F7F5", minHeight: "100vh", display: "flex" }}>
      <div style={{ width: 180, background: "#111827", display: "flex", flexDirection: "column", padding: "24px 0" }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #374151" }}>
          <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Wi-Tronix</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#F9FAFB" }}>My Planner</div>
        </div>
        <nav style={{ flex: 1, padding: "16px 0" }}>
          {screens.map((n, i) => (
            <button key={n} onClick={() => setScreen(i)} style={{
              display: "flex", alignItems: "center", width: "100%",
              padding: "10px 20px", background: screen === i ? "#1D4ED8" : "none",
              border: "none", cursor: "pointer", color: screen === i ? "#fff" : "#9CA3AF",
              fontSize: 12, fontFamily: "inherit", fontWeight: screen === i ? 700 : 400
            }}>{n}</button>
          ))}
        </nav>
      </div>
      <div style={{ flex: 1, padding: "32px 28px" }}>
        <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.15em" }}>Wi-Tronix · 2026</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 16px" }}>{screens[screen]}</h2>
        <div style={{ background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "24px" }}>
          <p style={{ color: "#6B7280", fontSize: 14 }}>App is loading. Full functionality coming next.</p>
        </div>
      </div>
    </div>
  );
}
