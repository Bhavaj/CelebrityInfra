import React, { useState } from "react";
import { supabase } from "../../shared/supabase.js";
import { C, MONO, fmt, fmtDate, Panel, Tabs, Th, Td, Button, DangerDeleteButton, Field, Select, Modal, SearchBar, KV, Badge, TableScroll, Empty, useIsMobile, RowCard, RowLine, LABEL, FONT, Icon, tint, DISPLAY } from "../ui";
import AccessCode from "./AccessCode";

export default function Agents({ agents, customers, commissions, plots, users, agentName, projects, activeProject, rates, customerProjectAgents, view, setView, onDone }) {
  const activeProjectName = projects.find((p) => p.id === activeProject)?.name;
  const [adding, setAdding] = useState(false);
  const [openAgent, setOpenAgent] = useState(null);
  const activeProjectObj = projects.find((p) => p.id === activeProject);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <Tabs value={view} onChange={setView} options={[
          { v: "network", l: "Agent network" },
          { v: "commissions", l: "Payout ledger" },
        ]} />
      </div>

      {view === "network" && (
        <Panel title="Agent network"
          subtitle={activeProject ? `Commission rate shown is for ${activeProjectObj?.name || "the selected project"} — leave blank to use each agent's default rate.` : "Select a project above to set commission rates for it — showing default rates for now."}
          right={<Button onClick={() => setAdding(true)}><Icon name="add" /> Add agent</Button>}>
          <AgentNetwork agents={agents} onOpen={setOpenAgent} projectId={activeProject} rates={rates} onDone={onDone} />
        </Panel>
      )}

      {view === "commissions" && (
        <CommissionsLedger commissions={commissions} plots={plots} agentName={agentName}
          activeProject={activeProject} projectName={activeProjectObj?.name} onDone={onDone} />
      )}

      {adding && <CreateAgent agents={agents} onClose={() => setAdding(false)} onDone={() => { setAdding(false); onDone(); }} />}
      {openAgent && (
        <AgentCard agent={openAgent} agents={agents} customers={customers} commissions={commissions}
          users={users} activeProject={activeProject} activeProjectName={activeProjectName} rates={rates}
          customerProjectAgents={customerProjectAgents}
          onClose={() => setOpenAgent(null)} onOpenOther={setOpenAgent} onDone={onDone}
          onChanged={() => { setOpenAgent(null); onDone(); }} />
      )}
    </>
  );
}

// Org-chart-style tree — each node with reports gets a +/− toggle so deep
// downlines can be collapsed instead of forcing a horizontal scroll. Also
// carries the per-project commission rate inline (editable, with a live
// cascade preview), so this one tree is both "who reports to whom" and
// "what does everyone earn" — no separate near-identical view needed.
// Mirrors the record_sale() gap-fill logic 1:1: an agent's rate for a given
// project falls back to their default quota_percent when unset, and each
// parent's override on a given child = parent_rate - child_rate (clamped at 0).
function AgentNetwork({ agents, onOpen, projectId, rates, onDone }) {
  const roots = agents.filter((a) => !a.sponsor_id);
  const parentIds = new Set(agents.filter((a) => a.sponsor_id).map((a) => a.sponsor_id));
  const [collapsed, setCollapsed] = useState({});

  if (roots.length === 0) return <Empty>No agents yet. Use Add agent to build your network.</Empty>;

  const toggle = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  const collapseAll = () => setCollapsed(Object.fromEntries([...parentIds].map((id) => [id, true])));
  const expandAll = () => setCollapsed({});

  const effectiveRate = (agentId) => {
    const override = projectId && rates.find((r) => r.project_id === projectId && r.agent_id === agentId);
    if (override) return Number(override.commission_pct);
    return Number(agents.find((a) => a.id === agentId)?.quota_percent ?? 0);
  };

  async function setRate(agentId, pct) {
    if (pct === "" || isNaN(Number(pct))) return;
    await supabase.rpc("set_agent_project_rate", { p_project_id: projectId, p_agent_id: agentId, p_pct: Number(pct) });
    onDone();
  }

  return (
    <div>
      {parentIds.size > 0 && (
        <div className="cip-actions" style={{ marginBottom: 16 }}>
          <Button kind="ghost" size="sm" onClick={expandAll}><Icon name="unfold_more" /> Expand all</Button>
          <Button kind="ghost" size="sm" onClick={collapseAll}><Icon name="unfold_less" /> Collapse all</Button>
        </div>
      )}
      {roots.map((r) => (
        <NetworkNode key={r.id} agent={r} agents={agents} onOpen={onOpen} depth={0} collapsed={collapsed} toggle={toggle}
          projectId={projectId} rates={rates} effectiveRate={effectiveRate} setRate={setRate} />
      ))}
    </div>
  );
}

