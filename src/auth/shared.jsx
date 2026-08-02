import React from "react";
import { C, FONT, MONO } from "../ui";

export function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0", color: C.faint, fontSize: 12.5, fontFamily: FONT }}>
      <span style={{ flex: 1, height: 1, background: C.line }} />
      or
      <span style={{ flex: 1, height: 1, background: C.line }} />
    </div>
  );
}

export function BackButton({ onClick }) {
  return (
    <button onClick={onClick} className="cip-tap" style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13.5, fontWeight: 500, marginTop: 20, padding: "6px 0", fontFamily: FONT, borderRadius: 4 }}>
      ← Back
    </button>
  );
}

export function TabToggle({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", gap: 4, background: C.field, border: `1px solid ${C.line}`, borderRadius: 10, padding: 4, marginBottom: 22 }}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className="cip-tap"
          style={{
            flex: 1, padding: "10px 10px", borderRadius: 7, border: "none", cursor: "pointer",
            fontFamily: FONT, fontSize: 13.5, fontWeight: 600,
            background: value === o.value ? C.goldLt : "transparent",
            color: value === o.value ? "#062B1E" : C.muted,
            transition: "background .18s ease, color .18s ease",
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const codeInputStyle = {
  width: "100%", background: C.field, border: `1px solid ${C.line}`,
  color: C.ink, padding: "14px 16px", fontFamily: MONO, fontSize: 18, borderRadius: 8,
  letterSpacing: 4, textAlign: "center", textTransform: "uppercase",
};

export function ErrorText({ children }) {
  if (!children) return null;
  return <p style={{ color: C.red, fontSize: 13, marginTop: 10, fontFamily: FONT }}>{children}</p>;
}

export function Hint({ children }) {
  return <p style={{ color: C.muted, fontSize: 13, marginBottom: 14, lineHeight: 1.5, fontFamily: FONT }}>{children}</p>;
}
