import React, { useEffect, useState } from "react";
import { C, FONT, MONO, R, Icon, useIsMobile, goldGradient } from "../ui";

const NAV = [
  ["overview", "Overview", "dashboard"],
  ["inventory", "Plots", "domain"],
  ["customers", "Customers", "group"],
  ["agents", "Agents", "handshake"],
  ["leads", "Leads", "campaign"],
];

export default function Sidebar({ active, onSelect, onOpenSettings }) {
  const mobile = useIsMobile(900);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!mobile) return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open, mobile]);

  const activeLabel = NAV.find(([k]) => k === active)?.[1] ?? "";
  const select = (k) => { onSelect(k); setOpen(false); };
  const activeIndex = Math.max(0, NAV.findIndex(([k]) => k === active));
  const ITEM_H = 44, ITEM_GAP = 4;

  const navList = (
    <nav style={{ position: "relative", display: "flex", flexDirection: "column", gap: ITEM_GAP }}>
      {/* Sliding active-item pill — glides between nav rows instead of snapping */}
      <div aria-hidden="true" style={{
        position: "absolute", top: 0, left: 0, right: 0, height: ITEM_H, borderRadius: R.sm,
        background: goldGradient, boxShadow: "0 6px 18px -6px rgba(212,175,55,.5)",
        transform: `translateY(${activeIndex * (ITEM_H + ITEM_GAP)}px)`,
        transition: "transform .38s cubic-bezier(.16,1,.3,1)", zIndex: 0,
      }} />
      {NAV.map(([k, label, icon]) => (
        <button key={k} onClick={() => select(k)} className="cip-tap"
          style={{
            position: "relative", zIndex: 1, height: ITEM_H,
            textAlign: "left", padding: "0 14px", borderRadius: R.sm, fontFamily: MONO,
            fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", border: "none",
            display: "flex", alignItems: "center", gap: 10, background: "transparent",
            color: active === k ? "#1A1200" : C.muted, fontWeight: active === k ? 700 : 500,
            transition: "color .2s ease",
          }}>
          <Icon name={icon} size={18} style={{ fontVariationSettings: active === k ? "'FILL' 1" : undefined }} />
          {label}
        </button>
      ))}
      <div style={{ borderTop: `1px solid ${C.line}`, margin: "10px 4px 6px" }} />
      <button onClick={() => { onOpenSettings(); setOpen(false); }}
        style={{ textAlign: "left", padding: "11px 14px", borderRadius: R.sm, border: "none",
          background: "transparent", color: C.faint, fontSize: 12, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="settings" size={18} /> Settings
      </button>
    </nav>
  );

  if (!mobile) {
    return (
      <div className="cip-card" style={{ width: 220, flexShrink: 0, alignSelf: "flex-start", position: "sticky", top: 20,
        background: C.panel, border: `1px solid ${C.line}`, borderRadius: R.lg, padding: 10 }}>
        {navList}
      </div>
    );
  }

  // The fixed-position backdrop/drawer below must NOT be nested inside any
  // element carrying the cip-in-* entrance animations — those animate
  // `transform`, and a non-"none" transform on an ancestor (even a finished
  // one, held by animation-fill-mode) creates a new containing block, which
  // silently rescopes `position:fixed` descendants to that ancestor instead
  // of the viewport. Keep the drawer as a sibling, not a child, of the
  // animated topbar.
  return (
    <>
      <div style={{ marginBottom: 16, width: "100%" }} className="cip-in-fast">
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.panel, border: `1px solid ${C.line}`, borderRadius: R.md, padding: "12px 14px" }}>
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="cip-tap"
            style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: R.sm, width: 40, height: 40, color: C.ink, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="menu" size={20} />
          </button>
          <span style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, textTransform: "uppercase", color: C.ink }}>{activeLabel}</span>
          <button onClick={onOpenSettings} aria-label="Settings" className="cip-tap"
            style={{ marginLeft: "auto", background: "none", border: `1px solid ${C.line}`, borderRadius: R.sm, width: 40, height: 40, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="settings" size={18} />
          </button>
        </div>
      </div>

      {open && (
        <div onClick={() => setOpen(false)} className="cip-in-fade"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", backdropFilter: "blur(3px)", zIndex: 90 }}>
          <div onClick={(e) => e.stopPropagation()} className="cip-drawer-in"
            style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "min(78vw,300px)", background: C.panel,
              borderRight: `1px solid ${C.line}`, boxShadow: "8px 0 30px -10px rgba(0,0,0,.6)", padding: "18px 18px calc(18px + env(safe-area-inset-bottom))", overflowY: "auto" }}>
            <div style={{ fontFamily: MONO, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: C.goldLt, marginBottom: 18 }}>Menu</div>
            {navList}
          </div>
        </div>
      )}
    </>
  );
}
