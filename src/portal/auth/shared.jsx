import React from "react";
import { C, FONT, MONO, R, Icon } from "../ui";

export function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "24px 0", color: C.faint, fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: FONT }}>
      <span style={{ flex: 1, height: 1, background: C.line }} />
      or
      <span style={{ flex: 1, height: 1, background: C.line }} />
    </div>
  );
}

export function BackButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="cip-link is-muted"
      style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 28, minHeight: 44, textDecoration: "none" }}>
      <Icon name="arrow_back" size={18} /> Back
    </button>
  );
}

export function TabToggle({ value, onChange, options }) {
  return (
    <div className="cip-seg" role="tablist" style={{ display: "flex", width: "100%", marginBottom: 24 }}>
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={value === o.value ? "cip-seg-btn is-active" : "cip-seg-btn"} style={{ flex: "1 1 0", minHeight: 42, padding: "0 12px" }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const codeInputStyle = {
  display: "block", width: "100%", minHeight: 56, background: C.field, border: `1px solid ${C.lineStrong}`,
  color: C.ink, padding: "14px 16px", fontFamily: MONO, fontSize: 20, fontWeight: 500, borderRadius: R.md,
  letterSpacing: "0.3em", textAlign: "center", textTransform: "uppercase",
};

export function ErrorText({ children }) {
  if (!children) return null;
  return (
    <p role="alert" style={{ display: "flex", gap: 8, alignItems: "flex-start", color: C.red, fontSize: 13.5, lineHeight: 1.5, marginTop: 14, fontFamily: FONT }}>
      <Icon name="error" size={17} style={{ marginTop: 1, flex: "none" }} />
      <span>{children}</span>
    </p>
  );
}

export function Hint({ children }) {
  return <p style={{ color: C.muted, fontSize: 14, marginBottom: 18, lineHeight: 1.6, fontFamily: FONT }}>{children}</p>;
}
