import React, { useState } from "react";
import { supabase } from "../supabase";
import { C, MONO, fmt, Panel, Th, Td, Button, ConfirmButton, SearchBar, Modal, KV, TableScroll, Empty, useIsMobile } from "../ui";
import AccessCode from "./AccessCode";

export default function Customers({ customers, plots, transactions, users, agentName, onDone }) {
  const mobile = useIsMobile();
  const [q, setQ] = useState("");
  const [openCust, setOpenCust] = useState(null);

  const plotFor = (custId) => plots.find((p) => p.customer_id === custId);
  const paidFor = (custId) => transactions.filter((t) => t.customer_id === custId).reduce((s, t) => s + Number(t.amount), 0);

  const rows = customers.filter((c) => {
    if (!q) return true;
    return `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <>
      <Panel title="Customers" right={<SearchBar value={q} onChange={setQ} placeholder="Search name, phone…" />}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>{rows.length} customer{rows.length === 1 ? "" : "s"}</div>
        {rows.length === 0 ? <Empty>No customers yet — they appear here once a plot is sold, or a lead is converted.</Empty> : (
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

      {openCust && (
        <CustomerCard customer={openCust} plot={plotFor(openCust.id)} transactions={transactions.filter((t) => t.customer_id === openCust.id)}
          linked={users.some((u) => u.customer_id === openCust.id)}
          agentName={agentName} onClose={() => setOpenCust(null)} onChanged={() => { setOpenCust(null); onDone(); }} />
      )}
    </>
  );
}

function CustomerCard({ customer, plot, transactions, linked, agentName, onClose, onChanged }) {
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

      {deletable && (
        <div style={{ marginTop: 18 }}>
          <ConfirmButton confirmText={`Delete ${customer.name}? This can't be undone.`} onConfirm={remove}>Delete</ConfirmButton>
        </div>
      )}

      <AccessCode role="customer" targetId={customer.id} linked={linked} />
    </Modal>
  );
}
