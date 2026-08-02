import React from "react";
import { C, FONT, MONO, R, Crest, useTilt } from "../ui";

export default function AuthShell({ eyebrow, title, subtitle, children }) {
  const tilt = useTilt(5);
  return (
    <div style={{
      position: "relative", overflow: "hidden",
      minHeight: "100dvh", display: "grid", placeItems: "center", padding: "32px 16px", fontFamily: FONT,
      background:
        "radial-gradient(60% 50% at 50% 0%, rgba(16,185,129,.11), transparent 60%), radial-gradient(55% 45% at 100% 100%, rgba(217,164,65,.06), transparent 55%), #101314",
    }}>
      <div className="cip-orbit" aria-hidden="true">
        <div className="cip-ring r3" /><div className="cip-ring r1" /><div className="cip-ring r2" />
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420 }}>
        <div className="cip-in-fast" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, justifyContent: "center" }}>
          <Crest size={48} />
          <div>
            <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.goldLt }}>Celebrity</div>
            <div style={{ fontSize: 9, letterSpacing: "0.25em", color: C.faint, fontFamily: MONO }}>INFRA PVT LTD</div>
          </div>
        </div>

        <div className="cip-card cip-in cip-tilt" {...tilt} style={{ background: "rgba(23,27,26,.72)", backdropFilter: "blur(16px)", border: `1px solid ${C.line}`, borderTop: `3px solid ${C.goldLt}`, borderRadius: R.lg, boxShadow: "0 24px 60px -24px rgba(0,0,0,.6)", padding: "clamp(22px, 6vw, 32px) clamp(20px, 5vw, 30px)" }}>
          {eyebrow && <div style={{ fontSize: 11, letterSpacing: "0.2em", color: C.goldLt, textTransform: "uppercase", marginBottom: 8, fontWeight: 600, fontFamily: MONO }}>{eyebrow}</div>}
          <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: "clamp(22px, 5vw, 28px)", color: C.ink, margin: "0 0 6px" }}>{title}</h1>
          {subtitle && <p style={{ color: C.muted, fontSize: 13.5, letterSpacing: 0.3, marginBottom: 26, lineHeight: 1.5 }}>{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
