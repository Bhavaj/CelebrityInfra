import React, { useState } from "react";
import { supabase } from "../supabase";
import { C, R, MONO, FONT, DISPLAY, fmt, fmtDate, todayISO, Panel, Stat, Badge, DueBadge, ProgressBar, Th, Td, Button, DangerDeleteButton, Field, Select, Modal, Tabs, useIsMobile, TableScroll, Empty } from "../ui";
import RecordPayment from "./RecordPayment";

const statusColor = { available: C.green, blocked: C.gold, booked: C.steel, sold: C.muted };

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

// Chronological record of every payment against a plot — first row is
// whichever payment was recorded first (usually the booking advance), each
// later payment (installment, final, etc.) appends below. "Balance" is what's
// still owed against the plot price (price minus payments so far), not a
// running total of payments — showing the cumulative-paid figure under a
// "Balance" header read backwards (e.g. a ₹50k advance on a ₹2.5L plot showed
// "Balance ₹50,000", as if only ₹50k were left rather than ₹2L).
export function PaymentLedger({ transactions, price }) {
  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return String(a.created_at || "").localeCompare(String(b.created_at || ""));
  });
  let paidSoFar = 0;
  return (
    <TableScroll minWidth={460}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><Th>Date</Th><Th>Type</Th><Th right>Amount</Th><Th right>Balance due</Th></tr></thead>
        <tbody>
          {sorted.map((t) => {
            paidSoFar += Number(t.amount);
            const balanceDue = Math.max(0, Number(price) - paidSoFar);
            return (
              <tr key={t.id}>
                <Td>{fmtDate(t.date)}</Td>
                <Td>{t.type || "—"}</Td>
                <Td right>{fmt(t.amount)}</Td>
                <Td right bold>{fmt(balanceDue)}</Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableScroll>
  );
}

export default function Inventory({ plots, projectId, customers, agents, transactions, installments, customerProjectAgents, customerName, onDone, onSold }) {
  const mobile = useIsMobile();
  const [adding, setAdding] = useState(false);
  const [openPlot, setOpenPlot] = useState(null);

  const projectPlots = plots.filter((p) => p.project_id === projectId);

  return (
    <>
      <Panel title="Plots" right={
        projectId && <Button onClick={() => setAdding(true)}>＋ Add Plot</Button>
      }>
        {!projectId ? <Empty>No project selected yet — use the "Projects" button next to the selector above to create your first one.</Empty> :
        projectPlots.length === 0 ? <Empty>No plots in this project yet. Use ＋ Add Plot to create one.</Empty> : (
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
            {projectPlots.map((p) => {
              const tx = transactions.filter((t) => t.plot_id === p.id);
              const paid = tx.reduce((s, t) => s + Number(t.amount), 0);
              const plotInstallments = installments.filter((i) => i.plot_id === p.id);
              const { overdue } = (p.status === "sold" || p.status === "booked") ? scheduleStatus(plotInstallments, paid) : { overdue: 0 };
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
                  {(p.status === "sold" || p.status === "booked") && overdue > 0 && <div style={{ marginTop: 8 }}><Badge text={`Overdue ${fmt(overdue)}`} color={C.red} /></div>}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {adding && <AddPlot projectId={projectId} onClose={() => setAdding(false)} onDone={() => { setAdding(false); onDone(); }} />}

      {openPlot && (
        <PlotCard plot={openPlot} customers={customers} agents={agents} transactions={transactions}
          installments={installments.filter((i) => i.plot_id === openPlot.id)}
          customerProjectAgents={customerProjectAgents}
          onClose={() => setOpenPlot(null)}
          onChanged={() => { setOpenPlot(null); onDone(); }}
          onPaymentAdded={onDone}
          onSold={() => { setOpenPlot(null); onSold(); }} />
      )}

    </>
  );
}

function PlotCard({ plot, customers, agents, transactions, installments, customerProjectAgents, onClose, onChanged, onPaymentAdded, onSold }) {
  const [selling, setSelling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [detailTab, setDetailTab] = useState("ledger");
  const [msg, setMsg] = useState("");
  const [plotNo, setPlotNo] = useState(plot.plot_no);
  const [size, setSize] = useState(String(plot.size_sqyd));
  const [price, setPrice] = useState(String(plot.price));
  const [busy, setBusy] = useState(false);
  const cust = customers.find((c) => c.id === plot.customer_id);
  const closer = agents.find((a) => a.id === plot.closed_by_agent_id);
  const tx = transactions.filter((t) => t.plot_id === plot.id);
  const paid = tx.reduce((s, t) => s + Number(t.amount), 0);
  const deletable = plot.status === "available" || plot.status === "blocked";
  const hasMoney = plot.status === "sold" || plot.status === "booked";
  const { overdue, nextDueDate } = scheduleStatus(installments, paid);
  const pct = plot.price ? Math.round((paid / Number(plot.price)) * 100) : 0;

  async function setStatus(s) {
    await supabase.from("plots").update({ status: s }).eq("id", plot.id);
    onChanged();
  }

  async function saveEdit() {
    setBusy(true); setMsg("");
    const { error } = await supabase.from("plots")
      .update({ plot_no: plotNo, size_sqyd: Number(size), price: Number(price) }).eq("id", plot.id);
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    onChanged();
  }

  async function remove() {
    const { data, error } = await supabase.from("plots").delete().eq("id", plot.id).select();
    if (error || !data || data.length === 0) { setMsg(error?.message || "Delete didn't go through — this plot may have history."); return; }
    onChanged();
  }

  if (editing) {
    return (
      <Modal title={`Edit plot ${plot.plot_no}`} onClose={() => setEditing(false)} maxWidth={460}>
        <Field label="Plot number" value={plotNo} onChange={(e) => setPlotNo(e.target.value)} />
        <Field label="Size (sq. yd)" type="number" value={size} onChange={(e) => setSize(e.target.value)} />
        <Field label="Price (₹)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        {paid > 0 && (
          <p style={{ fontSize: 12.5, color: C.muted, marginTop: -8, marginBottom: 14 }}>Payments have already been recorded against this plot — changing the price here won't recompute commission already accrued on those payments.</p>
        )}
        {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={saveEdit} disabled={!plotNo || busy}>{busy ? "Saving…" : "Save changes"}</Button>
          <Button kind="ghostLight" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={
      <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        Plot {plot.plot_no}
        <Badge text={plot.status} color={statusColor[plot.status]} />
      </span>
    } onClose={onClose} maxWidth={640}>
      {msg && <p style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{msg}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px", marginBottom: 20 }}>
        <Fact label="Size" value={`${plot.size_sqyd} sq.yd`} />
        <Fact label="Price" value={fmt(plot.price)} />
        <Fact label="Buyer" value={cust ? cust.name : "—"} />
        <Fact label="Agent" value={closer ? closer.name : "—"} />
        {plot.sale_date && <Fact label="Booking date" value={fmtDate(plot.sale_date)} />}
      </div>

      {hasMoney && (
        <div style={{ background: C.field, border: `1px solid ${C.line}`, borderRadius: R.lg, padding: 16, marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 14 }}>
            <MoneyFact label="Paid" value={fmt(paid)} accent={C.emeraldLt} />
            <MoneyFact label="Remaining" value={fmt(Math.max(0, Number(plot.price) - paid))} accent={overdue > 0 ? C.red : undefined} />
          </div>
          <ProgressBar pct={pct} color={overdue > 0 ? `linear-gradient(90deg,#7a2a24,${C.red})` : undefined} />
          <div style={{ marginTop: 10 }}><DueBadge overdue={overdue} dueDate={nextDueDate} /></div>
        </div>
      )}

      {hasMoney && plot.customer_id && (
        <RecordPayment plotId={plot.id} price={plot.price} paid={paid} onDone={onPaymentAdded} />
      )}

      {hasMoney && (
        <div style={{ marginTop: 20 }}>
          <Tabs value={detailTab} onChange={setDetailTab} options={[
            { v: "ledger", l: `Ledger${tx.length ? ` · ${tx.length}` : ""}` },
            { v: "schedule", l: `Schedule${installments.length ? ` · ${installments.length}` : ""}` },
          ]} />
          <div style={{ marginTop: 14 }}>
            {detailTab === "ledger" ? (
              tx.length > 0 ? <PaymentLedger transactions={tx} price={plot.price} /> : (
                <p style={{ fontSize: 13.5, color: C.muted, margin: 0 }}>No payments recorded yet — the first one you add above (e.g. the booking advance) will show up here.</p>
              )
            ) : (
              <InstallmentSchedule plotId={plot.id} installments={installments} onDone={onPaymentAdded} />
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 20, paddingTop: 18, borderTop: `1px solid ${C.line}`, flexWrap: "wrap" }}>
        <Button kind="ghost" size="sm" onClick={() => { setPlotNo(plot.plot_no); setSize(String(plot.size_sqyd)); setPrice(String(plot.price)); setEditing(true); }}>Edit</Button>
        {plot.status === "blocked" && <Button kind="ghost" size="sm" onClick={() => setStatus("available")}>Mark available</Button>}
        {plot.status === "available" && <Button kind="ghost" size="sm" onClick={() => setStatus("blocked")}>Mark blocked</Button>}
        {plot.status === "available" && !selling && <Button onClick={() => setSelling(true)}>Book this plot</Button>}
        {plot.status === "booked" && <Button onClick={() => setStatus("sold")}>Mark sold</Button>}
        {deletable && <DangerDeleteButton label={`plot ${plot.plot_no}`} onConfirm={remove} />}
      </div>

      {plot.status === "available" && selling && (
        <BookPlotForm plot={plot} customers={customers} agents={agents} customerProjectAgents={customerProjectAgents} onCancel={() => setSelling(false)} onSold={onSold} />
      )}
    </Modal>
  );
}

export function Fact({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: C.muted, fontFamily: FONT, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14.5, color: C.ink, fontWeight: 600, fontFamily: FONT }}>{value}</div>
    </div>
  );
}

export function MoneyFact({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: C.muted, fontFamily: FONT, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || C.ink, fontFamily: DISPLAY }}>{value}</div>
    </div>
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
    <div>
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

// The customer's agent for this plot's project is decided once, in the
// "Agent by project" section on the customer's record — this form just
// reads that (single source of truth) instead of asking again. Only if the
// customer has no agent yet for this project does it ask, and that pick is
// saved back into customer_project_agents so it's remembered for next time.
function BookPlotForm({ plot, customers, agents, customerProjectAgents, onCancel, onSold }) {
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

  const customer = custList.find((c) => c.id === customerId);
  const assignment = customerId && customerProjectAgents?.find((a) => a.customer_id === customerId && a.project_id === plot.project_id);
  const assignedAgent = assignment && agents.find((a) => a.id === assignment.agent_id);
  const pickedAgent = activeAgents.find((a) => a.id === agentId);
  const agent = assignedAgent || pickedAgent;

  function pickCustomer(id) {
    setCustomerId(id);
    setAgentId("");
  }

  async function addCustomer() {
    if (!newName || !newPhone) return;
    setBusy(true); setMsg("");
    const { data, error } = await supabase.from("customers").insert({ name: newName, phone: newPhone }).select().single();
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setCustList((l) => [...l, data]);
    pickCustomer(data.id);
    setNewCust(false);
    setNewName(""); setNewPhone("");
  }

  async function save() {
    const finalAgentId = assignedAgent ? assignedAgent.id : agentId;
    if (!finalAgentId) return;
    setBusy(true); setMsg("");
    if (!assignedAgent) {
      const { error: linkError } = await supabase.from("customer_project_agents")
        .upsert({ customer_id: customerId, project_id: plot.project_id, agent_id: finalAgentId }, { onConflict: "customer_id,project_id" });
      if (linkError) { setBusy(false); setMsg(linkError.message); return; }
    }
    const { error } = await supabase.rpc("book_plot", {
      p_plot_id: plot.id, p_customer_id: customerId, p_agent_id: finalAgentId, p_booking_date: date,
    });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    onSold();
  }

  const valid = customerId && (assignedAgent || agentId);

  return (
    <div style={{ marginTop: 18, borderTop: `1px solid ${C.line}`, paddingTop: 16 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: MONO }}>Book this plot</div>

      {!newCust ? (
        <>
          <Select label="Customer" value={customerId} placeholder="— Select customer —" onChange={pickCustomer}
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

      {customer && (assignedAgent ? (
        <div style={{ fontSize: 13.5, color: C.ink, marginBottom: 14 }}>
          Agent for this project: <strong>{assignedAgent.name}</strong>
        </div>
      ) : (
        <Select label="Agent for this project (no agent assigned yet)" value={agentId} placeholder="— Select agent —"
          onChange={setAgentId} options={activeAgents.map((a) => ({ v: a.id, l: a.name }))} />
      ))}
      <Field label="Booking date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      {agent && (
        <div style={{ background: C.goldSoft, borderRadius: 8, padding: 14, marginBottom: 14, fontSize: 13.5, color: C.ink }}>
          This just books the plot to the customer — commission for {agent.name} (and their sponsor chain) accrues gradually as payments come in, not all at once now.
        </div>
      )}
      {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <Button onClick={save} disabled={!valid || busy}>{busy ? "Booking…" : "Confirm booking"}</Button>
        <Button kind="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function AddPlot({ projectId, onClose, onDone }) {
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
    <Modal title="Add a plot" onClose={onClose} maxWidth={480}>
      <Field label="Plot number" value={plotNo} onChange={(e) => setPlotNo(e.target.value)} placeholder="e.g. A-01" />
      <Field label="Size (sq. yd)" type="number" value={size} onChange={(e) => setSize(e.target.value)} />
      <Field label="Price (₹)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
      <Select label="Status" value={status} onChange={setStatus}
        options={[{ v: "available", l: "Available" }, { v: "blocked", l: "Blocked" }]} />
      {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
      <Button onClick={add} disabled={busy || !plotNo}>{busy ? "Saving…" : "Create plot"}</Button>
    </Modal>
  );
}

export function ManageProjects({ projects, plots, onClose, onDone }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [editingProject, setEditingProject] = useState(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editMsg, setEditMsg] = useState("");

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

  function startEdit(p) {
    setEditingProject(p); setEditName(p.name); setEditLocation(p.location || ""); setEditMsg("");
  }

  async function saveEdit() {
    if (!editName) return;
    setEditBusy(true); setEditMsg("");
    const { error } = await supabase.from("projects").update({ name: editName, location: editLocation }).eq("id", editingProject.id);
    setEditBusy(false);
    if (error) { setEditMsg(error.message); return; }
    setEditingProject(null); onDone();
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
                    <Button kind="ghost" size="sm" onClick={() => startEdit(p)}>Edit</Button>
                    <Button kind="ghost" size="sm" onClick={() => toggleArchive(p)}>{p.archived ? "Unarchive" : "Archive"}</Button>
                    {plotCount(p.id) === 0 && (
                      <DangerDeleteButton label={`project "${p.name}"`} onConfirm={() => remove(p)} />
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

      {editingProject && (
        <Modal title={`Edit ${editingProject.name}`} onClose={() => setEditingProject(null)} maxWidth={460}>
          <Field label="Project name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Celebrity's Park-1" />
          <Field label="Location" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Narayankhed, Telangana" />
          {editMsg && <p style={{ color: C.red, fontSize: 13 }}>{editMsg}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={saveEdit} disabled={!editName || editBusy}>{editBusy ? "Saving…" : "Save changes"}</Button>
            <Button kind="ghostLight" onClick={() => setEditingProject(null)}>Cancel</Button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
