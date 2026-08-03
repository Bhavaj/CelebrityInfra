import React, { useState } from "react";
import { supabase } from "../supabase";
import { C, MONO, fmt, fmtDate, todayISO, Panel, Th, Td, Button, DangerDeleteButton, SearchBar, Modal, KV, DueBadge, ProgressBar, TableScroll, Empty, useIsMobile, RowCard, RowLine, Field, Select } from "../ui";
import AccessCode from "./AccessCode";
import RecordPayment from "./RecordPayment";
import { scheduleStatus } from "./Inventory";

export default function Customers({ customers, plots, transactions, installments, users, agents, projects, activeProject, agentName, onDone }) {
  const mobile = useIsMobile();
  const [q, setQ] = useState("");
  const [openCust, setOpenCust] = useState(null);
  const [adding, setAdding] = useState(false);

  const projectName = (id) => projects.find((p) => p.id === id)?.name ?? "—";
  const plotsFor = (custId) => plots.filter((p) => p.customer_id === custId);
  const paidFor = (plotId) => transactions.filter((t) => t.plot_id === plotId).reduce((s, t) => s + Number(t.amount), 0);
  const inActiveProject = (custId) => plotsFor(custId).some((p) => p.project_id === activeProject);

  const rows = customers.filter((c) => {
    if (q) return `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase());
    return true;
  });

  return (
    <>
      <Panel title="Customers" subtitle="Every customer across every project — open one to see all their plots." right={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <SearchBar value={q} onChange={setQ} placeholder="Search name, phone…" />
          <Button onClick={() => setAdding((v) => !v)}>{adding ? "Close" : "＋ Add Customer"}</Button>
        </div>
      }>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
          {rows.length} customer{rows.length === 1 ? "" : "s"}
          {activeProject && ` · ${rows.filter((c) => inActiveProject(c.id)).length} own a plot in ${projectName(activeProject)}`}
        </div>
        {rows.length === 0 ? <Empty>No customers yet — they appear here once a plot is sold, or a lead is converted.</Empty> : mobile ? (
          <div>
            {rows.map((c) => {
              const custPlots = plotsFor(c.id);
              const totalPaid = custPlots.reduce((s, p) => s + paidFor(p.id), 0);
              return (
                <RowCard key={c.id} onClick={() => setOpenCust(c)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{c.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted }}>{c.member_code}</span>
                  </div>
                  <RowLine label="Phone" value={c.phone} />
                  <RowLine label="Plots owned" value={custPlots.length} />
                  <RowLine label="Total paid" value={fmt(totalPaid)} bold />
                </RowCard>
              );
            })}
          </div>
        ) : (
          <TableScroll minWidth={640}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>ID</Th><Th>Name</Th><Th>Phone</Th><Th right>Plots</Th><Th>In {activeProject ? projectName(activeProject) : "project"}</Th><Th right>Total paid</Th></tr></thead>
              <tbody>
                {rows.map((c) => {
                  const custPlots = plotsFor(c.id);
                  const totalPaid = custPlots.reduce((s, p) => s + paidFor(p.id), 0);
                  return (
                    <tr key={c.id} onClick={() => setOpenCust(c)} style={{ cursor: "pointer" }}>
                      <Td>{c.member_code}</Td>
                      <Td bold>{c.name}</Td>
                      <Td>{c.phone}</Td>
                      <Td right>{custPlots.length}</Td>
                      <Td>{inActiveProject(c.id) ? "Yes" : "—"}</Td>
                      <Td right bold>{fmt(totalPaid)}</Td>
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
        <CustomerCard customer={openCust} plots={plotsFor(openCust.id)} transactions={transactions}
          installments={installments} allPlots={plots} projects={projects} agents={agents}
          linked={users.some((u) => u.customer_id === openCust.id)}
          agentName={agentName} onClose={() => setOpenCust(null)} onChanged={() => { setOpenCust(null); onDone(); }}
          onPaymentAdded={onDone} />
      )}
    </>
  );
}

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

function CustomerCard({ customer, plots, transactions, installments, allPlots, projects, agents, linked, agentName, onClose, onChanged, onPaymentAdded }) {
  const [msg, setMsg] = useState("");
  const [assigning, setAssigning] = useState(false);
  const projectName = (id) => projects.find((p) => p.id === id)?.name ?? "—";
  const totalPaid = plots.reduce((s, p) => s + transactions.filter((t) => t.plot_id === p.id).reduce((a, t) => a + Number(t.amount), 0), 0);
  const deletable = plots.length === 0 && transactions.filter((t) => t.customer_id === customer.id).length === 0;

  async function remove() {
    const { data, error } = await supabase.from("customers").delete().eq("id", customer.id).select();
    if (error || !data || data.length === 0) { setMsg(error?.message || "Delete didn't go through — this customer has history."); return; }
    onChanged();
  }

  return (
    <Modal title={customer.name} onClose={onClose} maxWidth={720}>
      {msg && <p style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{msg}</p>}
      <KV k="Member ID" v={customer.member_code} />
      <KV k="Phone" v={customer.phone} />
      <KV k="Referred by (primary)" v={customer.agent_id ? agentName(customer.agent_id) : "—"} />
      <KV k="Total paid across all plots" v={fmt(totalPaid)} />

      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: MONO }}>Plots owned ({plots.length})</div>
          <Button size="sm" onClick={() => setAssigning((v) => !v)}>{assigning ? "Close" : "＋ Add to another plot"}</Button>
        </div>

        {plots.length === 0 ? <p style={{ fontSize: 14, color: C.muted }}>No plots yet.</p> : plots.map((p) => {
          const tx = transactions.filter((t) => t.plot_id === p.id);
          const paid = tx.reduce((s, t) => s + Number(t.amount), 0);
          const plotInstallments = installments.filter((i) => i.plot_id === p.id);
          const { overdue, nextDueDate } = scheduleStatus(plotInstallments, paid);
          const pct = p.price ? Math.round((paid / Number(p.price)) * 100) : 0;
          const closer = agents.find((a) => a.id === p.closed_by_agent_id);
          return (
            <div key={p.id} style={{ background: C.field, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: C.ink }}>{p.plot_no} · {projectName(p.project_id)}</span>
                <DueBadge overdue={overdue} dueDate={nextDueDate} />
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
                {fmt(paid)} paid of {fmt(p.price)} · Agent: {closer ? closer.name : "—"}
              </div>
              <ProgressBar pct={pct} color={overdue > 0 ? `linear-gradient(90deg,#7a2a24,${C.red})` : undefined} />
              <div style={{ marginTop: 10 }}>
                <RecordPayment plotId={p.id} customerId={customer.id} price={p.price} paid={paid} onDone={onPaymentAdded} />
              </div>
            </div>
          );
        })}
      </div>

      {assigning && (
        <AssignPlotForm customer={customer} plots={allPlots} projects={projects} agents={agents}
          onCancel={() => setAssigning(false)} onDone={() => { setAssigning(false); onChanged(); }} />
      )}

      {deletable && (
        <div style={{ marginTop: 18 }}>
          <DangerDeleteButton label={customer.name} onConfirm={remove} />
        </div>
      )}

      <AccessCode role="customer" targetId={customer.id} linked={linked} />
    </Modal>
  );
}

