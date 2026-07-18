import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { C, fmt, Panel, Stat, Badge, Th, Td, Button, Field, Select, Modal, SearchBar, KV, useIsMobile, TableScroll, Empty } from "./ui";
import LinkUsers from "./LinkUsers";

const statusColor = { available: C.green, blocked: C.gold, sold: C.muted };

export default function Admin() {
  const mobile = useIsMobile();
  const [tab, setTab] = useState("overview");
  const [activeProject, setActiveProject] = useState("");
  const [data, setData] = useState({ agents: [], customers: [], plots: [], projects: [], commissions: [], transactions: [], users: [] });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [agents, customers, plots, projects, commissions, transactions, users] = await Promise.all([
      supabase.from("agents").select("*"),
      supabase.from("customers").select("*"),
      supabase.from("plots").select("*").order("plot_no"),
      supabase.from("projects").select("*").order("name"),
      supabase.from("commissions").select("*"),
      supabase.from("transactions").select("*"),
      supabase.rpc("list_users"),
    ]);
    const projs = projects.data || [];
    setData({
      agents: agents.data || [], customers: customers.data || [],
      plots: plots.data || [], projects: projs,
      commissions: commissions.data || [], transactions: transactions.data || [],
      users: users.data || [],
    });
    // default the picker to the first project if nothing chosen yet
    setActiveProject((cur) => cur || (projs[0]?.id ?? ""));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const agentName = (id) => data.agents.find((a) => a.id === id)?.name ?? "—";
  const customerName = (id) => data.customers.find((c) => c.id === id)?.name ?? "—";

  // Everything below is scoped to the active project.
  const projectPlots = data.plots.filter((p) => p.project_id === activeProject);
  const plotIds = new Set(projectPlots.map((p) => p.id));
  const projectCommissions = data.commissions.filter((c) => plotIds.has(c.plot_id));
  const projectTx = data.transactions.filter((t) => plotIds.has(t.plot_id));

  const sold = projectPlots.filter((p) => p.status === "sold");
  const revenue = sold.reduce((s, p) => s + Number(p.price), 0);
  const collected = projectTx.reduce((s, t) => s + Number(t.amount), 0);
  const payout = projectCommissions.reduce((s, c) => s + Number(c.amount), 0);
  const projectCustomerIds = new Set(sold.map((p) => p.customer_id).filter(Boolean));

  const tabs = [
    ["overview", "Overview"], ["projects", "Projects"], ["plots", "Plots"],
    ["agents", "Agents"], ["sale", "Record Sale"], ["payments", "Payments"], ["commissions", "Commissions"],
    ["link", "Link Logins"],
  ];

  const activeName = data.projects.find((p) => p.id === activeProject)?.name;

  return (
    <div>
      {/* Project picker bar */}
      {data.projects.length > 0 && (
        <div style={{ display: "flex", alignItems: mobile ? "stretch" : "center", flexDirection: mobile ? "column" : "row", gap: mobile ? 6 : 12, marginBottom: 18 }}>
          <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Active project</span>
          <select value={activeProject} onChange={(e) => setActiveProject(e.target.value)}
            style={{ padding: "10px 14px", border: `1px solid ${C.gold}`, borderRadius: 6, fontFamily: "'Jost',sans-serif", fontSize: 15, fontWeight: 600, color: C.ink, background: C.field, width: mobile ? "100%" : "auto" }}>
            {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      <div className="cip-tabs" style={{ marginBottom: 22, borderBottom: `1px solid ${C.line}`, paddingBottom: 2 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: mobile ? "nowrap" : "wrap", width: mobile ? "max-content" : "auto" }}>
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ padding: "9px 16px", borderRadius: 6, flexShrink: 0, whiteSpace: "nowrap", border: `1px solid ${tab === k ? C.gold : C.line}`,
                background: tab === k ? `linear-gradient(180deg,${C.goldLt},${C.gold})` : C.panel2, color: tab === k ? "#1A1200" : C.ink,
                fontWeight: tab === k ? 600 : 400, cursor: "pointer", fontSize: 13, fontFamily: "'Jost',sans-serif" }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading && <p style={{ color: C.muted }}>Loading…</p>}

      {!loading && data.projects.length === 0 && tab !== "projects" && (
        <Panel title="No projects yet">
          <p style={{ color: C.muted, marginBottom: 14 }}>Create your first project (e.g. Celebrity's Park-1) to begin adding plots and recording sales.</p>
          <Button onClick={() => setTab("projects")}>Go to Projects</Button>
        </Panel>
      )}

      {!loading && tab === "overview" && data.projects.length > 0 && (
        <>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: 28, color: C.ink, margin: "0 0 16px" }}>{activeName}</h2>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
            <Stat label="Revenue booked" value={fmt(revenue)} accent={C.steel} />
            <Stat label="Collected" value={fmt(collected)} accent={C.green} />
            <Stat label="Commission payout" value={fmt(payout)} accent={C.gold} />
            <Stat label="Plots sold" value={`${sold.length}/${projectPlots.length}`} />
            <Stat label="Customers" value={projectCustomerIds.size} />
            <Stat label="Agents (company)" value={data.agents.length} />
          </div>
        </>
      )}

      {!loading && tab === "projects" && <Projects projects={data.projects} onDone={load} />}

      {!loading && tab === "plots" && data.projects.length > 0 && (
        <PlotsTab plots={projectPlots} projectId={activeProject} customers={data.customers}
          transactions={data.transactions} agents={data.agents} customerName={customerName} onDone={load} />
      )}

      {!loading && tab === "agents" && (
        <AgentsTab agents={data.agents} customers={data.customers} commissions={data.commissions}
          plots={data.plots} users={data.users} agentName={agentName} onDone={load} />
      )}

      {!loading && tab === "sale" && data.projects.length > 0 && (
        <RecordSale plots={projectPlots} customers={data.customers} agents={data.agents} onDone={() => { load(); setTab("commissions"); }} />
      )}

      {!loading && tab === "payments" && data.projects.length > 0 && (
        <PaymentsTab transactions={projectTx} plots={data.plots} customers={data.customers} />
      )}

      {!loading && tab === "commissions" && (
        <CommissionsTab commissions={projectCommissions} plots={data.plots} agentName={agentName} projectName={activeName} />
      )}

      {!loading && tab === "link" && <LinkUsers agents={data.agents} customers={data.customers} onDone={load} />}
    </div>
  );
}

