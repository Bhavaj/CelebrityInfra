import React, { useState } from "react";
import { supabase } from "../supabase";
import { C, MONO, fmt, fmtDate, todayISO, Panel, Th, Td, Button, DangerDeleteButton, SearchBar, Modal, KV, DueBadge, ProgressBar, TableScroll, Empty, useIsMobile, RowCard, RowLine, Field, Select, Badge } from "../ui";
import AccessCode from "./AccessCode";
import RecordPayment from "./RecordPayment";
import { scheduleStatus } from "./Inventory";

export default function Customers({ customers, plots, transactions, installments, users, agents, projects, activeProject, customerProjectAgents, onDone }) {
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
          <Button onClick={() => setAdding(true)}>＋ Add Customer</Button>
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

      {adding && <CreateCustomer onClose={() => setAdding(false)} onDone={() => { setAdding(false); onDone(); }} />}

      {openCust && (
        <CustomerCard customer={openCust} plots={plotsFor(openCust.id)} transactions={transactions}
          installments={installments} allPlots={plots} projects={projects} agents={agents}
          customerProjectAgents={customerProjectAgents}
          linked={users.some((u) => u.customer_id === openCust.id)}
          onClose={() => setOpenCust(null)} onChanged={() => { setOpenCust(null); onDone(); }}
          onPaymentAdded={onDone} />
      )}
    </>
  );
}

function CreateCustomer({ onClose, onDone }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true); setMsg("");
    const { error } = await supabase.from("customers").insert({ name, phone });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    onDone();
  }

  return (
    <Modal title="Add a new customer" onClose={onClose} maxWidth={460}>
      <Field label="Customer name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" />
      <Field label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98480 00000" />
      {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
      <Button onClick={save} disabled={!name || busy}>{busy ? "Saving…" : "Create customer"}</Button>
    </Modal>
  );
}

function CustomerCard({ customer, plots, transactions, installments, allPlots, projects, agents, customerProjectAgents, linked, onClose, onChanged, onPaymentAdded }) {
  const [msg, setMsg] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone || "");
  const [busy, setBusy] = useState(false);
  const projectName = (id) => projects.find((p) => p.id === id)?.name ?? "—";
  const totalPaid = plots.reduce((s, p) => s + transactions.filter((t) => t.plot_id === p.id).reduce((a, t) => a + Number(t.amount), 0), 0);
  const deletable = plots.length === 0 && transactions.filter((t) => t.customer_id === customer.id).length === 0;

  async function saveEdit() {
    setBusy(true); setMsg("");
    const { error } = await supabase.from("customers").update({ name, phone }).eq("id", customer.id);
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    onChanged();
  }

  async function remove() {
    const { data, error } = await supabase.from("customers").delete().eq("id", customer.id).select();
    if (error || !data || data.length === 0) { setMsg(error?.message || "Delete didn't go through — this customer has history."); return; }
    onChanged();
  }

  if (editing) {
    return (
      <Modal title={`Edit ${customer.name}`} onClose={() => setEditing(false)} maxWidth={460}>
        <Field label="Customer name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={saveEdit} disabled={!name || busy}>{busy ? "Saving…" : "Save changes"}</Button>
          <Button kind="ghostLight" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={customer.name} onClose={onClose} maxWidth={720}>
      {msg && <p style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{msg}</p>}
      <KV k="Member ID" v={customer.member_code} />
      <KV k="Phone" v={customer.phone} />
      <KV k="Total paid across all plots" v={fmt(totalPaid)} />

      <CustomerProjectAgents customer={customer} projects={projects} agents={agents}
        customerProjectAgents={customerProjectAgents} onChanged={onChanged} />

      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: MONO }}>Plots owned ({plots.length})</div>
          <Button size="sm" onClick={() => setAssigning((v) => !v)}>{assigning ? "Close" : "＋ Book another plot"}</Button>
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
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Badge text={p.status} color={p.status === "sold" ? C.muted : C.steel} />
                  <DueBadge overdue={overdue} dueDate={nextDueDate} />
                </div>
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
                {fmt(paid)} paid of {fmt(p.price)} · Agent: {closer ? closer.name : "—"}
              </div>
              <ProgressBar pct={pct} color={overdue > 0 ? `linear-gradient(90deg,#7a2a24,${C.red})` : undefined} />
              <div style={{ marginTop: 10 }}>
                <RecordPayment plotId={p.id} price={p.price} paid={paid} onDone={onPaymentAdded} />
              </div>
            </div>
          );
        })}
      </div>

      {assigning && (
        <AssignPlotForm customer={customer} plots={allPlots} projects={projects} agents={agents}
          customerProjectAgents={customerProjectAgents}
          onCancel={() => setAssigning(false)} onDone={() => { setAssigning(false); onChanged(); }} />
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
        <Button kind="ghost" size="sm" onClick={() => { setName(customer.name); setPhone(customer.phone || ""); setEditing(true); }}>Edit</Button>
        {deletable && <DangerDeleteButton label={customer.name} onConfirm={remove} />}
      </div>

      <AccessCode role="customer" targetId={customer.id} linked={linked} />
    </Modal>
  );
}

