import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { C, Panel, Th, Td, Button } from "./ui";

export default function LinkUsers({ agents, customers, onDone }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("unlinked_users").select("*");
    if (error) setMsg(error.message);
    setUsers(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <Panel title="Link logins to records" right={<span style={{ fontSize: 12, color: C.muted }}>connect who signed up to their agent/customer record</span>}>
      {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
      {loading ? <p style={{ color: C.muted }}>Loading…</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Email</Th><Th>Current role</Th><Th>Linked to</Th><Th>Assign</Th></tr></thead>
            <tbody>
              {users.map((u) => (
                <UserRow key={u.id} u={u} agents={agents} customers={customers}
                  onSaved={() => { load(); onDone && onDone(); }} setMsg={setMsg} />
              ))}
              {users.length === 0 && <tr><Td>No signups yet.</Td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function UserRow({ u, agents, customers, onSaved, setMsg }) {
  const [role, setRole] = useState(u.role || "customer");
  const [recordId, setRecordId] = useState(u.agent_id || u.customer_id || "");
  const [busy, setBusy] = useState(false);

  const linkedLabel = u.agent_id
    ? "Agent: " + (agents.find((a) => a.id === u.agent_id)?.name ?? "?")
    : u.customer_id
    ? "Customer: " + (customers.find((c) => c.id === u.customer_id)?.name ?? "?")
    : u.role === "admin" ? "— (admin)" : "— not linked";

  async function save() {
    setBusy(true); setMsg("");
    const args = { p_user_id: u.id, p_role: role, p_agent_id: null, p_customer_id: null };
    if (role === "agent") args.p_agent_id = recordId || null;
    if (role === "customer") args.p_customer_id = recordId || null;
    const { error } = await supabase.rpc("link_user", args);
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    onSaved();
  }

  const options = role === "agent" ? agents : role === "customer" ? customers : [];

  return (
    <tr>
      <Td bold>{u.email}</Td>
      <Td>{u.role}</Td>
      <Td>{linkedLabel}</Td>
      <Td>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={role} onChange={(e) => { setRole(e.target.value); setRecordId(""); }} style={sel}>
            <option value="admin">Admin</option>
            <option value="agent">Agent</option>
            <option value="customer">Customer</option>
          </select>
          {(role === "agent" || role === "customer") && (
            <select value={recordId} onChange={(e) => setRecordId(e.target.value)} style={sel}>
              <option value="">— pick {role} —</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
          <Button onClick={save} disabled={busy || ((role !== "admin") && !recordId)}>
            {busy ? "…" : "Link"}
          </Button>
        </div>
      </Td>
    </tr>
  );
}

const sel = { padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 4, fontFamily: "'Jost',sans-serif", fontSize: 14, background: "#fff" };
