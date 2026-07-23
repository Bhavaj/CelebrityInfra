import React, { useEffect, useState } from "react";

// "Enterprise Noir" — pure-black canvas, sharp/square edges, glass-panel
// surfaces, gold as the sole accent. Display type is Hanken Grotesk; all
// uppercase/tracked labels (buttons, table headers, chips, nav) run in
// JetBrains Mono, matching the Stitch "Enterprise Noir" screens.
export const C = {
  bg: "#000000", panel: "#121317", panel2: "#1a1b1f", field: "#1e1f23",
  ink: "#e3e2e7", muted: "#99907c", faint: "#6b6355",
  navy: "#101A33", navy2: "#182848", steel: "#7C9CC9",
  gold: "#d4af37", goldLt: "#f2ca50", goldDeep: "#8C6C1E", goldSoft: "rgba(242,202,80,.12)",
  emerald: "#2FBF8F", emeraldLt: "#5FE0B5", emeraldDeep: "#154B3B", emeraldSoft: "rgba(47,191,143,.14)",
  line: "#2C2C2E", lineGold: "rgba(242,202,80,.35)",
  green: "#34C795", red: "#E2685A",
};

export const FONT = "'Hanken Grotesk',sans-serif";
export const MONO = "'JetBrains Mono',monospace";

export const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

// Presentational-only viewport hook: true when the screen is phone-sized (≤640px).
// Used to stack multi-column layouts and adjust padding — no behavior/data impact.
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

// Material Symbols glyph — used throughout nav/chrome to match the Enterprise Noir icon language.
export function Icon({ name, size = 20, style }) {
  return (
    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: size, lineHeight: 1, ...style }}>
      {name}
    </span>
  );
}

