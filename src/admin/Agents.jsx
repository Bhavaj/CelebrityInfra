import React, { useState } from "react";
import { supabase } from "../supabase";
import { C, MONO, fmt, Panel, Th, Td, Button, ConfirmButton, Field, Select, Modal, SearchBar, KV, Badge, TableScroll, Empty, useIsMobile, RowCard, RowLine } from "../ui";
import AccessCode from "./AccessCode";

export default function Agents({ agents, customers, commissions, plots, users, agentName, view, setView, onDone }) {
  const [adding, setAdding] = useState(false);
  const [openAgent, setOpenAgent] = useState(null);

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        <ViewToggle active={view === "tree"} onClick={() => setView("tree")}>Agent tree</ViewToggle>
        <ViewToggle active={view === "commissions"} onClick={() => setView("commissions")}>Commission ledger</ViewToggle>
      </div>

      {view === "tree" ? (
        <Panel title="Agent network" right={<Button onClick={() => setAdding((v) => !v)}>{adding ? "Close" : "＋ Add Agent"}</Button>}>
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
    <button onClick={onClick} className="cip-tap"
      style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${active ? C.gold : C.line}`,
        background: active ? C.goldSoft : "transparent", color: active ? C.goldLt : C.muted,
        fontWeight: active ? 600 : 400, cursor: "pointer", fontSize: 13, fontFamily: "'Inter',sans-serif" }}>
      {children}
    </button>
  );
}

// Org-chart-style tree — each node with reports gets a +/− toggle so deep
// downlines can be collapsed instead of forcing a horizontal scroll. Indent
// per level is fixed and small so it holds up down to phone widths.
function AgentTree({ agents, agentName, onOpen }) {
  const roots = agents.filter((a) => !a.sponsor_id);
  const parentIds = new Set(agents.filter((a) => a.sponsor_id).map((a) => a.sponsor_id));
  const [collapsed, setCollapsed] = useState({});

  if (roots.length === 0) return <Empty>No agents yet. Use ＋ Add Agent to build your tree.</Empty>;

  const toggle = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  const collapseAll = () => setCollapsed(Object.fromEntries([...parentIds].map((id) => [id, true])));
  const expandAll = () => setCollapsed({});

  return (
    <div>
      {parentIds.size > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button onClick={expandAll} className="cip-tap"
            style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 8, color: C.muted, fontFamily: MONO, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 10px", cursor: "pointer" }}>
            Expand all
          </button>
          <button onClick={collapseAll} className="cip-tap"
            style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 8, color: C.muted, fontFamily: MONO, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 10px", cursor: "pointer" }}>
            Collapse all
          </button>
        </div>
      )}
      {roots.map((r) => <TreeNode key={r.id} agent={r} agents={agents} agentName={agentName} onOpen={onOpen} depth={0} collapsed={collapsed} toggle={toggle} />)}
    </div>
  );
}

function TreeNode({ agent, agents, agentName, onOpen, depth, collapsed, toggle }) {
  const children = agents.filter((a) => a.sponsor_id === agent.id);
  const hasChildren = children.length > 0;
  const isOpen = !collapsed[agent.id];
  const split = agent.split || {};
  const ownTake = split.self ?? agent.quota_percent;
  const upline = Object.entries(split).filter(([k]) => k !== "self");

  return (
    <div style={{ marginLeft: depth ? 10 : 0, paddingLeft: depth ? 14 : 0, borderLeft: depth ? `1px solid ${C.line}` : "none" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 8 }}>
        <button type="button" onClick={() => hasChildren && toggle(agent.id)} disabled={!hasChildren}
          aria-label={hasChildren ? (isOpen ? "Collapse branch" : "Expand branch") : undefined}
          className={hasChildren ? "cip-tap" : undefined}
          style={{ flexShrink: 0, marginTop: 8, width: 22, height: 22, borderRadius: "50%", fontFamily: MONO, fontSize: 13, fontWeight: 700, lineHeight: 1,
            border: hasChildren ? `1px solid ${C.goldSoft}` : "none", background: hasChildren ? C.field : "transparent",
            color: hasChildren ? C.goldLt : C.faint, cursor: hasChildren ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
          {hasChildren ? (isOpen ? "−" : "+") : "·"}
        </button>

        <div onClick={() => onOpen(agent)} className="cip-card cip-card-h cip-tap cip-in-fast"
          style={{ flex: 1, minWidth: 0, background: depth === 0 ? C.goldSoft : C.panel2,
            border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 12px", cursor: "pointer", opacity: agent.archived ? 0.55 : 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: C.ink, fontSize: 14.5 }}>{agent.name}</span>
            {agent.archived && <Badge text="Archived" color={C.muted} />}
            {hasChildren && <span style={{ fontSize: 10.5, color: C.muted, fontFamily: MONO }}>{children.length} report{children.length === 1 ? "" : "s"}</span>}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 5, fontSize: 11.5, color: C.muted, fontFamily: MONO }}>
            <span>{agent.member_code}</span>
            <span>{agent.phone}</span>
            <span style={{ color: C.goldLt }}>quota {agent.quota_percent}%</span>
            <span>own {ownTake}%</span>
          </div>
          {upline.length > 0 && (
            <div style={{ fontSize: 11, color: C.gold, marginTop: 4 }}>upline: {upline.map(([id, p]) => `${agentName(id)} ${p}%`).join(", ")}</div>
          )}
        </div>
      </div>

      {hasChildren && isOpen && children.map((c) => (
        <TreeNode key={c.id} agent={c} agents={agents} agentName={agentName} onOpen={onOpen} depth={depth + 1} collapsed={collapsed} toggle={toggle} />
      ))}
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
    if (error || !data || data.length === 0) { setMsg(error?.message || "Delete didn't go through — this agent has history."); return; }
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
      <KV k="Referred by" v={sponsor ? sponsor.name : "Direct agent"} />
      <KV k="Direct commission" v={fmt(direct)} />
      <KV k="Referral bonus" v={fmt(bonus)} />
      <KV k="Total earned" v={fmt(direct + bonus)} />

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontFamily: MONO }}>Customers ({myCustomers.length})</div>
        {myCustomers.length === 0 ? <p style={{ fontSize: 14, color: C.muted }}>None yet.</p> :
          myCustomers.map((c) => <div key={c.id} style={{ fontSize: 14, color: C.ink, padding: "4px 0" }}>{c.name} · {c.phone}</div>)}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontFamily: MONO }}>Agents referred ({downline.length})</div>
        {downline.length === 0 ? <p style={{ fontSize: 14, color: C.muted }}>None yet.</p> :
          downline.map((d) => (
            <button key={d.id} onClick={() => onOpenOther(d)} className="cip-tap"
              style={{ display: "block", background: "none", border: "none", color: C.gold, textDecoration: "underline", cursor: "pointer", fontSize: 14, padding: "4px 0", fontFamily: "'Inter',sans-serif", borderRadius: 4 }}>
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
    <Panel title="Add a new agent">
      <div style={{ maxWidth: 520 }}>
        <Field label="Agent name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ravi Kumar" />
        <Field label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98480 00000" />
        <Field label="Total commission quota (%)" type="number" value={quota}
          onChange={(e) => { setQuota(e.target.value); if (!sponsorId) setSelfTake(e.target.value); }} />
        <Select label="Referred by (sponsor)" value={sponsorId} placeholder="— Direct agent (no referrer) —"
          onChange={(v) => { setSponsorId(v); setSplits({}); }}
          options={activeAgents.map((a) => ({ v: a.id, l: a.name }))} />
        {!sponsorId && <p style={{ fontSize: 13, color: C.muted }}>Direct agent keeps the full {quota}% quota.</p>}
        {sponsorId && (
          <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: MONO }}>Split the {quota}% quota</div>
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
        style={{ width: 80, padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 8, fontFamily: "'Inter',sans-serif", fontSize: 15, textAlign: "right", background: C.field, color: C.ink }} />
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
        <SearchBar value={q} onChange={setQ} placeholder="Search agent, plot…" />
        <div style={{ width: mobile ? "100%" : undefined }}>
          <Select compact={!mobile} value={kind} onChange={setKind} placeholder="All types"
            options={[{ v: "Direct", l: "Direct" }, { v: "Referral bonus", l: "Referral bonus" }]} />
        </div>
      </div>
    }>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>{rows.length} entries · total {fmt(total)}</div>
      {rows.length === 0 ? <Empty>No commissions match your search.</Empty> : mobile ? (
        <div>
          {rows.map((c) => (
            <RowCard key={c.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{plotNo(c.plot_id)}</span>
                <span style={{ color: c.kind === "Direct" ? C.emeraldLt : C.goldLt, fontWeight: 600, fontSize: 12 }}>{c.kind}</span>
              </div>
              <RowLine label="Beneficiary" value={agentName(c.beneficiary_id)} />
              <RowLine label="Share" value={`${c.pct}%`} />
              <RowLine label="Amount" value={fmt(c.amount)} bold />
            </RowCard>
          ))}
        </div>
      ) : (
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
