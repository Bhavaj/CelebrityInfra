import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import logoUrl from "./assets/celebrity-logo.png";

// "Royal Gold" — every previous pass called its primary accent "gold" while
// the actual hex values underneath were emerald green (#10B981), which is
// why the site kept reading green no matter what else changed. This pass
// fixes the tokens themselves: gold is now really gold (matching the actual
// crest logo), a deep wine red is the secondary accent, and green is
// demoted to what it should have been all along — a small functional status
// color, not the brand's dominant hue. Panels stay flat/hairline-bordered
// (no glass/tilt/glow) per the prior "not a template" pass.
export const C = {
  bg: "#0B0A08", panel: "#16130D", panel2: "#1C1811", field: "#191510",
  ink: "#F6F0E2", muted: "#B4A78F", faint: "#786C56",
  navy: "#101A33", navy2: "#182848", steel: "#8A97A8",
  gold: "#C9A227", goldLt: "#E7C665", goldDeep: "#8A6D1B", goldSoft: "rgba(201,162,39,.16)",
  wine: "#7A1F2B", wineLt: "#A5333F", wineDeep: "#4E1119", wineSoft: "rgba(122,31,43,.16)",
  emerald: "#1F8A55", emeraldLt: "#34B378", emeraldDeep: "#0F5C37", emeraldSoft: "rgba(31,138,85,.14)",
  line: "#2E2A20", lineGold: "rgba(201,162,39,.32)",
  green: "#2DD4BF", red: "#E2685A",
};

export const DISPLAY = "'Space Grotesk',sans-serif";
export const FONT = "'Inter',sans-serif";
export const MONO = "'JetBrains Mono',monospace";

export const R = { sm: 6, md: 10, lg: 14, xl: 16, pill: 999 };
export const goldGradient = `linear-gradient(135deg, ${C.goldLt} 0%, ${C.gold} 100%)`;

export const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
export const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const todayISO = () => new Date().toISOString().slice(0, 10);

export function useIsMobile(breakpoint = 640) {
  const query = `(max-width: ${breakpoint}px)`;
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener ? mql.addEventListener("change", onChange) : mql.addListener(onChange);
    return () => (mql.removeEventListener ? mql.removeEventListener("change", onChange) : mql.removeListener(onChange));
  }, [query]);
  return isMobile;
}

// Kept for the auth screens (RoleChooser/AuthShell), which still use a subtle
// pointer-tilt on their single hero card — not used by the admin/portal
// surfaces below anymore (see file header note).
export function useTilt(strength = 7) {
  return {
    onPointerMove: (e) => {
      if (e.pointerType !== "mouse") return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--ry", (px * strength).toFixed(2) + "deg");
      el.style.setProperty("--rx", (-py * strength).toFixed(2) + "deg");
      el.style.setProperty("--tilt-scale", "1.012");
    },
    onPointerLeave: (e) => {
      const el = e.currentTarget;
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--tilt-scale", "1");
    },
  };
}

export function Icon({ name, size = 20, style }) {
  return (
    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: size, lineHeight: 1, ...style }}>
      {name}
    </span>
  );
}

