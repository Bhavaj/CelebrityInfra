import React, { useState } from "react";
import { supabase } from "../supabase";
import { C, MONO, fmt, Panel, Th, Td, Button, ConfirmButton, Field, Select, Modal, SearchBar, KV, Badge, TableScroll, Empty, useIsMobile } from "../ui";
import AccessCode from "./AccessCode";

export default function Partners({ agents, customers, commissions, plots, users, agentName, view, setView, onDone }) {
  const [adding, setAdding] = useState(false);
  const [openAgent, setOpenAgent] = useState(null);

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        <ViewToggle active={view === "tree"} onClick={() => setView("tree")}>Partner tree</ViewToggle>
        <ViewToggle active={view === "commissions"} onClick={() => setView("commissions")}>Commission ledger</ViewToggle>
      </div>

      {view === "tree" ? (
        <Panel title="Partner network" right={<Button onClick={() => setAdding((v) => !v)}>{adding ? "Close" : "＋ Add Partner"}</Button>}>
          <AgentTree agents={agents} agentName={agentName} onOpen={setOpenAgent} />
        </Panel>
      ) : (
        <CommissionsLedger commissions={commissions} plots={plots} agentName={agentName} />
      )}

      {adding && <CreateAgent agents={agents} onDone={() => { setAdding(false); onDone(); }} />}
      {openAgent && (
        <AgentCard agent={openAgent} agents={agents} customers={customers} commissions={commissions}
          users={users} onClose={() => setOpenAgent(null)} onOpenOther={setOpenAgent}
          onChanged={() => { setOpenAgent(null); onDone(); }} />
      )}
    </>
  );
}

function ViewToggle({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{ padding: "8px 16px", borderRadius: 0, border: `1px solid ${active ? C.gold : C.line}`,
        background: active ? C.goldSoft : "transparent", color: active ? C.goldLt : C.muted,
        fontWeight: active ? 600 : 400, cursor: "pointer", fontSize: 13, fontFamily: "'Hanken Grotesk',sans-serif" }}>
      {children}
    </button>
  );
}