function NetworkNode({ agent, agents, onOpen, depth, collapsed, toggle, projectId, rates, effectiveRate, setRate }) {
  const [draft, setDraft] = useState(null);
  const children = agents.filter((a) => a.sponsor_id === agent.id);
  const hasChildren = children.length > 0;
  const isOpen = !collapsed[agent.id];
  const own = effectiveRate(agent.id);
  const hasOverride = projectId && rates.some((r) => r.project_id === projectId && r.agent_id === agent.id);

  return (
    <div style={{ marginLeft: depth ? 15 : 0, paddingLeft: depth ? 14 : 0, borderLeft: depth ? `1px solid ${C.lineStrong}` : "none" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 10 }}>
        <button type="button" onClick={() => hasChildren && toggle(agent.id)} disabled={!hasChildren}
          aria-label={hasChildren ? (isOpen ? "Collapse branch" : "Expand branch") : undefined}
          className={hasChildren ? "cip-icon-btn" : undefined}
          style={{ flexShrink: 0, marginTop: 10, width: 30, height: 30, borderRadius: "50%", padding: 0,
            border: hasChildren ? `1px solid ${C.lineGold}` : "none", background: "transparent",
            color: hasChildren ? C.goldLt : C.faint, cursor: hasChildren ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
          {hasChildren ? <Icon name={isOpen ? "remove" : "add"} size={16} /> : <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: "50%", background: C.faint }} />}
        </button>

        <div onClick={() => onOpen(agent)} className="cip-rowcard is-clickable cip-in-fast"
          style={{ flex: 1, minWidth: 0, marginBottom: 0, background: depth === 0 ? C.panel2 : C.panel,
            borderColor: depth === 0 ? C.lineGold : undefined, padding: "12px 16px", opacity: agent.archived ? 0.55 : 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, color: C.ink, fontSize: 15 }}>{agent.name}</span>
            {agent.archived && <Badge text="Archived" color={C.muted} />}
            {hasChildren && <span style={{ fontSize: 12, color: C.faint }}>{children.length} report{children.length === 1 ? "" : "s"}</span>}
          </div>
          <div className="cip-num" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 6, fontSize: 13, color: C.muted }}>
            <span style={{ fontFamily: MONO, fontSize: 12, color: C.faint }}>{agent.member_code}</span>
            <span>{agent.phone}</span>
            {projectId && !agent.archived ? (
              <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "default" }}>
                <input type="number" value={draft ?? own} onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => { if (draft !== null && Number(draft) !== own) setRate(agent.id, draft); setDraft(null); }}
                  aria-label={`Commission rate for ${agent.name}`} className="cip-mini-input" style={{ width: 68, textAlign: "right" }} />
                <span>%</span>
                {!hasOverride && <span style={{ color: C.faint, fontSize: 12 }}>default</span>}
              </span>
            ) : (
              <span style={{ color: C.muted }}>{projectId ? "Archived" : "Default"} rate <b style={{ color: C.goldLt }}>{agent.quota_percent}%</b></span>
            )}
          </div>
          {projectId && hasChildren && (
            <div style={{ display: "flex", gap: "4px 16px", flexWrap: "wrap", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.line}` }}>
              {children.map((c) => {
                const childRate = effectiveRate(c.id);
                const override = Math.max(0, own - childRate);
                return (
                  <span key={c.id} className="cip-num" style={{ fontSize: 12.5, color: override > 0 ? C.goldLt : C.faint }}>
                    ↳ {c.name} sells → earns {override}%
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {hasChildren && isOpen && children.map((c) => (
        <NetworkNode key={c.id} agent={c} agents={agents} onOpen={onOpen} depth={depth + 1} collapsed={collapsed} toggle={toggle}
          projectId={projectId} rates={rates} effectiveRate={effectiveRate} setRate={setRate} />
      ))}
    </div>
  );
}

function AgentCard({ agent, agents, customers, commissions, users, activeProject, activeProjectName, rates, customerProjectAgents, onClose, onOpenOther, onChanged, onDone }) {
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(agent.name);
  const [phone, setPhone] = useState(agent.phone || "");
  const [quota, setQuota] = useState(String(agent.quota_percent));
  const [busy, setBusy] = useState(false);
  const [payingOut, setPayingOut] = useState(false);
  const email = users.find((u) => u.agent_id === agent.id)?.email;
  const myCustomerIds = new Set((customerProjectAgents || []).filter((a) => a.agent_id === agent.id).map((a) => a.customer_id));
  const myCustomers = customers.filter((c) => myCustomerIds.has(c.id));
  const downline = agents.filter((a) => a.sponsor_id === agent.id);
  const sponsor = agents.find((a) => a.id === agent.sponsor_id);
  const myComm = commissions.filter((c) => c.beneficiary_id === agent.id);
  const direct = myComm.filter((c) => c.kind === "Direct").reduce((s, c) => s + Number(c.amount), 0);
  const bonus = myComm.filter((c) => c.kind !== "Direct").reduce((s, c) => s + Number(c.amount), 0);
  const leaf = downline.length === 0 && myCustomers.length === 0 && myComm.length === 0;
  const paidOut = myComm.filter((c) => c.paid_at).reduce((s, c) => s + Number(c.amount), 0);
  const outstanding = direct + bonus - paidOut;

  async function markAllPaid() {
    setPayingOut(true); setMsg("");
    const { error } = await supabase.from("commissions")
      .update({ paid_at: new Date().toISOString() })
      .eq("beneficiary_id", agent.id).is("paid_at", null);
    setPayingOut(false);
    if (error) { setMsg(error.message); return; }
    onDone();
  }

  const projectOverride = activeProject && rates?.find((r) => r.project_id === activeProject && r.agent_id === agent.id);
  const projectRate = activeProject ? (projectOverride ? Number(projectOverride.commission_pct) : Number(agent.quota_percent)) : null;

  async function saveEdit() {
    setBusy(true); setMsg("");
    const { error } = await supabase.from("agents")
      .update({ name, phone, quota_percent: Number(quota) }).eq("id", agent.id);
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    onChanged();
  }

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

  if (editing) {
    return (
      <Modal title={`Edit ${agent.name}`} onClose={() => setEditing(false)} maxWidth={480}>
        <Field label="Agent name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Field label="Default commission rate (%)" type="number" value={quota} onChange={(e) => setQuota(e.target.value)} />
        {msg && <p role="alert" style={{ color: C.red, fontSize: 13.5, lineHeight: 1.5, marginBottom: 14 }}>{msg}</p>}
        <div className="cip-actions">
          <Button onClick={saveEdit} disabled={!name || busy}>{busy ? "Saving…" : "Save changes"}</Button>
          <Button kind="ghostLight" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={agent.name} onClose={onClose}>
      {msg && <p role="alert" style={{ color: C.red, fontSize: 13.5, lineHeight: 1.5, marginBottom: 14 }}>{msg}</p>}
      {agent.archived && <div style={{ marginBottom: 14 }}><Badge text="Archived" color={C.muted} /></div>}
      <KV k="Member ID" v={agent.member_code} />
      <KV k="Phone" v={agent.phone || "—"} />
      <KV k="Login" v={email || "not linked yet"} />
      <KV k="Default rate" v={`${agent.quota_percent}% (used when no per-project rate is set)`} />
      {activeProject && (
        <KV k={`Rate for ${activeProjectName}`} v={`${projectRate}%${projectOverride ? "" : " (default — no override set)"}`} />
      )}
      <KV k="Referred by" v={sponsor ? sponsor.name : "Direct agent"} />
      <KV k="Direct commission" v={fmt(direct)} />
      <KV k="Referral bonus" v={fmt(bonus)} />
      <KV k="Total earned" v={fmt(direct + bonus)} />
      <KV k="Paid out" v={<span style={{ color: C.emeraldLt }}>{fmt(paidOut)}</span>} />
      <KV k="Outstanding" v={<span style={{ color: outstanding > 0 ? C.gold : C.ink }}>{fmt(outstanding)}</span>} />
      {outstanding > 0 && (
        <div style={{ marginTop: 16 }}>
          <Button size="sm" onClick={markAllPaid} disabled={payingOut}>{payingOut ? "Marking paid…" : `Mark ${fmt(outstanding)} as paid out`}</Button>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <div style={{ ...LABEL, marginBottom: 10 }}>Customers ({myCustomers.length})</div>
        {myCustomers.length === 0 ? <p style={{ fontSize: 14, color: C.faint }}>None yet.</p> :
          myCustomers.map((c) => (
            <div key={c.id} className="cip-num" style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, color: C.ink, padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
              <span>{c.name}</span><span style={{ color: C.muted }}>{c.phone}</span>
            </div>
          ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ ...LABEL, marginBottom: 10 }}>Agents referred ({downline.length})</div>
        {downline.length === 0 ? <p style={{ fontSize: 14, color: C.faint }}>None yet.</p> :
          downline.map((d) => (
            <button key={d.id} onClick={() => onOpenOther(d)} type="button" className="cip-link"
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, minHeight: 36 }}>
              {d.name} <Icon name="arrow_forward" size={16} />
            </button>
          ))}
      </div>

      <div className="cip-actions" style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.line}` }}>
        <Button kind="ghost" size="sm" onClick={() => { setName(agent.name); setPhone(agent.phone || ""); setQuota(String(agent.quota_percent)); setEditing(true); }}>Edit</Button>
        {leaf ? (
          <DangerDeleteButton label={agent.name} onConfirm={remove} />
        ) : (
          <Button kind="ghost" size="sm" onClick={toggleArchive}>{agent.archived ? "Unarchive" : "Archive"}</Button>
        )}
      </div>

      <AccessCode role="agent" targetId={agent.id} linked={!!email} />
    </Modal>
  );
}

