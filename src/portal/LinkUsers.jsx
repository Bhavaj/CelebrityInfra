import React, { useEffect, useState } from "react";
import { supabase } from "../shared/supabase.js";
import { C, Panel, Th, Td, Button, TableScroll, Empty, Loading, RowCard, RowLine, useIsMobile, Select, Modal } from "./ui";

export default function LinkUsers({ agents, customers, onDone }) {
  const mobile = useIsMobile();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_users");
    if (error) setMsg(error.message);
    setUsers(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <Panel title="Link logins to records" subtitle="Connect each person who signed up to their agent or customer record.">
      {msg && <p role="alert" style={{ color: C.red, fontSize: 13.5, lineHeight: 1.5, marginBottom: 14 }}>{msg}</p>}
      {loading ? <Loading /> : users.length === 0 ? <Empty>No signups yet.</Empty> : mobile ? (
        <div>
          {users.map((u) => (
            <RowCard key={u.id}>
              <div style={{ fontWeight: 600, fontSize: 15, color: C.ink, marginBottom: 6, wordBreak: "break-all" }}>{u.email}</div>
              <RowLine label="Current role" value={<span style={{ textTransform: "capitalize" }}>{u.role}</span>} />
              <UserRow u={u} agents={agents} customers={customers} mobile
                onSaved={() => { load(); onDone && onDone(); }} setMsg={setMsg} />
            </RowCard>
          ))}
        </div>
      ) : (
        <TableScroll minWidth={640}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Email</Th><Th>Current role</Th><Th>Linked to</Th><Th>Assign</Th></tr></thead>
            <tbody>
              {users.map((u) => (
                <UserRow key={u.id} u={u} agents={agents} customers={customers}
                  onSaved={() => { load(); onDone && onDone(); }} setMsg={setMsg} />
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
    </Panel>
  );
}

function UserRow({ u, agents, customers, onSaved, setMsg, mobile }) {
  const [role, setRole] = useState(u.role || "customer");
  const [recordId, setRecordId] = useState(u.agent_id || u.customer_id || "");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const linkedLabel = u.agent_id
    ? "Agent: " + (agents.find((a) => a.id === u.agent_id)?.name ?? "?")
    : u.customer_id
    ? "Customer: " + (customers.find((c) => c.id === u.customer_id)?.name ?? "?")
    : u.role === "admin" ? "— (admin)" : "— not linked";

  async function commit() {
    setBusy(true); setMsg("");
    const args = { p_user_id: u.id, p_role: role, p_agent_id: null, p_customer_id: null };
    if (role === "agent") args.p_agent_id = recordId || null;
    if (role === "customer") args.p_customer_id = recordId || null;
    const { error } = await supabase.rpc("link_user", args);
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    onSaved();
  }

  function save() {
    const alreadyLinked = u.agent_id || u.customer_id;
    if (alreadyLinked) { setConfirmOpen(true); return; }
    commit();
  }

  const options = role === "agent" ? agents : role === "customer" ? customers : [];

  const controls = (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: mobile ? "wrap" : "nowrap" }}>
      <div style={{ minWidth: mobile ? "100%" : 140, flex: mobile ? "1 1 100%" : "0 0 auto" }}>
        <Select compact={!mobile} value={role} onChange={(v) => { setRole(v); setRecordId(""); }}
          options={[{ v: "admin", l: "Admin" }, { v: "agent", l: "Agent" }, { v: "customer", l: "Customer" }]} />
      </div>
      {(role === "agent" || role === "customer") && (
        <div style={{ minWidth: mobile ? "100%" : 160, flex: mobile ? "1 1 100%" : "0 0 auto" }}>
          <Select compact={!mobile} value={recordId} onChange={setRecordId} placeholder={`— pick ${role} —`}
            options={options.map((o) => ({ v: o.id, l: o.name }))} />
        </div>
      )}
      <Button size="sm" onClick={save} disabled={busy || ((role !== "admin") && !recordId)}>
        {busy ? "…" : "Link"}
      </Button>
      {confirmOpen && (
        <Modal title="Change link?" onClose={() => setConfirmOpen(false)} maxWidth={420}>
          <p style={{ margin: "0 0 24px", fontSize: 15, color: C.ink, lineHeight: 1.6 }}>
            {u.email} is already linked to {linkedLabel}. Change it to the new selection?
          </p>
          <div className="cip-actions cip-actions-end">
            <Button kind="ghostLight" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => { setConfirmOpen(false); commit(); }}>Confirm</Button>
          </div>
        </Modal>
      )}
    </div>
  );

  if (mobile) {
    return (
      <>
        <RowLine label="Linked to" value={linkedLabel} />
        <div style={{ marginTop: 8 }}>{controls}</div>
      </>
    );
  }

  return (
    <tr>
      <Td bold>{u.email}</Td>
      <Td><span style={{ textTransform: "capitalize", color: C.muted }}>{u.role}</span></Td>
      <Td>{linkedLabel}</Td>
      <Td>{controls}</Td>
    </tr>
  );
}