function AgentTree({ agents, agentName, onOpen }) {
  const mobile = useIsMobile();
  const roots = agents.filter((a) => !a.sponsor_id);
  if (roots.length === 0) return <Empty>No partners yet. Use ＋ Add Partner to build your tree.</Empty>;
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
        style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", background: depth === 0 ? C.goldSoft : C.panel2,
          border: `1px solid ${C.line}`, borderRadius: 0, padding: "10px 12px", cursor: "pointer", opacity: agent.archived ? 0.55 : 1 }}>
        <span style={{ fontWeight: 600, color: C.ink }}>{agent.name}</span>
        {agent.archived && <Badge text="Archived" color={C.muted} />}
        <span style={{ fontSize: 10, background: "transparent", color: C.muted, border: `1px solid ${C.line}`, borderRadius: 0, padding: "2px 8px", fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.05em" }}>{agent.member_code}</span>
        <span style={{ fontSize: 12, color: C.muted }}>{agent.phone}</span>
        <span style={{ fontSize: 10, background: "transparent", color: C.goldLt, border: `1px solid ${C.goldLt}`, borderRadius: 0, padding: "2px 8px", fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.05em" }}>quota {agent.quota_percent}%</span>
        <span style={{ fontSize: 10, background: "transparent", color: C.ink, border: `1px solid ${C.line}`, borderRadius: 0, padding: "2px 8px", fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.05em" }}>own {ownTake}%</span>
        {upline.length > 0 && <span style={{ fontSize: 11, color: C.gold }}>upline: {upline.map(([id, p]) => `${agentName(id)} ${p}%`).join(", ")}</span>}
      </div>
      {children.map((c) => <TreeNode key={c.id} agent={c} agents={agents} agentName={agentName} onOpen={onOpen} depth={depth + 1} indent={indent} />)}
    </div>
  );
}

function AgentCard({ agent, agents, customers, commissions, users, onClose, onOpenOther, onChanged }) {
  const [msg, setMsg] = useState("");
  const email = users.find((u) => u.agent_id === agent.id)?.email;
  const myCustomers = customers.filter((c) => c.agent_id === agent.id);
  const downline = agents.filter((a) => a.sponsor_id === agent.id);
  const sponsor = agents.find((a) => a.id === agent.sponsor_id);
  const myComm = commissions.filter((c) => c.beneficiary_id === agent.id);
  const direct = myComm.filter((c) => c.kind === "Direct").reduce((s, c) => s + Number(c.amount), 0);
  const bonus = myComm.filter((c) => c.kind !== "Direct").reduce((s, c) => s + Number(c.amount), 0);
  const leaf = downline.length === 0 && myCustomers.length === 0 && myComm.length === 0;

  async function toggleArchive() {
    const { error } = await supabase.from("agents").update({ archived: !agent.archived }).eq("id", agent.id);
    if (error) { setMsg(error.message); return; }
    onChanged();
  }

  async function remove() {
    const { data, error } = await supabase.from("agents").delete().eq("id", agent.id).select();
    if (error || !data || data.length === 0) { setMsg(error?.message || "Delete didn't go through — this partner has history."); return; }
    onChanged();
  }

  return (
    <Modal title={agent.name} onClose={onClose}>
      {msg && <p style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{msg}</p>}
      {agent.archived && <div style={{ marginBottom: 12 }}><Badge text="Archived" color={C.muted} /></div>}
      <KV k="Member ID" v={agent.member_code} />
      <KV k="Phone" v={agent.phone || "—"} />
      <KV k="Login" v={email || "not linked yet"} />
      <KV k="Quota" v={`${agent.quota_percent}%`} />
      <KV k="Referred by" v={sponsor ? sponsor.name : "Direct partner"} />
      <KV k="Direct commission" v={fmt(direct)} />
      <KV k="Referral bonus" v={fmt(bonus)} />
      <KV k="Total earned" v={fmt(direct + bonus)} />

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontFamily: MONO }}>Customers ({myCustomers.length})</div>
        {myCustomers.length === 0 ? <p style={{ fontSize: 14, color: C.muted }}>None yet.</p> :
          myCustomers.map((c) => <div key={c.id} style={{ fontSize: 14, color: C.ink, padding: "4px 0" }}>{c.name} · {c.phone}</div>)}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontFamily: MONO }}>Partners referred ({downline.length})</div>
        {downline.length === 0 ? <p style={{ fontSize: 14, color: C.muted }}>None yet.</p> :
          downline.map((d) => (
            <button key={d.id} onClick={() => onOpenOther(d)}
              style={{ display: "block", background: "none", border: "none", color: C.gold, textDecoration: "underline", cursor: "pointer", fontSize: 14, padding: "4px 0", fontFamily: "'Hanken Grotesk',sans-serif" }}>
              {d.name} →
            </button>
          ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        {leaf ? (
          <ConfirmButton confirmText={`Delete ${agent.name}? This can't be undone.`} onConfirm={remove}>Delete</ConfirmButton>
        ) : (
          <Button kind="ghost" size="sm" onClick={toggleArchive}>{agent.archived ? "Unarchive" : "Archive"}</Button>
        )}
      </div>

      <AccessCode role="agent" targetId={agent.id} linked={!!email} />
    </Modal>
  );
}

const selStyle = { padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 0, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, background: C.field, color: C.ink };

function CreateAgent({ agents, onDone }) {
  const activeAgents = agents.filter((a) => !a.archived);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [quota, setQuota] = useState("6");
  const [sponsorId, setSponsorId] = useState("");
  const [splits, setSplits] = useState({});
  const [selfTake, setSelfTake] = useState("6");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const chain = [];
  let cur = activeAgents.find((a) => a.id === sponsorId);
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
    <Panel title="Add a new partner">
      <div style={{ maxWidth: 520 }}>
        <Field label="Partner name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ravi Kumar" />
        <Field label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98480 00000" />
        <Field label="Total commission quota (%)" type="number" value={quota}
          onChange={(e) => { setQuota(e.target.value); if (!sponsorId) setSelfTake(e.target.value); }} />
        <Select label="Referred by (sponsor)" value={sponsorId} placeholder="— Direct partner (no referrer) —"
          onChange={(v) => { setSponsorId(v); setSplits({}); }}
          options={activeAgents.map((a) => ({ v: a.id, l: a.name }))} />
        {!sponsorId && <p style={{ fontSize: 13, color: C.muted }}>Direct partner keeps the full {quota}% quota.</p>}
        {sponsorId && (
          <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 0, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: MONO }}>Split the {quota}% quota</div>
            <SplitRow label={`${name || "This partner"} (own take)`} value={selfTake} onChange={setSelfTake} />
            {chain.map((a) => (
              <SplitRow key={a.id} label={`${a.name} (upline)`} value={splits[a.id] || ""} onChange={(v) => setSplits({ ...splits, [a.id]: v })} />
            ))}
            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: valid ? C.green : C.red }}>
              Total: {total}% {valid ? "✓ matches quota" : `✗ must equal ${quota}%`}
            </div>
          </div>
        )}
        {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
        <Button onClick={save} disabled={!valid || busy}>{busy ? "Saving…" : "Create partner"}</Button>
      </div>
    </Panel>
  );
}

function SplitRow({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <span style={{ flex: 1, fontSize: 14, color: C.ink }}>{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0"
        style={{ width: 80, padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 0, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, textAlign: "right", background: C.field, color: C.ink }} />
      <span style={{ color: C.muted }}>%</span>
    </div>
  );
}

function CommissionsLedger({ commissions, plots, agentName }) {
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
    <Panel title="Commission ledger" right={
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexDirection: mobile ? "column" : "row" }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search partner, plot…" />
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
