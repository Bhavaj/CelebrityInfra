import React, { useEffect, useState } from "react";

export const C = {
  bg: "#F7F4EC", panel: "#FFFFFF", ink: "#0D2149",
  navy: "#0A1A3F", navy2: "#12285A",
  gold: "#C99A3B", goldLt: "#E8C874", goldSoft: "#F1E3BE",
  line: "#E4DCC4", muted: "#6E7488",
  green: "#3B7A57", red: "#B4472F",
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
    <div className="cip-card" style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: mobile ? 16 : 22, marginBottom: mobile ? 16 : 20, boxShadow: "0 1px 2px rgba(10,26,63,.04)" }}>
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
    <div className="cip-card cip-card-h" style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: "16px 20px", flex: mobile ? "1 1 100%" : "1 1 160px", boxShadow: "0 1px 2px rgba(10,26,63,.04)" }}>
      <div style={{ fontSize: 11, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 600, marginTop: 4, lineHeight: 1.1, color: accent || C.ink }}>{value}</div>
    </div>
  );
}

export function Badge({ text, color }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: color, padding: "3px 9px", borderRadius: 20, textTransform: "capitalize" }}>{text}</span>;
}

export function Th({ children, right }) {
  return <th style={{ textAlign: right ? "right" : "left", fontSize: 10.5, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 600, color: C.muted, padding: "10px 12px", borderBottom: `1.5px solid ${C.line}`, whiteSpace: "nowrap" }}>{children}</th>;
}
export function Td({ children, right, bold }) {
  return <td style={{ textAlign: right ? "right" : "left", padding: "11px 12px", borderBottom: `1px solid ${C.line}`, fontSize: 14, fontWeight: bold ? 600 : 400, color: C.ink, whiteSpace: "nowrap" }}>{children}</td>;
}

export function Button({ children, onClick, disabled, kind = "gold", type = "button" }) {
  const styles = kind === "gold"
    ? { background: `linear-gradient(180deg,${C.goldLt},${C.gold})`, color: C.navy, border: "none" }
    : kind === "ghostLight"
    ? { background: "transparent", color: "#F7F4EC", border: "1px solid rgba(247,244,236,.4)" }
    : { background: "transparent", color: C.ink, border: `1px solid ${C.line}` };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...styles, padding: "11px 22px", borderRadius: 6, fontFamily: "'Jost',sans-serif", fontSize: 13, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1 }}>
      {children}
    </button>
  );
}

export function Field({ label, ...props }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
      <input {...props}
        style={{ width: "100%", padding: "11px 13px", border: `1px solid ${C.line}`, borderRadius: 4, fontFamily: "'Jost',sans-serif", fontSize: 15, color: C.ink, background: "#fff" }} />
    </label>
  );
}

export function Select({ label, value, onChange, options, placeholder }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      {label && <span style={{ display: "block", fontSize: 12, color: C.muted, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "11px 13px", border: `1px solid ${C.line}`, borderRadius: 4, fontFamily: "'Jost',sans-serif", fontSize: 15, color: C.ink, background: "#fff" }}>
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
      style={{ position: "fixed", inset: 0, background: "rgba(10,26,63,.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: mobile ? "flex-start" : "flex-start", justifyContent: "center", padding: mobile ? "14px 10px" : "48px 16px", zIndex: 100, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", border: `1px solid ${C.line}`, borderTop: `4px solid ${C.gold}`, borderRadius: mobile ? 12 : 14, width: "100%", maxWidth: 620, padding: mobile ? 18 : 26, boxShadow: "0 24px 60px rgba(10,26,63,.22)" }}>
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
      style={{ padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 6, fontFamily: "'Jost',sans-serif", fontSize: 14, minWidth: mobile ? 0 : 200, width: mobile ? "100%" : undefined, background: "#fff", color: C.ink }} />
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