// A customer can have a different (or the same) agent per project — assigned
// here, and used as the default "closed by" agent when booking a plot for
// this customer in that project (still overridable per booking).
function CustomerProjectAgents({ customer, projects, agents, customerProjectAgents, onChanged }) {
  const [busyProject, setBusyProject] = useState("");
  const [msg, setMsg] = useState("");
  const activeAgents = agents.filter((a) => !a.archived);
  const activeProjects = projects.filter((p) => !p.archived);
  const assignmentFor = (projectId) => customerProjectAgents?.find((a) => a.customer_id === customer.id && a.project_id === projectId);

  async function assign(projectId, agentId) {
    setBusyProject(projectId); setMsg("");
    const { error } = agentId
      ? await supabase.from("customer_project_agents")
          .upsert({ customer_id: customer.id, project_id: projectId, agent_id: agentId }, { onConflict: "customer_id,project_id" })
      : await supabase.from("customer_project_agents")
          .delete().eq("customer_id", customer.id).eq("project_id", projectId);
    setBusyProject("");
    if (error) { setMsg(error.message); return; }
    onChanged();
  }

  if (activeProjects.length === 0) return null;

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: MONO }}>Agent by project</div>
      {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
      {activeProjects.map((p) => {
        const current = assignmentFor(p.id);
        return (
          <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "6px 0" }}>
            <span style={{ flex: "1 1 140px", fontSize: 13.5, color: C.ink }}>{p.name}</span>
            <div style={{ flex: "1 1 180px", minWidth: 160 }}>
              <Select compact value={current?.agent_id || ""} placeholder="— No agent —"
                onChange={(v) => assign(p.id, v)}
                options={activeAgents.map((a) => ({ v: a.id, l: a.name }))} />
            </div>
            {busyProject === p.id && <span style={{ fontSize: 12, color: C.muted }}>Saving…</span>}
          </div>
        );
      })}
    </div>
  );
}

// Attaches this existing customer to another available plot (any project) —
// closes the gap where admin previously had no way to sell a second plot to
// someone who already owns one.
function AssignPlotForm({ customer, plots, projects, agents, customerProjectAgents, onCancel, onDone }) {
  const activeAgents = agents.filter((a) => !a.archived);
  const availablePlots = plots.filter((p) => p.status === "available");
  const projectName = (id) => projects.find((p) => p.id === id)?.name ?? "—";
  const [plotId, setPlotId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [agentTouched, setAgentTouched] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function pickPlot(id) {
    setPlotId(id);
    if (!agentTouched) {
      const plot = availablePlots.find((p) => p.id === id);
      const assigned = customerProjectAgents?.find((a) => a.customer_id === customer.id && a.project_id === plot?.project_id);
      setAgentId(assigned?.agent_id || "");
    }
  }

  async function save() {
    setBusy(true); setMsg("");
    const { error } = await supabase.rpc("book_plot", {
      p_plot_id: plotId, p_customer_id: customer.id, p_agent_id: agentId, p_booking_date: date,
    });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    onDone();
  }

  return (
    <div style={{ marginTop: 4, marginBottom: 18, background: C.field, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: MONO }}>Book {customer.name} into a plot</div>
      {availablePlots.length === 0 ? <Empty>No available plots across any project right now.</Empty> : (
        <>
          <Select label="Plot" value={plotId} placeholder="— Select an available plot —" onChange={pickPlot}
            options={availablePlots.map((p) => ({ v: p.id, l: `${p.plot_no} · ${projectName(p.project_id)} · ${fmt(p.price)}` }))} />
          <Select label="Agent for this project" value={agentId} placeholder="— Select agent —"
            onChange={(v) => { setAgentTouched(true); setAgentId(v); }}
            options={activeAgents.map((a) => ({ v: a.id, l: a.name }))} />
          <Field label="Booking date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={save} disabled={!plotId || !agentId || busy}>{busy ? "Booking…" : "Confirm booking"}</Button>
            <Button kind="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          </div>
        </>
      )}
    </div>
  );
}
