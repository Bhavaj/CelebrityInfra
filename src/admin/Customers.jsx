import React, { useState } from "react";
import { supabase } from "../supabase";
import { C, MONO, fmt, Panel, Th, Td, Button, ConfirmButton, SearchBar, Modal, KV, TableScroll, Empty, useIsMobile, RowCard, RowLine, Field, Select } from "../ui";
import AccessCode from "./AccessCode";
import RecordPayment from "./RecordPayment";

export default function Customers({ customers, plots, transactions, users, agents, agentName, onDone }) {
  const mobile = useIsMobile();
  const [q, setQ] = useState("");
  const [openCust, setOpenCust] = useState(null);
  const [adding, setAdding] = useState(false);

  const plotFor = (custId) => plots.find((p) => p.customer_id === custId);
  const paidFor = (custId) => transactions.filter((t) => t.customer_id === custId).reduce((s, t) => s + Number(t.amount), 0);

  const rows = customers.filter((c) => {
    if (!q) return true;
    return `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <>
      <Panel title="Customers" right={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <SearchBar value={q} onChange={setQ} placeholder="Search name, phone…" />
          <Button onClick={() => setAdding((v) => !v)}>{adding ? "Close" : "＋ Add Customer"}</Button>
        </div>
      }>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>{rows.length} customer{rows.length === 1 ? "" : "s"}</div>
        {rows.length === 0 ? <Empty>No customers yet — they appear here once a plot is sold, or a lead is converted.</Empty> : mobile ? (
          <div>
            {rows.map((c) => {
              const plot = plotFor(c.id);
              return (
                <RowCard key={c.id} onClick={() => setOpenCust(c)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{c.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted }}>{c.member_code}</span>
                  </div>
                  <RowLine label="Phone" value={c.phone} />
                  <RowLine label="Agent" value={c.agent_id ? agentName(c.agent_id) : "—"} />
                  <RowLine label="Plot" value={plot ? plot.plot_no : "—"} />
                  <RowLine label="Paid" value={fmt(paidFor(c.id))} bold />
                </RowCard>
              );
            })}
          </div>
        ) : (
          <TableScroll minWidth={620}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>ID</Th><Th>Name</Th><Th>Phone</Th><Th>Agent</Th><Th>Plot</Th><Th right>Paid</Th></tr></thead>
              <tbody>
                {rows.map((c) => {
                  const plot = plotFor(c.id);
                  return (
                    <tr key={c.id} onClick={() => setOpenCust(c)} style={{ cursor: "pointer" }}>
                      <Td>{c.member_code}</Td>
                      <Td bold>{c.name}</Td>
                      <Td>{c.phone}</Td>
                      <Td>{c.agent_id ? agentName(c.agent_id) : "—"}</Td>
                      <Td>{plot ? plot.plot_no : "—"}</Td>
                      <Td right bold>{fmt(paidFor(c.id))}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>

      {adding && <CreateCustomer agents={agents} onDone={() => { setAdding(false); onDone(); }} />}

      {openCust && (
        <CustomerCard customer={openCust} plot={plotFor(openCust.id)} transactions={transactions.filter((t) => t.customer_id === openCust.id)}
          linked={users.some((u) => u.customer_id === openCust.id)}
          agentName={agentName} onClose={() => setOpenCust(null)} onChanged={() => { setOpenCust(null); onDone(); }}
          onPaymentAdded={onDone} />
      )}
    </>
  );
}

// Provisions a customer record with no plot/sale attached yet, purely so the
// admin can hand them a login code right away — mirrors CreateAgent in
// Agents.jsx. A plot can be linked to them later from Inventory.
function CreateCustomer({ agents, onDone }) {
  const activeAgents = agents.filter((a) => !a.archived);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agentId, setAgentId] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true); setMsg("");
    const { error } = await supabase.from("customers").insert({
      name, phone, agent_id: agentId || null,
    });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    onDone();
  }

  return (
    <Panel title="Add a new customer">
      <div style={{ maxWidth: 460 }}>
        <Field label="Customer name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" />
        <Field label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98480 00000" />
        <Select label="Referred by (optional)" value={agentId} placeholder="— No agent —"
          onChange={setAgentId} options={activeAgents.map((a) => ({ v: a.id, l: a.name }))} />
        {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
        <Button onClick={save} disabled={!name || busy}>{busy ? "Saving…" : "Create customer"}</Button>
      </div>
    </Panel>
  );
}

function CustomerCard({ customer, plot, transactions, linked, agentName, onClose, onChanged, onPaymentAdded }) {
  const paid = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const deletable = !plot && transactions.length === 0;

  async function remove() {
    const { data, error } = await supabase.from("customers").delete().eq("id", customer.id).select();
    if (error || !data || data.length === 0) { alert(error?.message || "Delete didn't go through — this customer has history."); return; }
    onChanged();
  }

  return (
    <Modal title={customer.name} onClose={onClose}>
      <KV k="Member ID" v={customer.member_code} />
      <KV k="Phone" v={customer.phone} />
      <KV k="Referred by" v={customer.agent_id ? agentName(customer.agent_id) : "—"} />
      <KV k="Plot" v={plot ? `${plot.plot_no} · ${fmt(plot.price)}` : "Not linked to a plot yet"} />
      {plot && <KV k="Paid" v={`${fmt(paid)} of ${fmt(plot.price)}`} />}

      {transactions.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontFamily: MONO }}>Payments</div>
          {transactions.sort((a, b) => (a.date < b.date ? 1 : -1)).map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ color: C.muted }}>{t.date} · {t.type}</span>
              <span style={{ color: C.ink, fontWeight: 500 }}>{fmt(t.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {plot && (
        <RecordPayment plotId={plot.id} customerId={customer.id} price={plot.price} paid={paid} onDone={onPaymentAdded} />
      )}

      {deletable && (
        <div style={{ marginTop: 18 }}>
          <ConfirmButton confirmText={`Delete ${customer.name}? This can't be undone.`} onConfirm={remove}>Delete</ConfirmButton>
        </div>
      )}

      <AccessCode role="customer" targetId={customer.id} linked={linked} />
    </Modal>
  );
}
