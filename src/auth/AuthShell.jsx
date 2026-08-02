import React from "react";
import { C, DISPLAY, FONT, MONO, R, Crest, useTilt, useIsMobile } from "../ui";

// Split-screen shell: a branded panel (crest, tagline, rotating 3D rings)
// on one side, the actual sign-in card on the other — replaces the old
// single centered card so the login screens read as a deliberate layout,
// not a generic modal floating on a gradient.
export default function AuthShell({ eyebrow, title, subtitle, children }) {
  const mobile = useIsMobile(860);
  const tilt = useTilt(4);

  const brandPanel = (
    <div style={{
      position: "relative", overflow: "hidden", flex: mobile ? "none" : "0 0 42%",
      display: "flex", flexDirection: "column", justifyContent: mobile ? "flex-start" : "center",
      padding: mobile ? "28px 24px 22px" : "60px 56px",
      background: "radial-gradient(120% 90% at 20% 0%, rgba(16,185,129,.16), transparent 60%), radial-gradient(90% 70% at 100% 100%, rgba(217,164,65,.08), transparent 55%), #12211b",
      borderBottom: mobile ? `1px solid ${C.line}` : "none",
      borderRight: mobile ? "none" : `1px solid ${C.line}`,
    }}>
      {!mobile && (
        <div className="cip-orbit" aria-hidden="true" style={{ opacity: .7 }}>
          <div className="cip-ring r3" /><div className="cip-ring r1" /><div className="cip-ring r2" />
        </div>
      )}
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12 }} className="cip-in-fast">
        <Crest size={mobile ? 36 : 44} />
        <div>
          <div style={{ fontFamily: DISPLAY, fontSize: mobile ? 17 : 20, fontWeight: 600, color: C.ink }}>Celebrity Infra</div>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", color: C.faint, fontFamily: MONO, textTransform: "uppercase" }}>Pvt Ltd</div>
        </div>
      </div>
      {!mobile && (
        <div className="cip-in-fast" style={{ position: "relative", zIndex: 1, marginTop: 40, maxWidth: 320 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 28, fontWeight: 600, lineHeight: 1.25, color: C.ink }}>
            One workspace for plots, sales &amp; your team.
          </div>
          <p style={{ marginTop: 14, fontSize: 14.5, color: C.muted, lineHeight: 1.6 }}>
            Track inventory, commissions, and customer records from Celebrity's Park‑1 — built for admins, agents, and plot owners alike.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: mobile ? "column" : "row",
      fontFamily: FONT, background: "#101314",
    }}>
      {brandPanel}

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: mobile ? "28px 18px 40px" : "40px 32px" }}>
        <div className="cip-card cip-in cip-tilt" {...tilt} style={{ width: "100%", maxWidth: 400 }}>
          {eyebrow && <div style={{ fontSize: 11.5, letterSpacing: "0.1em", color: C.gold, textTransform: "uppercase", marginBottom: 8, fontWeight: 600, fontFamily: FONT }}>{eyebrow}</div>}
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: "clamp(22px, 4vw, 27px)", color: C.ink, margin: "0 0 6px" }}>{title}</h1>
          {subtitle && <p style={{ color: C.muted, fontSize: 14, marginBottom: 26, lineHeight: 1.55 }}>{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
