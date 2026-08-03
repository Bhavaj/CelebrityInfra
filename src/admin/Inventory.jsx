import React, { useState } from "react";
import { supabase } from "../supabase";
import { C, MONO, fmt, fmtDate, todayISO, Panel, Stat, Badge, DueBadge, ProgressBar, Th, Td, Button, ConfirmButton, Field, Select, Modal, KV, useIsMobile, TableScroll, Empty } from "../ui";
import RecordPayment from "./RecordPayment";

const statusColor = { available: C.green, blocked: C.gold, sold: C.muted };

// Shared due/overdue math for a plot's installment schedule against what's
// actually been paid — reused by the plot card here and by the customer/agent
// portals so "overdue" always means the same thing everywhere.
export function scheduleStatus(installments, paid) {
  const today = todayISO();
  const sorted = [...installments].sort((a, b) => a.due_date < b.due_date ? -1 : 1);
  const dueSoFar = sorted.filter((i) => i.due_date <= today).reduce((s, i) => s + Number(i.amount), 0);
  const overdue = Math.max(0, dueSoFar - Number(paid));
  const next = sorted.find((i) => i.due_date > today);
  return { overdue, nextDueDate: next?.due_date || null, dueSoFar };
}

export default function Inventory({ plots, projectId, projects, customers, agents, transactions, installments, customerName, onDone, onSold }) {
  const mobile = useIsMobile();
  const [adding, setAdding] = useState(false);
  const [openPlot, setOpenPlot] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);

  const projectPlots = plots.filter((p) => p.project_id === projectId);

  return (
    <>
      <Panel title="Plots" right={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button kind="ghost" size="sm" onClick={() => setManageOpen(true)}>Manage Projects</Button>
          {projectId && <Button onClick={() => setAdding((v) => !v)}>{adding ? "Close" : "＋ Add Plot"}</Button>}
        </div>
      }>
        {!projectId ? <Empty>No project selected yet — use Manage Projects to create your first one.</Empty> :
        projectPlots.length === 0 ? <Empty>No plots in this project yet. Use ＋ Add Plot to create one.</Empty> : (
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
            {projectPlots.map((p) => {
              const tx = transactions.filter((t) => t.plot_id === p.id);
              const paid = tx.reduce((s, t) => s + Number(t.amount), 0);
              const plotInstallments = installments.filter((i) => i.plot_id === p.id);
              const { overdue } = p.status === "sold" ? scheduleStatus(plotInstallments, paid) : { overdue: 0 };
              return (
                <div key={p.id} onClick={() => setOpenPlot(p)} className="cip-card cip-tap cip-in-fast"
                  style={{ background: C.panel2, border: `1px solid ${overdue > 0 ? C.red : C.line}`, borderLeft: `4px solid ${statusColor[p.status]}`, borderRadius: 10, padding: 14, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, color: C.ink }}>{p.plot_no}</span>
                    <Badge text={p.status} color={statusColor[p.status]} />
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{p.size_sqyd} sq.yd</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginTop: 2 }}>{fmt(p.price)}</div>
                  {p.customer_id && <div style={{ fontSize: 11, color: C.emeraldLt, marginTop: 6 }}>→ {customerName(p.customer_id)}</div>}
                  {p.status === "sold" && overdue > 0 && <div style={{ marginTop: 8 }}><Badge text={`Overdue ${fmt(overdue)}`} color={C.red} /></div>}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {adding && <AddPlot projectId={projectId} onDone={() => { setAdding(false); onDone(); }} />}

      {openPlot && (
        <PlotCard plot={openPlot} customers={customers} agents={agents} transactions={transactions}
          installments={installments.filter((i) => i.plot_id === openPlot.id)}
          onClose={() => setOpenPlot(null)}
          onChanged={() => { setOpenPlot(null); onDone(); }}
          onPaymentAdded={onDone}
          onSold={() => { setOpenPlot(null); onSold(); }} />
      )}

      {manageOpen && (
        <ManageProjects projects={projects} plots={plots} onClose={() => setManageOpen(false)} onDone={onDone} />
      )}
    </>
  );
}

function PlotCard({ plot, customers, agents, transactions, installments, onClose, onChanged, onPaymentAdded, onSold }) {
  const [selling, setSelling] = useState(false);
  const [msg, setMsg] = useState("");
  const cust = customers.find((c) => c.id === plot.customer_id);
  const closer = agents.find((a) => a.id === plot.closed_by_agent_id);
  const tx = transactions.filter((t) => t.plot_id === plot.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const paid = tx.reduce((s, t) => s + Number(t.amount), 0);
  const deletable = plot.status !== "sold" && tx.length === 0;
  const { overdue, nextDueDate } = scheduleStatus(installments, paid);
  const pct = plot.price ? Math.round((paid / Number(plot.price)) * 100) : 0;

  async function setStatus(s) {
    await supabase.from("plots").update({ status: s }).eq("id", plot.id);
    onChanged();
  }

  async function remove() {
    const { data, error } = await supabase.from("plots").delete().eq("id", plot.id).select();
    if (error || !data || data.length === 0) { setMsg(error?.message || "Delete didn't go through — this plot may have history."); return; }
    onChanged();
  }

  return (
    <Modal title={`Plot ${plot.plot_no}`} onClose={onClose}>
      {msg && <p style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{msg}</p>}
      <KV k="Status" v={<Badge text={plot.status} color={statusColor[plot.status]} />} />
      <KV k="Size" v={`${plot.size_sqyd} sq.yd`} />
      <KV k="Price" v={fmt(plot.price)} />
      <KV k="Buyer" v={cust ? cust.name : "—"} />
      <KV k="Closed by" v={closer ? closer.name : "—"} />
      {plot.sale_date && <KV k="Sale date" v={plot.sale_date} />}

      {plot.status === "sold" && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: C.muted }}>{fmt(paid)} of {fmt(plot.price)} collected</span>
            <DueBadge overdue={overdue} dueDate={nextDueDate} />
          </div>
          <ProgressBar pct={pct} color={overdue > 0 ? `linear-gradient(90deg,#7a2a24,${C.red})` : undefined} />
        </div>
      )}

      {tx.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontFamily: MONO }}>Payments</div>
          {tx.map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ color: C.muted }}>{t.date} · {t.type}</span>
              <span style={{ color: C.ink, fontWeight: 500 }}>{fmt(t.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {plot.status === "sold" && (
        <InstallmentSchedule plotId={plot.id} installments={installments} onDone={onPaymentAdded} />
      )}

      {plot.status !== "sold" && !selling && (
        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          {plot.status !== "available" && <Button kind="ghost" size="sm" onClick={() => setStatus("available")}>Mark available</Button>}
          {plot.status !== "blocked" && <Button kind="ghost" size="sm" onClick={() => setStatus("blocked")}>Mark blocked</Button>}
          <Button onClick={() => setSelling(true)}>Sell this plot</Button>
          {deletable && <ConfirmButton confirmText={`Delete plot ${plot.plot_no}? This can't be undone.`} onConfirm={remove}>Delete</ConfirmButton>}
        </div>
      )}

      {plot.status !== "sold" && selling && (
        <SellPlotForm plot={plot} customers={customers} agents={agents} onCancel={() => setSelling(false)} onSold={onSold} />
      )}

      {plot.status === "sold" && plot.customer_id && (
        <RecordPayment plotId={plot.id} customerId={plot.customer_id} price={plot.price} paid={paid} onDone={onPaymentAdded} />
      )}
    </Modal>
  );
}

// Admin-editable due-date schedule for a sold plot. Actual money received
// stays in `transactions` (supports partial/EMI payments) — this table only
// defines what's due and when, so partial payments simply net against it.
function InstallmentSchedule({ plotId, installments, onDone }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function add() {
    if (!label || !amount || !dueDate) return;
    setBusy(true); setMsg("");
    const { error } = await supabase.from("plot_installments").insert({ plot_id: plotId, label, amount: Number(amount), due_date: dueDate });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setLabel(""); setAmount("");
    onDone();
  }

  async function updateDate(id, date) {
    await supabase.from("plot_installments").update({ due_date: date }).eq("id", id);
    onDone();
  }

  async function remove(id) {
    await supabase.from("plot_installments").delete().eq("id", id);
    onDone();
  }

  return (
    <div style={{ marginTop: 16, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: MONO }}>Payment schedule</div>
      {installments.length === 0 ? (
        <p style={{ fontSize: 13.5, color: C.muted, marginBottom: 12 }}>No schedule set yet — add installments below so due dates show up for the customer and agent.</p>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {[...installments].sort((a, b) => a.due_date < b.due_date ? -1 : 1).map((i) => (
            <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.line}`, flexWrap: "wrap" }}>
              <span style={{ flex: 1, fontSize: 13.5, color: C.ink, minWidth: 100 }}>{i.label}</span>
              <span style={{ fontSize: 13.5, color: C.muted }}>{fmt(i.amount)}</span>
              <input type="date" value={i.due_date} onChange={(e) => updateDate(i.id, e.target.value)}
                style={{ padding: "5px 8px", border: `1px solid ${C.line}`, borderRadius: 6, background: C.field, color: C.ink, fontSize: 12.5, fontFamily: "'Outfit',sans-serif" }} />
              <button onClick={() => remove(i.id)} type="button" aria-label="Remove installment"
                style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 140px" }}>
          <Field label="Label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Installment 2" />
        </div>
        <div style={{ flex: "1 1 100px" }}>
          <Field label="Amount (₹)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" />
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <Field label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <Button size="sm" onClick={add} disabled={busy || !label || !amount}>{busy ? "Adding…" : "Add"}</Button>
        </div>
      </div>
      {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
    </div>
  );
}

function SellPlotForm({ plot, customers, agents, onCancel, onSold }) {
  const activeAgents = agents.filter((a) => !a.archived);
  const [customerId, setCustomerId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [newCust, setNewCust] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [custList, setCustList] = useState(customers);

  const agent = activeAgents.find((a) => a.id === agentId);

  async function addCustomer() {
    if (!newName || !newPhone) return;
    setBusy(true); setMsg("");
    const { data, error } = await supabase.from("customers").insert({ name: newName, phone: newPhone }).select().single();
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setCustList((l) => [...l, data]);
    setCustomerId(data.id);
    setNewCust(false);
    setNewName(""); setNewPhone("");
  }

  async function save() {
    setBusy(true); setMsg("");
    const { error } = await supabase.rpc("record_sale", {
      p_plot_id: plot.id, p_customer_id: customerId, p_closer_id: agentId, p_sale_date: date,
    });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    onSold();
  }

  const valid = customerId && agentId;

  return (
    <div style={{ marginTop: 18, borderTop: `1px solid ${C.line}`, paddingTop: 16 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: MONO }}>Sell this plot</div>

      {!newCust ? (
        <>
          <Select label="Customer" value={customerId} placeholder="— Select customer —" onChange={setCustomerId}
            options={custList.map((c) => ({ v: c.id, l: c.name }))} />
          <button onClick={() => setNewCust(true)} type="button" className="cip-tap"
            style={{ background: "none", border: "none", color: C.gold, textDecoration: "underline", cursor: "pointer", fontSize: 13, padding: "2px 0", marginBottom: 14, fontFamily: "'Outfit',sans-serif", borderRadius: 4 }}>
            + New customer
          </button>
        </>
      ) : (
        <div style={{ background: C.field, border: `1px solid ${C.line}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <Field label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Customer name" />
          <Field label="Phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="98480 00000" />
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" onClick={addCustomer} disabled={busy || !newName || !newPhone}>{busy ? "Saving…" : "Add customer"}</Button>
            <Button kind="ghost" size="sm" onClick={() => setNewCust(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <Select label="Closed by agent" value={agentId} placeholder="— Select agent —" onChange={setAgentId}
        options={activeAgents.map((a) => ({ v: a.id, l: a.name }))} />
      <Field label="Sale date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      {agent && (
        <div style={{ background: C.goldSoft, borderRadius: 8, padding: 14, marginBottom: 14, fontSize: 13.5, color: C.ink }}>
          Commission is computed automatically from {agent.name}'s rate on this project (and cascaded up their sponsor chain) once you confirm the sale.
        </div>
      )}
      {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <Button onClick={save} disabled={!valid || busy}>{busy ? "Recording…" : "Confirm sale"}</Button>
        <Button kind="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function AddPlot({ projectId, onDone }) {
  const [plotNo, setPlotNo] = useState("");
  const [size, setSize] = useState("121");
  const [price, setPrice] = useState("250000");
  const [status, setStatus] = useState("available");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function add() {
    if (!plotNo) return;
    setBusy(true); setMsg("");
    const { error } = await supabase.from("plots").insert({
      project_id: projectId, plot_no: plotNo, size_sqyd: Number(size), price: Number(price), status,
    });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    onDone();
  }

  return (
    <Panel title="Add a plot">
      <div style={{ maxWidth: 480 }}>
        <Field label="Plot number" value={plotNo} onChange={(e) => setPlotNo(e.target.value)} placeholder="e.g. A-01" />
        <Field label="Size (sq. yd)" type="number" value={size} onChange={(e) => setSize(e.target.value)} />
        <Field label="Price (₹)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <Select label="Status" value={status} onChange={setStatus}
          options={[{ v: "available", l: "Available" }, { v: "blocked", l: "Blocked" }]} />
        {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
        <Button onClick={add} disabled={busy || !plotNo}>{busy ? "Saving…" : "Create plot"}</Button>
      </div>
    </Panel>
  );
}

function ManageProjects({ projects, plots, onClose, onDone }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const plotCount = (id) => plots.filter((p) => p.project_id === id).length;

  async function add() {
    if (!name) return;
    setBusy(true); setMsg("");
    const { error } = await supabase.from("projects").insert({ name, location });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setName(""); setLocation(""); onDone();
  }

  async function toggleArchive(p) {
    const { error } = await supabase.from("projects").update({ archived: !p.archived }).eq("id", p.id);
    if (error) { setMsg(error.message); return; }
    onDone();
  }

  async function remove(p) {
    const { data, error } = await supabase.from("projects").delete().eq("id", p.id).select();
    if (error || !data || data.length === 0) { setMsg(error?.message || "Delete didn't go through — this project still has plots."); return; }
    onDone();
  }

  return (
    <Modal title="Manage Projects" onClose={onClose}>
      {msg && <p style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{msg}</p>}
      <TableScroll minWidth={480}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Name</Th><Th>Location</Th><Th right>Plots</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <Td bold>{p.name} {p.archived && <Badge text="Archived" color={C.muted} />}</Td>
                <Td>{p.location}</Td>
                <Td right>{plotCount(p.id)}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Button kind="ghost" size="sm" onClick={() => toggleArchive(p)}>{p.archived ? "Unarchive" : "Archive"}</Button>
                    {plotCount(p.id) === 0 && (
                      <ConfirmButton confirmText={`Delete project "${p.name}"? This can't be undone.`} onConfirm={() => remove(p)}>Delete</ConfirmButton>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
            {projects.length === 0 && <tr><Td colSpan={4}>No projects yet.</Td></tr>}
          </tbody>
        </table>
      </TableScroll>

      <div style={{ marginTop: 20, borderTop: `1px solid ${C.line}`, paddingTop: 16 }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: MONO }}>Add a project</div>
        <Field label="Project name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Celebrity's Park-1" />
        <Field label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Narayankhed, Telangana" />
        <Button onClick={add} disabled={busy || !name}>{busy ? "Saving…" : "Create project"}</Button>
      </div>
    </Modal>
  );
}
