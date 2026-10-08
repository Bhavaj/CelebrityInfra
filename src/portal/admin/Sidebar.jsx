import React, { useEffect, useState } from "react";
import { C, DISPLAY, WORDMARK, LABEL, Icon, useIsMobile, Crest } from "../ui";

const NAV = [
  ["overview", "Overview", "dashboard"],
  ["inventory", "Plots", "grid_view"],
  ["customers", "Customers", "group"],
  ["agents", "Agents", "handshake"],
  ["leads", "Leads", "campaign"],
];

const ITEM_H = 44, ITEM_GAP = 4;

export default function Sidebar({ active, onSelect, onOpenSettings }) {
  const mobile = useIsMobile(900);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!mobile) return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open, mobile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const activeLabel = NAV.find(([k]) => k === active)?.[1] ?? "";
  const select = (k) => { onSelect(k); setOpen(false); };
  const activeIndex = Math.max(0, NAV.findIndex(([k]) => k === active));

  const navList = (
    <nav aria-label="Admin sections">
      <div style={{ ...LABEL, padding: "0 14px 12px" }}>Workspace</div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: ITEM_GAP }}>
        {/* Gold indicator glides between rows instead of snapping */}
        <div aria-hidden="true" style={{
          position: "absolute", left: 0, top: 0, width: 2, height: ITEM_H - 20, borderRadius: 2, background: C.gold, zIndex: 1,
          transform: `translateY(${activeIndex * (ITEM_H + ITEM_GAP) + 10}px)`,
          transition: "transform .45s var(--ease-out)",
        }} />
        {NAV.map(([k, label, icon]) => {
          const isActive = active === k;
          return (
            <button key={k} type="button" onClick={() => select(k)} aria-current={isActive ? "page" : undefined}
              className={isActive ? "cip-nav-item is-active" : "cip-nav-item"}>
              <Icon name={icon} size={20} />
              {label}
            </button>
          );
        })}
      </div>
      <div style={{ borderTop: `1px solid ${C.line}`, margin: "18px 14px 14px" }} />
      <button type="button" onClick={() => { onOpenSettings(); setOpen(false); }} className="cip-nav-item">
        <Icon name="tune" size={20} /> Settings
      </button>
    </nav>
  );

  if (!mobile) {
    return (
      <aside style={{ width: 228, flexShrink: 0, alignSelf: "flex-start", position: "sticky", top: "calc(var(--portal-topbar-h) + 32px)", paddingTop: 6 }}>
        {navList}
      </aside>
    );
  }

  // The fixed-position backdrop/drawer below must NOT be nested inside any
  // element carrying the cip-in-* entrance animations — a transformed
  // ancestor becomes the containing block for `position:fixed` descendants.
  // Keep the drawer as a sibling, not a child, of the animated bar.
  return (
    <>
      <div style={{ marginBottom: 20, width: "100%" }} className="cip-in-fast">
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 999, padding: 6 }}>
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="cip-btn cip-btn-outline cip-btn-sm" style={{ minHeight: 44, paddingLeft: 14 }}>
            <Icon name="menu" size={20} /> Menu
          </button>
          <span style={{ ...LABEL, color: C.muted }} aria-hidden="true">{activeLabel}</span>
          <button type="button" onClick={onOpenSettings} aria-label="Settings" className="cip-icon-btn" style={{ marginLeft: "auto", width: 44, height: 44 }}>
            <Icon name="tune" size={20} />
          </button>
        </div>
      </div>

      {open && (
        <div onClick={() => setOpen(false)} className="cip-in-fade"
          style={{ position: "fixed", inset: 0, background: "var(--portal-overlay)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 90 }}>
          <div onClick={(e) => e.stopPropagation()} className="cip-drawer-in" role="dialog" aria-modal="true" aria-label="Menu"
            style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "min(82vw, 312px)", background: C.bg2,
              borderRight: `1px solid ${C.line}`, padding: "calc(20px + env(safe-area-inset-top)) 14px calc(20px + env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left))", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 6px 0 10px", marginBottom: 28 }}>
              <a href="/" aria-label="Back to celebrityinfra.in" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Crest size={36} />
                <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontFamily: WORDMARK, fontSize: 14, fontWeight: 600, letterSpacing: "0.2em", lineHeight: 1, color: C.ink }}>CELEBRITY</span>
                  <span style={{ ...LABEL, fontSize: 9, letterSpacing: "0.28em", color: C.gold }}>Admin</span>
                </span>
              </a>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="cip-icon-btn" style={{ marginLeft: "auto" }}>
                <Icon name="close" size={20} />
              </button>
            </div>
            {navList}
          </div>
        </div>
      )}
    </>
  );
}
