import React from "react";
import { C, DISPLAY, FONT, WORDMARK, LABEL, Crest, useIsMobile } from "../ui";
import SitePlan, { Compass } from "./SitePlan";

// Split-screen shell: a brand panel (crest, wordmark and a drawn-in site
// plan of the estate) beside the sign-in column. On phones the brand panel
// collapses into a short band above the form.
export default function AuthShell({ eyebrow, title, subtitle, children }) {
  const mobile = useIsMobile(860);

  const brand = (
    <a href="/" aria-label="Back to celebrityinfra.in" style={{ position: "relative", zIndex: 1, display: "inline-flex", alignItems: "center", gap: 14, color: C.ink, alignSelf: "flex-start" }}>
      <Crest size={mobile ? 40 : 52} />
      <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontFamily: WORDMARK, fontSize: mobile ? 17 : 21, fontWeight: 600, letterSpacing: "0.2em", lineHeight: 1, color: C.ink }}>CELEBRITY</span>
        <span style={{ ...LABEL, fontSize: 9.5, letterSpacing: "0.32em", color: C.gold }}>Infra Pvt Ltd</span>
      </span>
    </a>
  );

  const brandPanel = mobile ? (
    <div style={{
      position: "relative", overflow: "hidden", height: 196, flex: "none",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      padding: "calc(22px + env(safe-area-inset-top)) 20px 20px",
      background: C.bg2, borderBottom: `1px solid ${C.line}`,
    }}>
      <SitePlan compact />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(18,16,12,.55) 0%, transparent 45%, rgba(18,16,12,.85) 100%)" }} />
      {brand}
      <div style={{ position: "relative", zIndex: 1, ...LABEL, color: C.muted }}>Celebrity's Park‑1 portal</div>
    </div>
  ) : (
    <div style={{
      position: "relative", overflow: "hidden", flex: "0 0 46%", minHeight: "100dvh",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      padding: "clamp(40px, 5vw, 64px) clamp(40px, 5vw, 72px)",
      background: C.bg2, borderRight: `1px solid ${C.line}`,
    }}>
      <SitePlan />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(18,16,12,.7) 0%, transparent 28%, transparent 52%, rgba(18,16,12,.94) 86%)" }} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
        {brand}
        <Compass />
      </div>
      <div className="cip-in" style={{ position: "relative", zIndex: 1, maxWidth: 440, animationDelay: ".5s" }}>
        <div style={{ ...LABEL, color: C.gold, marginBottom: 18 }}>Celebrity's Park‑1</div>
        <div style={{ fontFamily: DISPLAY, fontSize: "clamp(34px, 3.2vw, 46px)", fontWeight: 500, lineHeight: 1.08, color: C.ink, letterSpacing: "-0.01em" }}>
          Every plot, payment and partner, in one ledger.
        </div>
        <p style={{ marginTop: 18, fontSize: 15.5, color: C.muted, lineHeight: 1.65, maxWidth: 380 }}>
          The private workspace for our team, our agents and the families who own a plot at Celebrity's Park‑1.
        </p>
      </div>
    </div>
  );

  return (
    <div className="cip-auth" style={{
      minHeight: "100dvh", display: "flex", flexDirection: mobile ? "column" : "row",
      fontFamily: FONT, background: C.bg,
    }}>
      {brandPanel}

      <main style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: mobile ? "flex-start" : "center",
        padding: mobile ? "32px 20px calc(40px + env(safe-area-inset-bottom))" : "64px clamp(32px, 5vw, 80px)",
      }}>
        <div className="cip-in" style={{ width: "100%", maxWidth: 420 }}>
          {eyebrow && <div style={{ ...LABEL, color: C.gold, marginBottom: 14 }}>{eyebrow}</div>}
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: mobile ? 38 : 48, lineHeight: 1.02, letterSpacing: "-0.01em", color: C.ink, margin: "0 0 12px" }}>{title}</h1>
          {subtitle && <p style={{ color: C.muted, fontSize: 15.5, marginBottom: mobile ? 28 : 36, lineHeight: 1.55 }}>{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}
