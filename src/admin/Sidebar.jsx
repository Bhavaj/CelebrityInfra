import React, { useEffect, useState } from "react";
import { C, DISPLAY, FONT, R, Icon, useIsMobile, Crest } from "../ui";

const NAV = [
  ["overview", "Overview", "dashboard"],
  ["inventory", "Plots", "domain"],
  ["customers", "Customers", "group"],
  ["agents", "Agents", "handshake"],
  ["leads", "Leads", "campaign"],
];

const ITEM_H = 38, ITEM_GAP = 2;

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

  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 6px 14px" }}>
      <Crest size={38} />
      <div style={{ overflow: "hidden" }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 13.5, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Celebrity Infra</div>
        <div style={{ fontFamily: FONT, fontSize: 11.5, color: C.gold, fontWeight: 500 }}>Admin workspace</div>
      </div>
    </div>
  );

  const navList = (
    <nav>
      {header}
      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: C.faint, padding: "0 10px 8px" }}>Workspace</div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: ITEM_GAP }}>
        {/* Sliding left-accent bar — glides between nav rows instead of snapping */}
        <div aria-hidden="true" style={{
          position: "absolute", left: -6, width: 3, height: ITEM_H - 10, borderRadius: R.pill, background: C.gold,
          transform: `translateY(${activeIndex * (ITEM_H + ITEM_GAP) + 5}px)`,
          transition: "transform .38s cubic-bezier(.16,1,.3,1)", boxShadow: `0 0 10px ${C.gold}88`,
        }} />
        {NAV.map(([k, label, icon]) => {
          const isActive = active === k;
          return (
            <button key={k} onClick={() => select(k)} className="cip-tap"
              style={{
                height: ITEM_H, textAlign: "left", padding: "0 12px", borderRadius: R.sm, fontFamily: FONT,
                fontSize: 13.5, cursor: "pointer", border: "none",
                display: "flex", alignItems: "center", gap: 10,
                background: isActive ? C.goldSoft : "transparent",
                color: isActive ? C.goldLt : C.muted, fontWeight: isActive ? 600 : 500,
                transition: "color .2s ease, background .2s ease",
              }}>
              <Icon name={icon} size={18} style={{ fontVariationSettings: isActive ? "'FILL' 1" : undefined }} />
              {label}
            </button>
          );
        })}
      </div>
      <div style={{ borderTop: `1px solid ${C.line}`, margin: "14px 4px 8px" }} />
      <button onClick={() => { onOpenSettings(); setOpen(false); }} className="cip-tap"
        style={{ width: "100%", textAlign: "left", padding: "0 12px", height: ITEM_H, borderRadius: R.sm, border: "none",
          background: "transparent", color: C.faint, fontSize: 13.5, fontFamily: FONT, fontWeight: 500, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="settings" size={18} /> Settings
      </button>
    </nav>
  );

  if (!mobile) {
    return (
      <div className="cip-card" style={{ width: 236, flexShrink: 0, alignSelf: "flex-start", position: "sticky", top: 20,
        background: C.panel, border: `1px solid ${C.line}`, borderRadius: R.lg, padding: "14px 12px", boxShadow: "0 16px 40px -22px rgba(0,0,0,.6)" }}>
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
          <span style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 600, color: C.ink }}>{activeLabel}</span>
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
            {navList}
          </div>
        </div>
      )}
    </>
  );
}
