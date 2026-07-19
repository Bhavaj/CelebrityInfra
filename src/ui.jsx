import React, { useEffect, useState } from "react";

// "Obsidian & Gold" — near-black luxury base, gold as primary accent (ties to the
// crest logo), emerald as a secondary jewel-tone accent for richness/contrast.
export const C = {
  bg: "#08090D", panel: "#12151C", panel2: "#181D27", field: "#1B2028",
  ink: "#F3F0E8", muted: "#8A90A0", faint: "#565C6B",
  navy: "#101A33", navy2: "#182848", steel: "#7C9CC9",
  gold: "#C9A227", goldLt: "#E8C874", goldDeep: "#8C6C1E", goldSoft: "rgba(201,162,39,.14)",
  emerald: "#2FBF8F", emeraldLt: "#5FE0B5", emeraldDeep: "#154B3B", emeraldSoft: "rgba(47,191,143,.14)",
  line: "rgba(243,240,232,.10)", lineGold: "rgba(201,162,39,.22)",
  green: "#34C795", red: "#E2685A",
};

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
    <div style={{ textAlign: "center", color: C.muted, fontSize: 14, padding: "26px 16px", lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

export function Crest({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M15 15 L20 9 L24 13 L28 9 L33 15 Z" fill="#E8C874" />
      <circle cx="20" cy="9.5" r="1.5" fill="#F5E6B8" />
      <circle cx="24" cy="13" r="1.5" fill="#F5E6B8" />
      <circle cx="28" cy="9.5" r="1.5" fill="#F5E6B8" />
      <path d="M11 25 Q9 34 18 40" fill="none" stroke="#C99A3B" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M37 25 Q39 34 30 40" fill="none" stroke="#C99A3B" strokeWidth="1.4" strokeLinecap="round" />
      <text x="24" y="34" textAnchor="middle" fontFamily="'Cormorant Garamond',serif" fontSize="22" fontWeight="700" fill="#E8C874">C</text>
    </svg>
  );
}

export function Panel({ title, children, right }) {
  const mobile = useIsMobile();
  return (
    <div className="cip-card" style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: mobile ? 16 : 22, marginBottom: mobile ? 16 : 20, boxShadow: "0 1px 0 rgba(255,255,255,.02) inset, 0 10px 24px rgba(0,0,0,.28)" }}>
      {title && (
        <div style={{ display: "flex", alignItems: mobile ? "flex-start" : "center", flexDirection: mobile ? "column" : "row", gap: mobile ? 12 : 0, marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: 22, letterSpacing: 0.2, color: C.ink }}>{title}</h3>
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
    <div className="cip-card cip-card-h" style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: "16px 20px", flex: mobile ? "1 1 100%" : "1 1 160px", boxShadow: "0 1px 0 rgba(255,255,255,.02) inset, 0 10px 24px rgba(0,0,0,.28)" }}>
      <div style={{ fontSize: 11, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 600, marginTop: 4, lineHeight: 1.1, color: accent || C.ink }}>{value}</div>
    </div>
  );
}

export function Badge({ text, color }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color: C.bg, background: color, padding: "3px 9px", borderRadius: 20, textTransform: "capitalize" }}>{text}</span>;
}

export function Th({ children, right }) {
  return <th style={{ textAlign: right ? "right" : "left", fontSize: 10.5, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 600, color: C.muted, padding: "10px 12px", borderBottom: `1.5px solid ${C.line}`, whiteSpace: "nowrap" }}>{children}</th>;
}
export function Td({ children, right, bold }) {
  return <td style={{ textAlign: right ? "right" : "left", padding: "11px 12px", borderBottom: `1px solid ${C.line}`, fontSize: 14, fontWeight: bold ? 600 : 400, color: C.ink, whiteSpace: "nowrap" }}>{children}</td>;
}

// size="md" (default) is the loud, letter-spaced CTA treatment — reserve it for
// the one or two primary actions on a screen (Sign in, Create project, Confirm sale).
// size="sm" is a quiet, normal-case control for row/inline actions in tables and
// modals (Archive, Delete, Convert…) — using the CTA style there is what reads as
// a wireframe rather than a real dashboard.
export function Button({ children, onClick, disabled, kind = "gold", size = "md", type = "button" }) {
  const styles = kind === "gold"
    ? { background: `linear-gradient(180deg,${C.goldLt},${C.gold})`, color: "#1A1200", border: "none" }
    : kind === "ghostLight"
    ? { background: "transparent", color: C.ink, border: "1px solid rgba(243,240,232,.28)" }
    : kind === "danger"
    ? { background: "transparent", color: C.red, border: `1px solid ${C.red}` }
    : { background: "transparent", color: C.ink, border: `1px solid ${C.line}` };
  const sizing = size === "sm"
    ? { padding: "6px 13px", borderRadius: 5, fontSize: 12.5, letterSpacing: 0.2, fontWeight: 500, textTransform: "none" }
    : { padding: "11px 22px", borderRadius: 6, fontSize: 13, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase" };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...styles, ...sizing, fontFamily: "'Jost',sans-serif", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1 }}>
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
      <span style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
      <input {...props}
        style={{ width: "100%", padding: "11px 13px", border: `1px solid ${C.line}`, borderRadius: 4, fontFamily: "'Jost',sans-serif", fontSize: 15, color: C.ink, background: C.field }} />
    </label>
  );
}

export function Select({ label, value, onChange, options, placeholder }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      {label && <span style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "11px 13px", border: `1px solid ${C.line}`, borderRadius: 4, fontFamily: "'Jost',sans-serif", fontSize: 15, color: C.ink, background: C.field }}>
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
      style={{ position: "fixed", inset: 0, background: "rgba(4,5,7,.72)", backdropFilter: "blur(3px)", display: "flex", alignItems: mobile ? "flex-start" : "flex-start", justifyContent: "center", padding: mobile ? "14px 10px" : "48px 16px", zIndex: 100, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: C.panel, border: `1px solid ${C.line}`, borderTop: `4px solid ${C.gold}`, borderRadius: mobile ? 12 : 14, width: "100%", maxWidth: 620, padding: mobile ? 18 : 26, boxShadow: "0 30px 70px rgba(0,0,0,.55)" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 18, gap: 12 }}>
          <h3 style={{ margin: 0, fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: mobile ? 22 : 25, color: C.ink }}>{title}</h3>
          <button onClick={onClose} aria-label="Close"
            style={{ marginLeft: "auto", flexShrink: 0, background: "none", border: `1px solid ${C.line}`, borderRadius: 8, width: 34, height: 34, cursor: "pointer", fontSize: 18, color: C.muted, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder }) {
  const mobile = useIsMobile();
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "Search…"}
      style={{ padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 6, fontFamily: "'Jost',sans-serif", fontSize: 14, minWidth: mobile ? 0 : 200, width: mobile ? "100%" : undefined, background: C.field, color: C.ink }} />
  );
}

export function KV({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
      <span style={{ fontSize: 13, color: C.muted }}>{k}</span>
      <span style={{ fontSize: 14, color: C.ink, fontWeight: 500 }}>{v}</span>
    </div>
  );
}
