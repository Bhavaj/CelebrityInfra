import React, { useEffect, useState } from "react";
import { C, FONT, MONO, Icon, useIsMobile } from "../ui";

const NAV = [
  ["overview", "Overview", "dashboard"],
  ["inventory", "Inventory", "domain"],
  ["customers", "Customers", "group"],
  ["partners", "Partners", "handshake"],
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

  const navList = (
    <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {NAV.map(([k, label, icon]) => (
        <button key={k} onClick={() => select(k)}
          className={active === k ? "cip-glow" : undefined}
          style={{
            textAlign: "left", padding: "11px 14px", borderRadius: 0, fontFamily: MONO,
            fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", border: "none",
            display: "flex", alignItems: "center", gap: 10,
            background: active === k ? C.goldLt : "transparent",
            color: active === k ? "#1A1200" : C.muted, fontWeight: active === k ? 700 : 500,
            transition: "background .15s ease, color .15s ease",
          }}>
          <Icon name={icon} size={18} style={{ fontVariationSettings: active === k ? "'FILL' 1" : undefined }} />
          {label}
        </button>
      ))}
      <div style={{ borderTop: `1px solid ${C.line}`, margin: "10px 4px 6px" }} />
      <button onClick={() => { onOpenSettings(); setOpen(false); }}
        style={{ textAlign: "left", padding: "11px 14px", borderRadius: 0, border: "none",
          background: "transparent", color: C.faint, fontSize: 12, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="settings" size={18} /> Settings
      </button>
    </nav>
  );

  if (!mobile) {
    return (
      <div className="cip-card" style={{ width: 220, flexShrink: 0, alignSelf: "flex-start", position: "sticky", top: 20,
        background: C.panel, border: `1px solid ${C.line}`, borderRadius: 0, padding: 10 }}>
        {navList}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 0, padding: "12px 14px" }}>
        <button onClick={() => setOpen(true)} aria-label="Open menu"
          style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 0, width: 38, height: 38, color: C.ink, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="menu" size={20} />
        </button>
        <span style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, textTransform: "uppercase", color: C.ink }}>{activeLabel}</span>
        <button onClick={onOpenSettings} aria-label="Settings"
          style={{ marginLeft: "auto", background: "none", border: `1px solid ${C.line}`, borderRadius: 0, width: 38, height: 38, color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="settings" size={18} />
        </button>
      </div>

      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", backdropFilter: "blur(3px)", zIndex: 90 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "min(78vw,300px)", background: C.panel,
              borderRight: `1px solid ${C.line}`, padding: 18, overflowY: "auto" }}>
            <div style={{ fontFamily: MONO, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: C.goldLt, marginBottom: 18 }}>Menu</div>
            {navList}
          </div>
        </div>
      )}
    </div>
  );
}