// Horizontal-scroll wrapper so wide tables scroll inside their card instead of breaking layout.
export function TableScroll({ children, minWidth = 560 }) {
  return (
    <div className="cip-scroll-x" style={{ margin: "0 -2px" }}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}

// Consistent empty state — centered, muted, with breathing room.
export function Empty({ children }) {
  return (
    <div style={{ textAlign: "center", color: C.muted, fontSize: 14, padding: "26px 16px", lineHeight: 1.6, fontFamily: FONT }}>
      {children}
    </div>
  );
}

export function Crest({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M15 15 L20 9 L24 13 L28 9 L33 15 Z" fill="#F2CA50" />
      <circle cx="20" cy="9.5" r="1.5" fill="#FFE088" />
      <circle cx="24" cy="13" r="1.5" fill="#FFE088" />
      <circle cx="28" cy="9.5" r="1.5" fill="#FFE088" />
      <path d="M11 25 Q9 34 18 40" fill="none" stroke="#D4AF37" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M37 25 Q39 34 30 40" fill="none" stroke="#D4AF37" strokeWidth="1.4" strokeLinecap="round" />
      <text x="24" y="34" textAnchor="middle" fontFamily={FONT} fontSize="22" fontWeight="700" fill="#F2CA50">C</text>
    </svg>
  );
}

const glass = { background: "rgba(18,19,23,.7)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" };

export function Panel({ title, children, right }) {
  const mobile = useIsMobile();
  return (
    <div className="cip-card" style={{ ...glass, border: `1px solid ${C.line}`, borderRadius: 0, padding: mobile ? 16 : 24, marginBottom: mobile ? 16 : 20 }}>
      {title && (
        <div style={{ display: "flex", alignItems: mobile ? "flex-start" : "center", flexDirection: mobile ? "column" : "row", gap: mobile ? 12 : 0, marginBottom: 18, paddingBottom: 16, borderBottom: `1px solid ${C.line}` }}>
          <h3 style={{ margin: 0, fontFamily: FONT, fontWeight: 700, fontSize: 20, textTransform: "uppercase", letterSpacing: "-0.01em", color: C.ink }}>{title}</h3>
          {right && <div style={{ marginLeft: mobile ? 0 : "auto", width: mobile ? "100%" : "auto" }}>{right}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Stat({ label, value, accent }) {
  const mobile = useIsMobile();
  return (
    <div className="cip-card cip-card-h" style={{ ...glass, border: `1px solid ${C.line}`, borderRadius: 0, padding: "18px 20px", flex: mobile ? "1 1 100%" : "1 1 160px" }}>
      <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: MONO }}>{label}</div>
      <div style={{ fontFamily: FONT, fontSize: 32, fontWeight: 700, marginTop: 6, lineHeight: 1.1, letterSpacing: "-0.02em", color: accent || C.ink }}>{value}</div>
    </div>
  );
}

// Rectangular bordered chip — no fill, no pill radius — matching the Noir status tags.
export function Badge({ text, color }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color, background: "transparent", border: `1px solid ${color}`, padding: "3px 8px", borderRadius: 0, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: MONO }}>
      {text}
    </span>
  );
}

export function Th({ children, right }) {
  return <th style={{ textAlign: right ? "right" : "left", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500, color: C.muted, padding: "10px 12px", borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap", fontFamily: MONO }}>{children}</th>;
}
export function Td({ children, right, bold }) {
  return <td style={{ textAlign: right ? "right" : "left", padding: "11px 12px", borderBottom: `1px solid ${C.line}`, fontSize: 14, fontWeight: bold ? 600 : 400, color: C.ink, whiteSpace: "nowrap", fontFamily: FONT }}>{children}</td>;
}

// size="md" (default) is the loud, letter-spaced CTA treatment — reserve it for
// the one or two primary actions on a screen (Sign in, Create project, Confirm sale).
// size="sm" is a quiet control for row/inline actions in tables and modals
// (Archive, Delete, Convert…) — still mono/uppercase, matching the small action
// chips ("Call Client", "Log Note") in the Noir screens, just lower-emphasis.
export function Button({ children, onClick, disabled, kind = "gold", size = "md", type = "button" }) {
  const styles = kind === "gold"
    ? { background: C.goldLt, color: "#1A1200", border: "none", fontWeight: 700 }
    : kind === "ghostLight"
    ? { background: "transparent", color: C.ink, border: `1px solid ${C.line}`, fontWeight: 600 }
    : kind === "danger"
    ? { background: "transparent", color: C.red, border: `1px solid ${C.red}`, fontWeight: 600 }
    : { background: "transparent", color: C.muted, border: `1px solid ${C.line}`, fontWeight: 600 };
  const sizing = size === "sm"
    ? { padding: "6px 12px", fontSize: 11 }
    : { padding: "12px 24px", fontSize: 12.5 };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={kind === "gold" && !disabled ? "cip-glow" : undefined}
      style={{ ...styles, ...sizing, borderRadius: 0, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.1em", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, transition: "all .15s ease" }}>
      {children}
    </button>
  );
}

// Wraps a destructive action behind a native confirm() — matches the pattern
// already used in LinkUsers.jsx, just avoids retyping the wrapper each time.
export function ConfirmButton({ children, confirmText, onConfirm, kind = "danger", size = "sm", ...props }) {
  return (
    <Button {...props} kind={kind} size={size} onClick={() => { if (window.confirm(confirmText)) onConfirm(); }}>
      {children}
    </Button>
  );
}

export function Field({ label, ...props }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 6, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: MONO }}>{label}</span>
      <input {...props}
        style={{ width: "100%", padding: "11px 13px", border: `1px solid ${C.line}`, borderRadius: 0, fontFamily: FONT, fontSize: 15, color: C.ink, background: C.field }} />
    </label>
  );
}

export function Select({ label, value, onChange, options, placeholder }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      {label && <span style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 6, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: MONO }}>{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "11px 13px", border: `1px solid ${C.line}`, borderRadius: 0, fontFamily: FONT, fontSize: 15, color: C.ink, background: C.field }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

// Drill-down panel that opens in place over the content.
export function Modal({ title, onClose, children }) {
  const mobile = useIsMobile();
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: mobile ? "14px 10px" : "48px 16px", zIndex: 100, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ ...glass, border: `1px solid ${C.line}`, borderTop: `3px solid ${C.goldLt}`, borderRadius: 0, width: "100%", maxWidth: 620, padding: mobile ? 18 : 26 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 18, gap: 12 }}>
          <h3 style={{ margin: 0, fontFamily: FONT, fontWeight: 700, fontSize: mobile ? 20 : 24, color: C.ink }}>{title}</h3>
          <button onClick={onClose} aria-label="Close"
            style={{ marginLeft: "auto", flexShrink: 0, background: "none", border: `1px solid ${C.line}`, borderRadius: 0, width: 34, height: 34, cursor: "pointer", color: C.muted }}>
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder }) {
  const mobile = useIsMobile();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", border: `1px solid ${C.line}`, background: C.field, minWidth: mobile ? 0 : 220, width: mobile ? "100%" : undefined }}>
      <Icon name="search" size={16} style={{ color: C.muted }} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "Search…"}
        style={{ flex: 1, padding: "10px 0", border: "none", background: "transparent", fontFamily: FONT, fontSize: 14, color: C.ink, outline: "none" }} />
    </div>
  );
}

export function KV({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
      <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: MONO }}>{k}</span>
      <span style={{ fontSize: 14, color: C.ink, fontWeight: 500, fontFamily: FONT }}>{v}</span>
    </div>
  );
}