// Attaches this existing customer to another available plot (any project) —
// closes the gap where admin previously had no way to sell a second plot to
// someone who already owns one.
function AssignPlotForm({ customer, plots, projects, agents, onCancel, onDone }) {
  const activeAgents = agents.filter((a) => !a.archived);
  const availablePlots = plots.filter((p) => p.status === "available");
  const projectName = (id) => projects.find((p) => p.id === id)?.name ?? "—";
  const [plotId, setPlotId] = useState("");
  const [agentId, setAgentId] = useState(customer.agent_id || "");
  const [date, setDate] = useState(todayISO());
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true); setMsg("");
    const { error } = await supabase.rpc("record_sale", {
      p_plot_id: plotId, p_customer_id: customer.id, p_closer_id: agentId, p_sale_date: date,
    });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    onDone();
  }

  return (
    <div style={{ marginTop: 4, marginBottom: 18, background: C.field, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: MONO }}>Assign {customer.name} to a plot</div>
      {availablePlots.length === 0 ? <Empty>No available plots across any project right now.</Empty> : (
        <>
          <Select label="Plot" value={plotId} placeholder="— Select an available plot —" onChange={setPlotId}
            options={availablePlots.map((p) => ({ v: p.id, l: `${p.plot_no} · ${projectName(p.project_id)} · ${fmt(p.price)}` }))} />
          <Select label="Closed by agent" value={agentId} placeholder="— Select agent —" onChange={setAgentId}
            options={activeAgents.map((a) => ({ v: a.id, l: a.name }))} />
          <Field label="Sale date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={save} disabled={!plotId || !agentId || busy}>{busy ? "Recording…" : "Confirm sale"}</Button>
            <Button kind="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          </div>
        </>
      )}
    </div>
  );
}
