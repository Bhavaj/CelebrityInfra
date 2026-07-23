import React from "react";
import { C } from "../ui";
import AuthShell from "./AuthShell";

const ROLES = [
  { key: "admin", label: "Admin", desc: "Manage inventory, sales & partners" },
  { key: "agent", label: "Agent", desc: "Track your customers & commission" },
  { key: "client", label: "Client", desc: "View your plot & payments" },
];

export default function RoleChooser({ onSelect }) {
  return (
    <AuthShell title="Welcome" subtitle="Choose how you're signing in">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ROLES.map((r) => (
          <button key={r.key} onClick={() => onSelect(r.key)} className="cip-card-h" style={tile}>
            <div style={{ fontWeight: 600, fontSize: 16, color: C.ink }}>{r.label}</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{r.desc}</div>
          </button>
        ))}
      </div>
    </AuthShell>
  );
}

const tile = {
  textAlign: "left", padding: "16px 18px", borderRadius: 0, cursor: "pointer",
  background: C.field, border: `1px solid ${C.line}`, fontFamily: "'Hanken Grotesk',sans-serif",
};
