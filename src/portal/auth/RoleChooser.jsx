import React from "react";
import { C, Icon } from "../ui";
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
  return (
    <button type="button" onClick={onClick} className="cip-role cip-in-fast">
      <span className="cip-role-icon"><Icon name={role.icon} size={21} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 600, fontSize: 16, color: C.ink }}>{role.label}</span>
        <span style={{ display: "block", fontSize: 13.5, color: C.muted, marginTop: 3 }}>{role.desc}</span>
      </span>
      <Icon name="arrow_forward" size={20} className="cip-role-arrow" />
    </button>
  );
}