export function TableScroll({ children, minWidth = 560 }) {
  return (
    <div className="cip-scroll-x" style={{ margin: "0 -2px" }}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}

export function Empty({ children }) {
  return (
    <div style={{ textAlign: "center", color: C.muted, fontSize: 14, padding: "26px 16px", lineHeight: 1.6, fontFamily: FONT }}>
      {children}
    </div>
  );
}

// The crest PNG has its background removed (transparent), so it sits
// directly on the dark UI — no white disc behind it — matching the gold
// wordmark on the landing page instead of looking like a pasted sticker.
export function Crest({ size = 44 }) {
  return (
    <img
      src={logoUrl} alt="Celebrity Infra Pvt Ltd" draggable={false}
      style={{ width: size, height: size, flex: "none", objectFit: "contain" }}
    />
  );
}

export function Panel({ title, children, right, subtitle }) {
  const mobile = useIsMobile();
  return (
    <div className="cip-card cip-in" style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: R.xl, padding: mobile ? 16 : 22, marginBottom: mobile ? 14 : 18 }}>
      {title && (
        <div style={{ display: "flex", alignItems: mobile ? "flex-start" : "center", flexDirection: mobile ? "column" : "row", gap: mobile ? 12 : 0, marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${C.line}` }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 600, fontSize: 18, letterSpacing: "-0.01em", color: C.ink }}>{title}</h3>
            {subtitle && <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>{subtitle}</div>}
          </div>
          {right && <div style={{ marginLeft: mobile ? 0 : "auto", width: mobile ? "100%" : "auto" }}>{right}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// Page-level header used at the top of every admin/portal screen — replaces
// the ad-hoc breadcrumb markup that used to be rebuilt per-screen.
export function PageHeader({ eyebrow, title, subtitle, right }) {
  const mobile = useIsMobile();
  return (
    <div style={{ display: "flex", alignItems: mobile ? "flex-start" : "flex-end", flexDirection: mobile ? "column" : "row", gap: mobile ? 14 : 0, marginBottom: 22 }}>
      <div>
        {eyebrow && <div style={{ fontSize: 11.5, fontWeight: 600, color: C.gold, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{eyebrow}</div>}
        <h1 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 600, fontSize: mobile ? 24 : 28, color: C.ink, letterSpacing: "-0.02em" }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 13.5, color: C.muted, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {right && <div style={{ marginLeft: mobile ? 0 : "auto", width: mobile ? "100%" : "auto" }}>{right}</div>}
    </div>
  );
}

// Segmented control — replaces the bespoke ViewToggle button pairs that
// were being hand-rolled per screen (Agents tree/ledger/rates, etc).
export function Tabs({ value, onChange, options }) {
  return (
    <div style={{ display: "inline-flex", gap: 2, padding: 3, background: C.field, border: `1px solid ${C.line}`, borderRadius: R.md }}>
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className="cip-tap" type="button"
          style={{ padding: "7px 15px", borderRadius: R.sm, border: "none",
            background: value === o.v ? C.goldSoft : "transparent",
            color: value === o.v ? C.goldLt : C.muted,
            fontWeight: value === o.v ? 600 : 500, cursor: "pointer", fontSize: 13, fontFamily: FONT }}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, accent, icon }) {
  const mobile = useIsMobile();
  const barColor = accent || C.gold;
  return (
    <div className="cip-card cip-in-fast" style={{ position: "relative", overflow: "hidden", background: C.panel, border: `1px solid ${C.line}`, borderRadius: R.lg, padding: "17px 19px", flex: mobile ? "1 1 100%" : "1 1 170px" }}>
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: barColor }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: R.sm, background: `${barColor}1f`, border: `1px solid ${barColor}55`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon name={icon || "monitoring"} size={15} style={{ color: barColor }} />
        </div>
        <div style={{ fontSize: 12, color: C.muted, fontFamily: FONT, fontWeight: 500 }}>{label}</div>
      </div>
      <div style={{ fontFamily: DISPLAY, fontSize: 28, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", color: accent || C.ink }}>{value}</div>
    </div>
  );
}

export function Badge({ text, color }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color, background: `${color}1f`, border: `1px solid ${color}55`,
      padding: "3px 10px", borderRadius: R.pill, fontFamily: FONT, letterSpacing: "0.01em",
    }}>
      {text}
    </span>
  );
}

// Payment-status pill derived from a due/paid comparison — used across
// Inventory/Customers/Portals so "overdue" always reads the same way.
export function DueBadge({ overdue, dueDate }) {
  if (overdue > 0) return <Badge text={`Overdue ${fmt(overdue)}`} color={C.red} />;
  if (dueDate) return <Badge text={`Next due ${fmtDate(dueDate)}`} color={C.gold} />;
  return <Badge text="Fully scheduled" color={C.green} />;
}

export function ProgressBar({ pct, color }) {
  return (
    <div style={{ height: 10, background: C.field, borderRadius: R.pill, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: "100%", background: color || `linear-gradient(90deg,${C.goldDeep},${C.gold})`, transition: "width .4s ease" }} />
    </div>
  );
}

export function Th({ children, right }) {
  return <th style={{ textAlign: right ? "right" : "left", fontSize: 12, fontWeight: 600, color: C.muted, padding: "10px 12px", borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap", fontFamily: FONT }}>{children}</th>;
}
export function Td({ children, right, bold }) {
  return <td style={{ textAlign: right ? "right" : "left", padding: "11px 12px", borderBottom: `1px solid ${C.line}`, fontSize: 14, fontWeight: bold ? 600 : 400, color: C.ink, whiteSpace: "nowrap", fontFamily: FONT }}>{children}</td>;
}

export function Button({ children, onClick, disabled, kind = "gold", size = "md", type = "button" }) {
  const styles = kind === "gold"
    ? { background: goldGradient, color: "#241A08", border: "none", fontWeight: 600 }
    : kind === "ghostLight"
    ? { background: "transparent", color: C.ink, border: `1px solid ${C.line}`, fontWeight: 500 }
    : kind === "danger"
    ? { background: "transparent", color: C.red, border: `1px solid ${C.red}`, fontWeight: 500 }
    : { background: "transparent", color: C.muted, border: `1px solid ${C.line}`, fontWeight: 500 };
  const sizing = size === "sm"
    ? { padding: "7px 14px", fontSize: 13, borderRadius: R.sm }
    : { padding: "11px 22px", fontSize: 14, borderRadius: R.md };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...styles, ...sizing, fontFamily: FONT, letterSpacing: "0", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, transition: "opacity .15s ease, background .15s ease" }}>
      {children}
    </button>
  );
}

export function ConfirmButton({ children, confirmText, onConfirm, kind = "danger", size = "sm", ...props }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button {...props} kind={kind} size={size} onClick={() => setOpen(true)}>
        {children}
      </Button>
      {open && (
        <Modal title="Please confirm" onClose={() => setOpen(false)} maxWidth={420}>
          <p style={{ margin: "0 0 22px", fontFamily: FONT, fontSize: 14.5, color: C.ink, lineHeight: 1.6 }}>{confirmText}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button kind="ghostLight" onClick={() => setOpen(false)}>Cancel</Button>
            <Button kind="danger" onClick={() => { setOpen(false); onConfirm(); }}>Confirm</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function Field({ label, ...props }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 13, color: C.muted, marginBottom: 6, fontFamily: FONT, fontWeight: 500 }}>{label}</span>
      <input {...props}
        style={{ width: "100%", padding: "11px 13px", border: `1px solid ${C.line}`, borderRadius: R.sm, fontFamily: FONT, fontSize: 15, color: C.ink, background: C.field }} />
    </label>
  );
}

export function Select({ label, value, onChange, options, placeholder, compact }) {
  return (
    <label style={{ display: "block", marginBottom: compact ? 0 : 14 }}>
      {label && <span style={{ display: "block", fontSize: 13, color: C.muted, marginBottom: 6, fontFamily: FONT, fontWeight: 500 }}>{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: compact ? "auto" : "100%", padding: compact ? "8px 10px" : "11px 13px", border: `1px solid ${C.line}`, borderRadius: R.sm, fontFamily: FONT, fontSize: compact ? 13.5 : 15, color: C.ink, background: C.field, cursor: "pointer" }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

// Rendered via a portal straight onto document.body — every admin/portal
// screen wraps its tab content in a `cip-in`/`cip-in-fast` div, and those
// entrance animations end on `transform: translateY(0)`, not the keyword
// `none`. Per the CSS spec, ANY transform value (translateY(0) included)
// makes that element a new containing block for `position: fixed`
// descendants, which silently re-scopes the modal to that scrolled content
// box instead of the real viewport — it ends up rendering low/off-center
// instead of centered on screen. Portaling to body sidesteps that entirely,
// the same fix already used for the mobile sidebar drawer (see Sidebar.jsx).
export function Modal({ title, onClose, children, maxWidth = 620 }) {
  const mobile = useIsMobile();
  return createPortal(
    <div onClick={onClose} className="cip-in-fade"
      style={{ position: "fixed", inset: 0, background: "rgba(6,5,3,.72)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: mobile ? 0 : "24px 16px", zIndex: 1000, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className={mobile ? "cip-in-sheet" : "cip-in-scale"}
        style={{ background: C.panel, border: `1px solid ${C.line}`, borderTop: `3px solid ${C.goldLt}`,
          borderRadius: mobile ? `${R.lg}px ${R.lg}px 0 0` : R.lg, width: "100%", maxWidth: mobile ? "none" : maxWidth,
          maxHeight: mobile ? "88dvh" : "min(88vh, 860px)", overflowY: "auto", margin: mobile ? "auto 0 0" : "auto",
          padding: mobile ? "18px 18px calc(18px + env(safe-area-inset-bottom))" : 26 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 18, gap: 12, position: "sticky", top: 0, background: C.panel, zIndex: 1 }}>
          <h3 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 600, fontSize: mobile ? 19 : 22, color: C.ink }}>{title}</h3>
          <button onClick={onClose} aria-label="Close"
            style={{ marginLeft: "auto", flexShrink: 0, background: "none", border: `1px solid ${C.line}`, borderRadius: R.pill, width: 34, height: 34, cursor: "pointer", color: C.muted }}>
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function SearchBar({ value, onChange, placeholder }) {
  const mobile = useIsMobile();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", border: `1px solid ${C.line}`, background: C.field, borderRadius: R.sm, minWidth: mobile ? 0 : 220, width: mobile ? "100%" : undefined }}>
      <Icon name="search" size={16} style={{ color: C.muted }} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "Search…"}
        style={{ flex: 1, padding: "10px 0", border: "none", background: "transparent", fontFamily: FONT, fontSize: 14, color: C.ink, outline: "none" }} />
    </div>
  );
}

export function RowCard({ children, onClick }) {
  return (
    <div onClick={onClick} className="cip-card cip-tap cip-in-fast"
      style={{ background: C.panel2, border: `1px solid ${C.line}`, borderRadius: R.md, padding: "13px 14px", marginBottom: 8, cursor: onClick ? "pointer" : "default" }}>
      {children}
    </div>
  );
}

export function RowLine({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "3px 0", fontSize: 13.5 }}>
      <span style={{ color: C.muted, fontFamily: FONT, fontSize: 12.5, fontWeight: 500, alignSelf: "center" }}>{label}</span>
      <span style={{ color: C.ink, fontWeight: bold ? 700 : 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export function KV({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
      <span style={{ fontSize: 13, color: C.muted, fontFamily: FONT, fontWeight: 500 }}>{k}</span>
      <span style={{ fontSize: 14, color: C.ink, fontWeight: 500, fontFamily: FONT }}>{v}</span>
    </div>
  );
}
