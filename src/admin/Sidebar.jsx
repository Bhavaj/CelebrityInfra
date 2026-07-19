import React, { useEffect, useState } from "react";
import { C, useIsMobile } from "../ui";

const NAV = [
  ["overview", "Overview"],
  ["inventory", "Inventory"],
  ["customers", "Customers"],
  ["partners", "Partners"],
  ["leads", "Leads"],
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
      {NAV.map(([k, label]) => (
        <button key={k} onClick={() => select(k)}
          style={{
            textAlign: "left", padding: "9px 14px", borderRadius: 6, fontFamily: "'Jost',sans-serif",
            fontSize: 13.5, letterSpacing: 0.2, cursor: "pointer", border: "none",
            background: active === k ? "rgba(201,162,39,.08)" : "transparent",
            borderLeft: `2px solid ${active === k ? C.gold : "transparent"}`,
            color: active === k ? C.goldLt : C.muted, fontWeight: active === k ? 600 : 400,
            transition: "background .15s ease, color .15s ease",
          }}>
          {label}
        </button>
      ))}
      <div style={{ borderTop: `1px solid ${C.line}`, margin: "10px 4px 6px" }} />
      <button onClick={() => { onOpenSettings(); setOpen(false); }}
        style={{ textAlign: "left", padding: "9px 14px", borderRadius: 6, border: "none",
          background: "transparent", color: C.faint, fontSize: 13, fontFamily: "'Jost',sans-serif", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8 }}>
        <span aria-hidden="true" style={{ fontSize: 13 }}>⚙</span> Settings
      </button>
    </nav>
  );

  if (!mobile) {
    return (
      <div className="cip-card" style={{ width: 200, flexShrink: 0, alignSelf: "flex-start", position: "sticky", top: 20,
        background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: 14, boxShadow: "0 1px 0 rgba(255,255,255,.02) inset, 0 10px 24px rgba(0,0,0,.28)" }}>
        {navList}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px" }}>
        <button onClick={() => setOpen(true)} aria-label="Open menu"
          style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 8, width: 38, height: 38, color: C.ink, fontSize: 18, cursor: "pointer" }}>
          ☰
        </button>
        <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontWeight: 600, color: C.ink }}>{activeLabel}</span>
        <button onClick={onOpenSettings} aria-label="Settings"
          style={{ marginLeft: "auto", background: "none", border: `1px solid ${C.line}`, borderRadius: 8, width: 38, height: 38, color: C.muted, fontSize: 16, cursor: "pointer" }}>
          ⚙
        </button>
      </div>

      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(4,5,7,.72)", backdropFilter: "blur(3px)", zIndex: 90 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "min(78vw,300px)", background: C.panel,
              borderRight: `1px solid ${C.line}`, padding: 18, overflowY: "auto" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 600, color: C.goldLt, marginBottom: 18 }}>Menu</div>
            {navList}
          </div>
        </div>
      )}
    </div>
  );
}
