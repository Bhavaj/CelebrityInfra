import React from "react";
import { C, FONT, MONO, Crest } from "../ui";

export default function AuthShell({ eyebrow, title, subtitle, children }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "grid", placeItems: "center", padding: 20, fontFamily: FONT }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, justifyContent: "center" }}>
          <Crest size={40} />
          <div>
            <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.goldLt }}>Celebrity</div>
            <div style={{ fontSize: 9, letterSpacing: "0.25em", color: C.faint, fontFamily: MONO }}>INFRA PVT LTD</div>
          </div>
        </div>

        <div className="cip-card" style={{ background: "rgba(18,19,23,.7)", backdropFilter: "blur(16px)", border: `1px solid ${C.line}`, borderTop: `3px solid ${C.goldLt}`, borderRadius: 0, padding: "32px 30px" }}>
          {eyebrow && <div style={{ fontSize: 11, letterSpacing: "0.2em", color: C.goldLt, textTransform: "uppercase", marginBottom: 8, fontWeight: 600, fontFamily: MONO }}>{eyebrow}</div>}
          <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 28, color: C.ink, margin: "0 0 6px" }}>{title}</h1>
          {subtitle && <p style={{ color: C.muted, fontSize: 13.5, letterSpacing: 0.3, marginBottom: 26, lineHeight: 1.5 }}>{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