// ---------- PROJECTS ----------
function Projects({ projects, onDone }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function add() {
    if (!name) return;
    setBusy(true); setMsg("");
    const { error } = await supabase.from("projects").insert({ name, location });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setName(""); setLocation(""); onDone();
  }

  return (
    <>
      <Panel title="Projects">
        {projects.length === 0 ? <Empty>No projects yet. Add one below.</Empty> : (
          <TableScroll minWidth={360}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>Name</Th><Th>Location</Th></tr></thead>
              <tbody>
                {projects.map((p) => <tr key={p.id}><Td bold>{p.name}</Td><Td>{p.location}</Td></tr>)}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>
      <Panel title="Add a project">
        <div style={{ maxWidth: 480 }}>
          <Field label="Project name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Celebrity's Park-1" />
          <Field label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Narayankhed, Telangana" />
          {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
          <Button onClick={add} disabled={busy || !name}>{busy ? "Saving…" : "Create project"}</Button>
        </div>
      </Panel>
    </>
  );
}

// ---------- PAYMENTS (searchable/filterable transaction ledger) ----------
function PaymentsTab({ transactions, plots, customers }) {
  const mobile = useIsMobile();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const plotNo = (id) => plots.find((p) => p.id === id)?.plot_no ?? "—";
  const custName = (id) => customers.find((c) => c.id === id)?.name ?? "—";

  const types = Array.from(new Set(transactions.map((t) => t.type).filter(Boolean)));
  const rows = transactions.filter((t) => {
    if (type && t.type !== type) return false;
    if (!q) return true;
    const hay = `${custName(t.customer_id)} ${plotNo(t.plot_id)} ${t.type} ${t.date}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }).sort((a, b) => (a.date < b.date ? 1 : -1));

  const total = rows.reduce((s, t) => s + Number(t.amount), 0);

  return (
    <Panel title="Payments received" right={
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexDirection: mobile ? "column" : "row" }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search customer, plot…" />
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...selStyle, width: mobile ? "100%" : undefined }}>
          <option value="">All types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    }>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>{rows.length} payments · total {fmt(total)}</div>
      {rows.length === 0 ? <Empty>No payments match your search.</Empty> : (
        <TableScroll minWidth={620}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Date</Th><Th>Customer</Th><Th>Plot</Th><Th>Type</Th><Th right>Amount</Th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <Td>{t.date}</Td><Td bold>{custName(t.customer_id)}</Td>
                  <Td>{plotNo(t.plot_id)}</Td><Td>{t.type}</Td><Td right bold>{fmt(t.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
    </Panel>
  );
}

// ---------- COMMISSIONS (searchable) ----------
function CommissionsTab({ commissions, plots, agentName, projectName }) {
  const mobile = useIsMobile();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const plotNo = (id) => plots.find((p) => p.id === id)?.plot_no ?? "—";
  const rows = commissions.filter((c) => {
    if (kind && c.kind !== kind) return false;
    if (!q) return true;
    const hay = `${agentName(c.beneficiary_id)} ${plotNo(c.plot_id)} ${c.kind}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const total = rows.reduce((s, c) => s + Number(c.amount), 0);

  return (
    <Panel title={`Commission ledger — ${projectName ?? ""}`} right={
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexDirection: mobile ? "column" : "row" }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search agent, plot…" />
        <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ ...selStyle, width: mobile ? "100%" : undefined }}>
          <option value="">All types</option>
          <option value="Direct">Direct</option>
          <option value="Referral bonus">Referral bonus</option>
        </select>
      </div>
    }>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>{rows.length} entries · total {fmt(total)}</div>
      {rows.length === 0 ? <Empty>No commissions match your search.</Empty> : (
        <TableScroll minWidth={620}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Plot</Th><Th>Beneficiary</Th><Th>Type</Th><Th right>%</Th><Th right>Amount</Th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <Td bold>{plotNo(c.plot_id)}</Td>
                  <Td>{agentName(c.beneficiary_id)}</Td>
                  <Td><span style={{ color: c.kind === "Direct" ? C.emeraldLt : C.goldLt, fontWeight: 600, fontSize: 13 }}>{c.kind}</span></Td>
                  <Td right>{c.pct}%</Td>
                  <Td right bold>{fmt(c.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
    </Panel>
  );
}

// ---------- PLOTS (clickable cards → detail modal) ----------
function PlotsTab({ plots, projectId, customers, transactions, agents, customerName, onDone }) {
  const mobile = useIsMobile();
  const [adding, setAdding] = useState(false);
  const [openPlot, setOpenPlot] = useState(null);
  return (
    <>
      <Panel title="Plot inventory" right={<Button onClick={() => setAdding((v) => !v)}>{adding ? "Close" : "＋ Add Plot"}</Button>}>
        {plots.length === 0 ? <Empty>No plots in this project yet. Use ＋ Add Plot to create one.</Empty> : (
          <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
            {plots.map((p) => (
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
        <PlotCard plot={openPlot} customers={customers} transactions={transactions} agents={agents}
          onClose={() => setOpenPlot(null)} onChanged={() => { setOpenPlot(null); onDone(); }} />
      )}
    </>
  );
}

function PlotCard({ plot, customers, transactions, agents, onClose, onChanged }) {
  const cust = customers.find((c) => c.id === plot.customer_id);
  const closer = agents.find((a) => a.id === plot.closed_by_agent_id);
  const tx = transactions.filter((t) => t.plot_id === plot.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const paid = tx.reduce((s, t) => s + Number(t.amount), 0);

  async function setStatus(s) {
    await supabase.from("plots").update({ status: s }).eq("id", plot.id);
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

      {plot.status !== "sold" && (
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          {plot.status !== "available" && <Button kind="ghost" onClick={() => setStatus("available")}>Mark available</Button>}
          {plot.status !== "blocked" && <Button kind="ghost" onClick={() => setStatus("blocked")}>Mark blocked</Button>}
        </div>
      )}
    </Modal>
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

// ---------- AGENTS (clickable tree → detail card) ----------
function AgentsTab({ agents, customers, commissions, plots, users, agentName, onDone }) {
  const [adding, setAdding] = useState(false);
  const [openAgent, setOpenAgent] = useState(null);
  return (
    <>
      <Panel title="Agent commission tree" right={<Button onClick={() => setAdding((v) => !v)}>{adding ? "Close" : "＋ Add Agent"}</Button>}>
        <AgentTree agents={agents} agentName={agentName} onOpen={setOpenAgent} />
      </Panel>
      {adding && <CreateAgent agents={agents} onDone={() => { setAdding(false); onDone(); }} />}
      {openAgent && (
        <AgentCard agent={openAgent} agents={agents} customers={customers} commissions={commissions}
          plots={plots} users={users} onClose={() => setOpenAgent(null)} onOpenOther={setOpenAgent} />
      )}
    </>
  );
}

function AgentTree({ agents, agentName, onOpen }) {
  const mobile = useIsMobile();
  const roots = agents.filter((a) => !a.sponsor_id);
  if (roots.length === 0) return <Empty>No agents yet. Use ＋ Add Agent to build your tree.</Empty>;
  return (
    <div className="cip-scroll-x">
      <div style={{ minWidth: mobile ? "max-content" : "auto" }}>
        {roots.map((r) => <TreeNode key={r.id} agent={r} agents={agents} agentName={agentName} onOpen={onOpen} depth={0} indent={mobile ? 14 : 24} />)}
      </div>
    </div>
  );
}
function TreeNode({ agent, agents, agentName, onOpen, depth, indent }) {
  const children = agents.filter((a) => a.sponsor_id === agent.id);
  const split = agent.split || {};
  const ownTake = split.self ?? agent.quota_percent;
  const upline = Object.entries(split).filter(([k]) => k !== "self");
  return (
    <div style={{ marginLeft: depth * indent, borderLeft: depth ? `2px solid ${C.goldSoft}` : "none", paddingLeft: depth ? 14 : 0, marginTop: 8 }}>
      <div onClick={() => onOpen(agent)} className="cip-card cip-card-h"
        style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", background: depth === 0 ? C.goldSoft : C.panel2, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
        <span style={{ fontWeight: 600, color: C.ink }}>{agent.name}</span>
        <span style={{ fontSize: 12, color: C.muted }}>{agent.phone}</span>
        <span style={{ fontSize: 11, background: C.navy2, color: C.ink, borderRadius: 20, padding: "2px 8px" }}>quota {agent.quota_percent}%</span>
        <span style={{ fontSize: 11, background: C.panel, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 20, padding: "2px 8px" }}>own {ownTake}%</span>
        {upline.length > 0 && <span style={{ fontSize: 11, color: C.gold }}>upline: {upline.map(([id, p]) => `${agentName(id)} ${p}%`).join(", ")}</span>}
      </div>
      {children.map((c) => <TreeNode key={c.id} agent={c} agents={agents} agentName={agentName} onOpen={onOpen} depth={depth + 1} indent={indent} />)}
    </div>
  );
}

function AgentCard({ agent, agents, customers, commissions, plots, users, onClose, onOpenOther }) {
  const email = users.find((u) => u.agent_id === agent.id)?.email;
  const myCustomers = customers.filter((c) => c.agent_id === agent.id);
  const downline = agents.filter((a) => a.sponsor_id === agent.id);
  const sponsor = agents.find((a) => a.id === agent.sponsor_id);
  const myComm = commissions.filter((c) => c.beneficiary_id === agent.id);
  const direct = myComm.filter((c) => c.kind === "Direct").reduce((s, c) => s + Number(c.amount), 0);
  const bonus = myComm.filter((c) => c.kind !== "Direct").reduce((s, c) => s + Number(c.amount), 0);

  return (
    <Modal title={agent.name} onClose={onClose}>
      <KV k="Phone" v={agent.phone || "—"} />
      <KV k="Login email" v={email || "not linked yet"} />
      <KV k="Quota" v={`${agent.quota_percent}%`} />
      <KV k="Referred by" v={sponsor ? sponsor.name : "Direct agent"} />
      <KV k="Direct commission" v={fmt(direct)} />
      <KV k="Referral bonus" v={fmt(bonus)} />
      <KV k="Total earned" v={fmt(direct + bonus)} />

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Customers ({myCustomers.length})</div>
        {myCustomers.length === 0 ? <p style={{ fontSize: 14, color: C.muted }}>None yet.</p> :
          myCustomers.map((c) => <div key={c.id} style={{ fontSize: 14, color: C.ink, padding: "4px 0" }}>{c.name} · {c.phone}</div>)}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Agents referred ({downline.length})</div>
        {downline.length === 0 ? <p style={{ fontSize: 14, color: C.muted }}>None yet.</p> :
          downline.map((d) => (
            <button key={d.id} onClick={() => onOpenOther(d)}
              style={{ display: "block", background: "none", border: "none", color: C.gold, textDecoration: "underline", cursor: "pointer", fontSize: 14, padding: "4px 0", fontFamily: "'Jost',sans-serif" }}>
              {d.name} →
            </button>
          ))}
      </div>
    </Modal>
  );
}

const selStyle = { padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 6, fontFamily: "'Jost',sans-serif", fontSize: 14, background: C.field, color: C.ink };

function CreateAgent({ agents, onDone }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [quota, setQuota] = useState("6");
  const [sponsorId, setSponsorId] = useState("");
  const [splits, setSplits] = useState({});
  const [selfTake, setSelfTake] = useState("6");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const chain = [];
  let cur = agents.find((a) => a.id === sponsorId);
  while (cur) { chain.push(cur); cur = agents.find((a) => a.id === cur.sponsor_id); }

  const uplineSum = chain.reduce((s, a) => s + Number(splits[a.id] || 0), 0);
  const total = Number(selfTake || 0) + uplineSum;
  const q = Number(quota || 0);
  const valid = name && Math.abs(total - q) < 0.001;

  async function save() {
    setBusy(true); setMsg("");
    const split = { self: Number(selfTake) };
    chain.forEach((a) => { if (Number(splits[a.id]) > 0) split[a.id] = Number(splits[a.id]); });
    const { error } = await supabase.from("agents").insert({
      name, phone, quota_percent: q, sponsor_id: sponsorId || null, split,
    });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    onDone();
  }

  return (
    <Panel title="Add a new agent">
      <div style={{ maxWidth: 520 }}>
        <Field label="Agent name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ravi Kumar" />
        <Field label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98480 00000" />
        <Field label="Total commission quota (%)" type="number" value={quota}
          onChange={(e) => { setQuota(e.target.value); if (!sponsorId) setSelfTake(e.target.value); }} />
        <Select label="Referred by (sponsor)" value={sponsorId} placeholder="— Direct agent (no referrer) —"
          onChange={(v) => { setSponsorId(v); setSplits({}); }}
          options={agents.map((a) => ({ v: a.id, l: a.name }))} />
        {!sponsorId && <p style={{ fontSize: 13, color: C.muted }}>Direct agent keeps the full {quota}% quota.</p>}
        {sponsorId && (
          <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Split the {quota}% quota</div>
            <SplitRow label={`${name || "This agent"} (own take)`} value={selfTake} onChange={setSelfTake} />
            {chain.map((a) => (
              <SplitRow key={a.id} label={`${a.name} (upline)`} value={splits[a.id] || ""} onChange={(v) => setSplits({ ...splits, [a.id]: v })} />
            ))}
            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: valid ? C.green : C.red }}>
              Total: {total}% {valid ? "✓ matches quota" : `✗ must equal ${quota}%`}
            </div>
          </div>
        )}
        {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
        <Button onClick={save} disabled={!valid || busy}>{busy ? "Saving…" : "Create agent"}</Button>
      </div>
    </Panel>
  );
}

function SplitRow({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <span style={{ flex: 1, fontSize: 14, color: C.ink }}>{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0"
        style={{ width: 80, padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 4, fontFamily: "'Jost',sans-serif", fontSize: 15, textAlign: "right", background: C.field, color: C.ink }} />
      <span style={{ color: C.muted }}>%</span>
    </div>
  );
}

// ---------- RECORD SALE ----------
function RecordSale({ plots, customers, agents, onDone }) {
  const available = plots.filter((p) => p.status !== "sold");
  const [plotId, setPlotId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const plot = plots.find((p) => p.id === plotId);
  const agent = agents.find((a) => a.id === agentId);
  const pool = plot && agent ? Math.round(Number(plot.price) * Number(agent.quota_percent) / 100) : 0;

  async function save() {
    setBusy(true); setMsg("");
    const { error } = await supabase.rpc("record_sale", {
      p_plot_id: plotId, p_customer_id: customerId, p_closer_id: agentId, p_sale_date: date,
    });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    onDone();
  }

  const valid = plotId && customerId && agentId;

  return (
    <Panel title="Record a plot sale">
      <div style={{ maxWidth: 520 }}>
        <Select label="Plot" value={plotId} placeholder="— Select plot —" onChange={setPlotId}
          options={available.map((p) => ({ v: p.id, l: `${p.plot_no} · ${fmt(p.price)} · ${p.status}` }))} />
        <Select label="Customer" value={customerId} placeholder="— Select customer —" onChange={setCustomerId}
          options={customers.map((c) => ({ v: c.id, l: c.name }))} />
        <Select label="Closed by agent" value={agentId} placeholder="— Select agent —" onChange={setAgentId}
          options={agents.map((a) => ({ v: a.id, l: `${a.name} · quota ${a.quota_percent}%` }))} />
        <Field label="Sale date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        {plot && agent && (
          <div style={{ background: C.goldSoft, borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 14, color: C.ink }}>
            Commission pool: <b>{fmt(pool)}</b> ({agent.quota_percent}% of {fmt(plot.price)}) — split per {agent.name}'s tree.
          </div>
        )}
        {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
        <Button onClick={save} disabled={!valid || busy}>{busy ? "Recording…" : "Record sale"}</Button>
      </div>
    </Panel>
  );
}
