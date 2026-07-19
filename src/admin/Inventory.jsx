import React, { useState } from "react";
import { supabase } from "../supabase";
import { C, fmt, Panel, Stat, Badge, Th, Td, Button, ConfirmButton, Field, Select, Modal, KV, useIsMobile, TableScroll, Empty } from "../ui";

const statusColor = { available: C.green, blocked: C.gold, sold: C.muted };

export default function Inventory({ plots, projectId, projects, customers, agents, transactions, customerName, onDone, onSold }) {
  const mobile = useIsMobile();
  const [adding, setAdding] = useState(false);
  const [openPlot, setOpenPlot] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);

  const projectPlots = plots.filter((p) => p.project_id === projectId);

  return (
    <>
      <Panel title="Plot inventory" right={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button kind="ghost" size="sm" onClick={() => setManageOpen(true)}>Manage Projects</Button>
          {projectId && <Button onClick={() => setAdding((v) => !v)}>{adding ? "Close" : "＋ Add Plot"}</Button>}
        </div>
      }>
        {!projectId ? <Empty>No project selected yet — use Manage Projects to create your first one.</Empty> :
        projectPlots.length === 0 ? <Empty>No plots in this project yet. Use ＋ Add Plot to create one.</Empty> : (
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
            {projectPlots.map((p) => (
              <div key={p.id} onClick={() => setOpenPlot(p)} className="cip-card cip-card-h"
                style={{ background: C.panel, border: `1px solid ${C.line}`, borderLeft: `4px solid ${statusColor[p.status]}`, borderRadius: 12, padding: 14, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, color: C.ink }}>{p.plot_no}</span>
                  <Badge text={p.status} color={statusColor[p.status]} />
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{p.size_sqyd} sq.yd</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginTop: 2 }}>{fmt(p.price)}</div>
                {p.customer_id && <div style={{ fontSize: 11, color: C.emeraldLt, marginTop: 6 }}>→ {customerName(p.customer_id)}</div>}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {adding && <AddPlot projectId={projectId} onDone={() => { setAdding(false); onDone(); }} />}

      {openPlot && (
        <PlotCard plot={openPlot} customers={customers} agents={agents} transactions={transactions}
          onClose={() => setOpenPlot(null)}
          onChanged={() => { setOpenPlot(null); onDone(); }}
          onSold={() => { setOpenPlot(null); onSold(); }} />
      )}

      {manageOpen && (
        <ManageProjects projects={projects} plots={plots} onClose={() => setManageOpen(false)} onDone={onDone} />
      )}
    </>
  );
}

function PlotCard({ plot, customers, agents, transactions, onClose, onChanged, onSold }) {
  const [selling, setSelling] = useState(false);
  const cust = customers.find((c) => c.id === plot.customer_id);
  const closer = agents.find((a) => a.id === plot.closed_by_agent_id);
  const tx = transactions.filter((t) => t.plot_id === plot.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const paid = tx.reduce((s, t) => s + Number(t.amount), 0);
  const deletable = plot.status !== "sold" && tx.length === 0;

  async function setStatus(s) {
    await supabase.from("plots").update({ status: s }).eq("id", plot.id);
    onChanged();
  }

  async function remove() {
    const { data, error } = await supabase.from("plots").delete().eq("id", plot.id).select();
    if (error || !data || data.length === 0) { alert(error?.message || "Delete didn't go through — this plot may have history."); return; }
    onChanged();
  }

  return (
    <Modal title={`Plot ${plot.plot_no}`} onClose={onClose}>
      <KV k="Status" v={<Badge text={plot.status} color={statusColor[plot.status]} />} />
      <KV k="Size" v={`${plot.size_sqyd} sq.yd`} />
      <KV k="Price" v={fmt(plot.price)} />
      <KV k="Buyer" v={cust ? cust.name : "—"} />
      <KV k="Closed by" v={closer ? closer.name : "—"} />
      {plot.sale_date && <KV k="Sale date" v={plot.sale_date} />}
      {plot.status === "sold" && <KV k="Collected" v={`${fmt(paid)} of ${fmt(plot.price)}`} />}

      {tx.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Payments</div>
          {tx.map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ color: C.muted }}>{t.date} · {t.type}</span>
              <span style={{ color: C.ink, fontWeight: 500 }}>{fmt(t.amount)}</span>
            </div>
          ))}
        </div>
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
    </Modal>
  );
}

function SellPlotForm({ plot, customers, agents, onCancel, onSold }) {
  const activeAgents = agents.filter((a) => !a.archived);
  const [customerId, setCustomerId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [newCust, setNewCust] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [custList, setCustList] = useState(customers);

  const agent = activeAgents.find((a) => a.id === agentId);
  const pool = agent ? Math.round(Number(plot.price) * Number(agent.quota_percent) / 100) : 0;

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
      <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Sell this plot</div>

      {!newCust ? (
        <>
          <Select label="Customer" value={customerId} placeholder="— Select customer —" onChange={setCustomerId}
            options={custList.map((c) => ({ v: c.id, l: c.name }))} />
          <button onClick={() => setNewCust(true)} type="button"
            style={{ background: "none", border: "none", color: C.gold, textDecoration: "underline", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 14, fontFamily: "'Jost',sans-serif" }}>
            + New customer
          </button>
        </>
      ) : (
        <div style={{ background: C.field, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <Field label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Customer name" />
          <Field label="Phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="98480 00000" />
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" onClick={addCustomer} disabled={busy || !newName || !newPhone}>{busy ? "Saving…" : "Add customer"}</Button>
            <Button kind="ghost" size="sm" onClick={() => setNewCust(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <Select label="Closed by agent" value={agentId} placeholder="— Select agent —" onChange={setAgentId}
        options={activeAgents.map((a) => ({ v: a.id, l: `${a.name} · quota ${a.quota_percent}%` }))} />
      <Field label="Sale date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      {agent && (
        <div style={{ background: C.goldSoft, borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 14, color: C.ink }}>
          Commission pool: <b>{fmt(pool)}</b> ({agent.quota_percent}% of {fmt(plot.price)}) — split per {agent.name}'s tree.
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
        <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Add a project</div>
        <Field label="Project name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Celebrity's Park-1" />
        <Field label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Narayankhed, Telangana" />
        <Button onClick={add} disabled={busy || !name}>{busy ? "Saving…" : "Create project"}</Button>
      </div>
    </Modal>
  );
}