function CreateAgent({ agents, onDone, onClose }) {
  const activeAgents = agents.filter((a) => !a.archived);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [quota, setQuota] = useState("6");
  const [sponsorId, setSponsorId] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true); setMsg("");
    const { error } = await supabase.from("agents").insert({
      name, phone, quota_percent: Number(quota), sponsor_id: sponsorId || null,
    });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    onDone();
  }

  return (
    <Modal title="Add a new agent" onClose={onClose} maxWidth={520}>
      <Field label="Agent name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ravi Kumar" />
      <Field label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98480 00000" />
      <Field label="Default commission rate (%)" type="number" value={quota} onChange={(e) => setQuota(e.target.value)} />
      <p style={{ fontSize: 13, color: C.faint, marginTop: -6, marginBottom: 16, lineHeight: 1.55 }}>Used whenever no per-project rate is set for this agent — set project-specific rates from Agents → Commission rates.</p>
      <Select label="Referred by (sponsor)" value={sponsorId} placeholder="— Direct agent (no referrer) —"
        onChange={setSponsorId} options={activeAgents.map((a) => ({ v: a.id, l: a.name }))} />
      {msg && <p role="alert" style={{ color: C.red, fontSize: 13.5, lineHeight: 1.5, marginBottom: 14 }}>{msg}</p>}
      <Button onClick={save} disabled={!name || busy}>{busy ? "Saving…" : "Create agent"}</Button>
    </Modal>
  );
}

