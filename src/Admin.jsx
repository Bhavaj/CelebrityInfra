import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { C, fmt, Panel, Stat, Badge, Th, Td, Button, Field, Select } from "./ui";
import LinkUsers from "./LinkUsers";

const statusColor = { available: C.green, blocked: C.gold, sold: C.muted };

export default function Admin() {
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState({ agents: [], customers: [], plots: [], projects: [], commissions: [], transactions: [] });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [agents, customers, plots, projects, commissions, transactions] = await Promise.all([
      supabase.from("agents").select("*"),
      supabase.from("customers").select("*"),
      supabase.from("plots").select("*").order("plot_no"),
      supabase.from("projects").select("*"),
      supabase.from("commissions").select("*"),
      supabase.from("transactions").select("*"),
    ]);
    setData({
      agents: agents.data || [], customers: customers.data || [],
      plots: plots.data || [], projects: projects.data || [],
      commissions: commissions.data || [], transactions: transactions.data || [],
    });
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const agentName = (id) => data.agents.find((a) => a.id === id)?.name ?? "—";
  const customerName = (id) => data.customers.find((c) => c.id === id)?.name ?? "—";

  const sold = data.plots.filter((p) => p.status === "sold");
  const revenue = sold.reduce((s, p) => s + Number(p.price), 0);
  const collected = data.transactions.reduce((s, t) => s + Number(t.amount), 0);
  const payout = data.commissions.reduce((s, c) => s + Number(c.amount), 0);

  const tabs = [
    ["overview", "Overview"], ["plots", "Plots"], ["agents", "Agents & Tree"],
    ["commissions", "Commissions"], ["newagent", "＋ Add Agent"], ["sale", "＋ Record Sale"],
    ["link", "Link Logins"],
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding: "9px 16px", borderRadius: 6, border: `1px solid ${tab === k ? C.gold : C.line}`,
              background: tab === k ? C.gold : "#fff", color: tab === k ? C.navy : C.ink,
              fontWeight: tab === k ? 600 : 400, cursor: "pointer", fontSize: 13, fontFamily: "'Jost',sans-serif" }}>
            {l}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: C.muted }}>Loading…</p>}

      {!loading && tab === "overview" && (
        <>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
            <Stat label="Revenue booked" value={fmt(revenue)} accent={C.navy} />
            <Stat label="Collected" value={fmt(collected)} accent={C.green} />
            <Stat label="Commission payout" value={fmt(payout)} accent={C.gold} />
            <Stat label="Plots sold" value={`${sold.length}/${data.plots.length}`} />
            <Stat label="Customers" value={data.customers.length} />
            <Stat label="Agents" value={data.agents.length} />
          </div>
        </>
      )}

      {!loading && tab === "plots" && (
        <Panel title="Plot inventory">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
            {data.plots.map((p) => (
              <div key={p.id} style={{ border: `1px solid ${C.line}`, borderLeft: `4px solid ${statusColor[p.status]}`, borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, color: C.ink }}>{p.plot_no}</span>
                  <Badge text={p.status} color={statusColor[p.status]} />
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{p.size_sqyd} sq.yd</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{fmt(p.price)}</div>
                {p.customer_id && <div style={{ fontSize: 11, color: C.navy2, marginTop: 4 }}>→ {customerName(p.customer_id)}</div>}
              </div>
            ))}
            {data.plots.length === 0 && <p style={{ color: C.muted }}>No plots yet. Add them via SQL or a plots form.</p>}
          </div>
        </Panel>
      )}

      {!loading && tab === "agents" && (
        <Panel title="Agent commission tree" right={<span style={{ fontSize: 12, color: C.muted }}>total pool never exceeds each agent's quota</span>}>
          <AgentTree agents={data.agents} agentName={agentName} />
        </Panel>
      )}

      {!loading && tab === "commissions" && (
        <Panel title="Commission ledger">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>Plot</Th><Th>Beneficiary</Th><Th>Type</Th><Th right>%</Th><Th right>Amount</Th></tr></thead>
              <tbody>
                {data.commissions.map((c) => {
                  const plot = data.plots.find((p) => p.id === c.plot_id);
                  return (
                    <tr key={c.id}>
                      <Td bold>{plot?.plot_no ?? "—"}</Td>
                      <Td>{agentName(c.beneficiary_id)}</Td>
                      <Td><span style={{ color: c.kind === "Direct" ? C.navy : C.gold, fontWeight: 600, fontSize: 13 }}>{c.kind}</span></Td>
                      <Td right>{c.pct}%</Td>
                      <Td right bold>{fmt(c.amount)}</Td>
                    </tr>
                  );
                })}
                {data.commissions.length === 0 && <tr><Td>No commissions yet. Record a sale.</Td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {!loading && tab === "newagent" && <CreateAgent agents={data.agents} onDone={() => { load(); setTab("agents"); }} />}
      {!loading && tab === "sale" && <RecordSale plots={data.plots} customers={data.customers} agents={data.agents} onDone={() => { load(); setTab("commissions"); }} />}
      {!loading && tab === "link" && <LinkUsers agents={data.agents} customers={data.customers} onDone={load} />}
    </div>
  );
}

// ---------- Agent tree (recursive) ----------
function AgentTree({ agents, agentName }) {
  const roots = agents.filter((a) => !a.sponsor_id);
  if (roots.length === 0) return <p style={{ color: C.muted }}>No agents yet. Add one from “＋ Add Agent”.</p>;
  return <div>{roots.map((r) => <TreeNode key={r.id} agent={r} agents={agents} agentName={agentName} depth={0} />)}</div>;
}
function TreeNode({ agent, agents, agentName, depth }) {
  const children = agents.filter((a) => a.sponsor_id === agent.id);
  const split = agent.split || {};
  const ownTake = split.self ?? agent.quota_percent;
  const upline = Object.entries(split).filter(([k]) => k !== "self");
  return (
    <div style={{ marginLeft: depth * 24, borderLeft: depth ? `2px solid ${C.goldSoft}` : "none", paddingLeft: depth ? 14 : 0, marginTop: 8 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", background: depth === 0 ? C.goldSoft : "transparent", borderRadius: 8, padding: depth === 0 ? "8px 10px" : "4px 0" }}>
        <span style={{ fontWeight: 600, color: C.ink }}>{agent.name}</span>
        <span style={{ fontSize: 12, color: C.muted }}>{agent.phone}</span>
        <span style={{ fontSize: 11, background: C.navy, color: "#fff", borderRadius: 20, padding: "2px 8px" }}>quota {agent.quota_percent}%</span>
        <span style={{ fontSize: 11, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 20, padding: "2px 8px" }}>own {ownTake}%</span>
        {upline.length > 0 && <span style={{ fontSize: 11, color: C.gold }}>upline: {upline.map(([id, p]) => `${agentName(id)} ${p}%`).join(", ")}</span>}
      </div>
      {children.map((c) => <TreeNode key={c.id} agent={c} agents={agents} agentName={agentName} depth={depth + 1} />)}
    </div>
  );
}

// ---------- Create Agent form (upline % split, must sum to quota) ----------
function CreateAgent({ agents, onDone }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [quota, setQuota] = useState("6");
  const [sponsorId, setSponsorId] = useState("");
  const [splits, setSplits] = useState({}); // {agentId: pct} for upline
  const [selfTake, setSelfTake] = useState("6");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Build the upline chain from sponsor upward.
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

        {!sponsorId && (
          <p style={{ fontSize: 13, color: C.muted }}>Direct agent keeps the full {quota}% quota.</p>
        )}

        {sponsorId && (
          <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
              Split the {quota}% quota
            </div>
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
        style={{ width: 80, padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 4, fontFamily: "'Jost',sans-serif", fontSize: 15, textAlign: "right" }} />
      <span style={{ color: C.muted }}>%</span>
    </div>
  );
}

// ---------- Record Sale form (fires record_sale in the DB) ----------
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
            Commission pool: <b>{fmt(pool)}</b> ({agent.quota_percent}% of {fmt(plot.price)}) — will be split per {agent.name}'s tree.
          </div>
        )}
        {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
        <Button onClick={save} disabled={!valid || busy}>{busy ? "Recording…" : "Record sale"}</Button>
      </div>
    </Panel>
  );
}
