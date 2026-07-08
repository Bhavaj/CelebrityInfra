import React from "react";

export const C = {
  bg: "#F7F4EC", panel: "#FFFFFF", ink: "#0D2149",
  navy: "#0A1A3F", navy2: "#12285A",
  gold: "#C99A3B", goldLt: "#E8C874", goldSoft: "#F1E3BE",
  line: "#E4DCC4", muted: "#6E7488",
  green: "#3B7A57", red: "#B4472F",
};

export const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

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
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 18 }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: 20, color: C.ink }}>{title}</h3>
          {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Stat({ label, value, accent }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 18px", flex: "1 1 150px" }}>
      <div style={{ fontSize: 12, color: C.muted, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 600, marginTop: 4, color: accent || C.ink }}>{value}</div>
    </div>
  );
}

export function Badge({ text, color }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: color, padding: "3px 9px", borderRadius: 20, textTransform: "capitalize" }}>{text}</span>;
}

export function Th({ children, right }) {
  return <th style={{ textAlign: right ? "right" : "left", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: C.muted, padding: "8px 10px", borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" }}>{children}</th>;
}
export function Td({ children, right, bold }) {
  return <td style={{ textAlign: right ? "right" : "left", padding: "10px 10px", borderBottom: `1px solid ${C.line}`, fontSize: 14, fontWeight: bold ? 600 : 400, color: C.ink }}>{children}</td>;
}

export function Button({ children, onClick, disabled, kind = "gold", type = "button" }) {
  const styles = kind === "gold"
    ? { background: `linear-gradient(180deg,${C.goldLt},${C.gold})`, color: C.navy, border: "none" }
    : kind === "ghostLight"
    ? { background: "transparent", color: "#F7F4EC", border: "1px solid rgba(247,244,236,.4)" }
    : { background: "transparent", color: C.ink, border: `1px solid ${C.line}` };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...styles, padding: "11px 22px", borderRadius: 4, fontFamily: "'Jost',sans-serif", fontSize: 13, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1 }}>
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
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(10,26,63,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", zIndex: 100, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", border: `1px solid ${C.line}`, borderTop: `4px solid ${C.gold}`, borderRadius: 12, width: "100%", maxWidth: 620, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: 24, color: C.ink }}>{title}</h3>
          <button onClick={onClose} aria-label="Close"
            style={{ marginLeft: "auto", background: "none", border: `1px solid ${C.line}`, borderRadius: 6, width: 32, height: 32, cursor: "pointer", fontSize: 18, color: C.muted, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "Search…"}
      style={{ padding: "9px 13px", border: `1px solid ${C.line}`, borderRadius: 6, fontFamily: "'Jost',sans-serif", fontSize: 14, minWidth: 200, background: "#fff", color: C.ink }} />
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
