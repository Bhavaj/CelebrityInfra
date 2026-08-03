import React from "react";
import { C, R, Icon, useTilt } from "../ui";
import AuthShell from "./AuthShell";

const ROLES = [
  { key: "admin", label: "Admin", desc: "Manage inventory, sales & agents", icon: "admin_panel_settings" },
  { key: "agent", label: "Agent", desc: "Track your customers & commission", icon: "handshake" },
  { key: "client", label: "Client", desc: "View your plot & payments", icon: "home" },
];

export default function RoleChooser({ onSelect }) {
  return (
    <AuthShell eyebrow="Sign in" title="Welcome back" subtitle="Choose how you're signing in">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }} className="cip-stagger">
        {ROLES.map((r) => <RoleTile key={r.key} role={r} onClick={() => onSelect(r.key)} />)}
      </div>
    </AuthShell>
  );
}

function RoleTile({ role, onClick }) {
  const tilt = useTilt(6);
  return (
    <button onClick={onClick} className="cip-card-h cip-tap cip-in-fast cip-tilt" {...tilt} style={tile}>
      <div style={{ width: 38, height: 38, borderRadius: R.sm, background: C.goldSoft, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <Icon name={role.icon} size={19} style={{ color: C.gold }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15.5, color: C.ink }}>{role.label}</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 1 }}>{role.desc}</div>
      </div>
      <Icon name="chevron_right" size={18} style={{ color: C.faint, flex: "none" }} />
    </button>
  );
}

const tile = {
  display: "flex", alignItems: "center", gap: 12,
  textAlign: "left", padding: "12px 14px", borderRadius: R.md, cursor: "pointer",
  background: C.field, border: `1px solid ${C.line}`, fontFamily: "'Outfit',sans-serif", width: "100%",
};
