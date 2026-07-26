import React from "react";
import { C, FONT, MONO, R, Crest } from "../ui";

export default function AuthShell({ eyebrow, title, subtitle, children }) {
  return (
    <div style={{
      minHeight: "100dvh", display: "grid", placeItems: "center", padding: "32px 16px", fontFamily: FONT,
      background:
        "radial-gradient(60% 50% at 50% 0%, rgba(242,202,80,.1), transparent 60%), radial-gradient(55% 45% at 100% 100%, rgba(47,191,143,.06), transparent 55%), #000000",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div className="cip-in-fast" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, justifyContent: "center" }}>
          <Crest size={48} />
          <div>
            <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.goldLt }}>Celebrity</div>
            <div style={{ fontSize: 9, letterSpacing: "0.25em", color: C.faint, fontFamily: MONO }}>INFRA PVT LTD</div>
          </div>
        </div>

        <div className="cip-card cip-in" style={{ background: "rgba(18,19,23,.7)", backdropFilter: "blur(16px)", border: `1px solid ${C.line}`, borderTop: `3px solid ${C.goldLt}`, borderRadius: R.lg, boxShadow: "0 24px 60px -24px rgba(0,0,0,.6)", padding: "clamp(22px, 6vw, 32px) clamp(20px, 5vw, 30px)" }}>
          {eyebrow && <div style={{ fontSize: 11, letterSpacing: "0.2em", color: C.goldLt, textTransform: "uppercase", marginBottom: 8, fontWeight: 600, fontFamily: MONO }}>{eyebrow}</div>}
          <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: "clamp(22px, 5vw, 28px)", color: C.ink, margin: "0 0 6px" }}>{title}</h1>
          {subtitle && <p style={{ color: C.muted, fontSize: 13.5, letterSpacing: 0.3, marginBottom: 26, lineHeight: 1.5 }}>{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