function CommissionsLedger({ commissions, plots, agentName, activeProject, projectName, onDone }) {
  const mobile = useIsMobile();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [paidFilter, setPaidFilter] = useState("");
  const [busyId, setBusyId] = useState(null);
  const plotNo = (id) => plots.find((p) => p.id === id)?.plot_no ?? "—";
  // Scoped to the selected project via each commission's plot, same as every
  // other project-scoped stat/ledger — previously this showed every
  // commission across every project regardless of the selector above.
  const projectPlotIds = activeProject ? new Set(plots.filter((p) => p.project_id === activeProject).map((p) => p.id)) : null;
  const scoped = projectPlotIds ? commissions.filter((c) => projectPlotIds.has(c.plot_id)) : commissions;
  const rows = scoped.filter((c) => {
    if (kind && c.kind !== kind) return false;
    if (paidFilter === "paid" && !c.paid_at) return false;
    if (paidFilter === "outstanding" && c.paid_at) return false;
    if (!q) return true;
    const hay = `${agentName(c.beneficiary_id)} ${plotNo(c.plot_id)} ${c.kind}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const total = rows.reduce((s, c) => s + Number(c.amount), 0);
  const outstandingTotal = rows.filter((c) => !c.paid_at).reduce((s, c) => s + Number(c.amount), 0);

  async function togglePaid(c) {
    setBusyId(c.id);
    const { error } = await supabase.from("commissions")
      .update({ paid_at: c.paid_at ? null : new Date().toISOString() }).eq("id", c.id);
    setBusyId(null);
    if (!error) onDone();
  }

  return (
    <Panel title="Payout ledger"
      subtitle={activeProject ? `Commission payouts for ${projectName || "the selected project"}.` : "Select a project above to scope this ledger — showing every project for now."}
      right={
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", flexDirection: mobile ? "column" : "row" }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search agent, plot…" />
        <div style={{ width: mobile ? "100%" : undefined }}>
          <Select compact={!mobile} value={kind} onChange={setKind} placeholder="All types"
            options={[{ v: "Direct", l: "Direct" }, { v: "Referral bonus", l: "Referral bonus" }]} />
        </div>
        <div style={{ width: mobile ? "100%" : undefined }}>
          <Select compact={!mobile} value={paidFilter} onChange={setPaidFilter} placeholder="Paid & outstanding"
            options={[{ v: "outstanding", l: "Outstanding only" }, { v: "paid", l: "Paid only" }]} />
        </div>
      </div>
    }>
      <div className="cip-num" style={{ display: "flex", flexWrap: "wrap", gap: "6px 24px", fontSize: 13.5, color: C.muted, marginBottom: 16 }}>
        <span>{rows.length} entries</span>
        <span>Total <b style={{ color: C.ink }}>{fmt(total)}</b></span>
        {outstandingTotal > 0 && <span>Outstanding <b style={{ color: C.goldLt }}>{fmt(outstandingTotal)}</b></span>}
      </div>
      {rows.length === 0 ? <Empty>No commissions match your search.</Empty> : mobile ? (
        <div>
          {rows.map((c) => (
            <RowCard key={c.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 22, color: C.ink }}>{plotNo(c.plot_id)}</span>
                <Badge text={c.kind} color={c.kind === "Direct" ? C.steel : C.gold} />
              </div>
              <RowLine label="Beneficiary" value={agentName(c.beneficiary_id)} />
              <RowLine label="Share" value={`${c.pct}%`} />
              <RowLine label="Amount" value={fmt(c.amount)} bold />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                <Badge text={c.paid_at ? `Paid ${fmtDate(c.paid_at)}` : "Outstanding"} color={c.paid_at ? C.emeraldLt : C.gold} />
                <Button kind="ghost" size="sm" onClick={() => togglePaid(c)} disabled={busyId === c.id}>
                  {busyId === c.id ? "…" : c.paid_at ? "Mark unpaid" : "Mark paid"}
                </Button>
              </div>
            </RowCard>
          ))}
        </div>
      ) : (
        <TableScroll minWidth={720}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Plot</Th><Th>Beneficiary</Th><Th>Type</Th><Th right>%</Th><Th right>Amount</Th><Th>Status</Th><Th><span className="sr-only">Actions</span></Th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <Td bold>{plotNo(c.plot_id)}</Td>
                  <Td>{agentName(c.beneficiary_id)}</Td>
                  <Td><Badge text={c.kind} color={c.kind === "Direct" ? C.steel : C.gold} /></Td>
                  <Td right>{c.pct}%</Td>
                  <Td right bold>{fmt(c.amount)}</Td>
                  <Td><Badge text={c.paid_at ? `Paid ${fmtDate(c.paid_at)}` : "Outstanding"} color={c.paid_at ? C.emeraldLt : C.gold} /></Td>
                  <Td right>
                    <Button kind="ghost" size="sm" onClick={() => togglePaid(c)} disabled={busyId === c.id}>
                      {busyId === c.id ? "…" : c.paid_at ? "Mark unpaid" : "Mark paid"}
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
    </Panel>
  );
}
