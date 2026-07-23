import React from "react";
import { C, FONT, MONO } from "../ui";

export function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0", color: C.faint, fontSize: 11, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.1em" }}>
      <span style={{ flex: 1, height: 1, background: C.line }} />
      or
      <span style={{ flex: 1, height: 1, background: C.line }} />
    </div>
  );
}

export function BackButton({ onClick }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 11, marginTop: 20, padding: 0, fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.1em" }}>
      ← Back
    </button>
  );
}

export function TabToggle({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", gap: 0, background: C.field, border: `1px solid ${C.line}`, borderRadius: 0, padding: 0, marginBottom: 22 }}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          style={{
            flex: 1, padding: "10px 10px", borderRadius: 0, border: "none", cursor: "pointer",
            fontFamily: MONO, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
            background: value === o.value ? C.goldLt : "transparent",
            color: value === o.value ? "#1A1200" : C.muted,
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const codeInputStyle = {
  width: "100%", background: C.field, border: `1px solid ${C.line}`,
  color: C.ink, padding: "14px 16px", fontFamily: MONO, fontSize: 18, borderRadius: 0,
  letterSpacing: 4, textAlign: "center", textTransform: "uppercase",
};

export function ErrorText({ children }) {
  if (!children) return null;
  return <p style={{ color: C.red, fontSize: 13, marginTop: 10, fontFamily: FONT }}>{children}</p>;
}

export function Hint({ children }) {
  return <p style={{ color: C.muted, fontSize: 13, marginBottom: 14, lineHeight: 1.5, fontFamily: FONT }}>{children}</p>;
}
