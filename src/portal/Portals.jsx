import React, { useEffect, useState } from "react";
import { supabase } from "../shared/supabase.js";
import { C, fmt, fmtDate, Panel, Stat, StatGrid, Badge, DueBadge, ProgressBar, Th, Td, TableScroll, Empty, Loading, useIsMobile, RowCard, RowLine, LABEL, DISPLAY, Icon } from "./ui";
import { scheduleStatus } from "./admin/Inventory";

// ---------- AGENT ----------
export function AgentPortal({ agentId }) {
  const mobile = useIsMobile();
  const [d, setD] = useState({ agent: null, customers: [], commissions: [], downline: [], plots: [], transactions: [], projects: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [agent, projectAgents, commissions, downline, plots, transactions, projects] = await Promise.all([
        supabase.from("agents").select("*").eq("id", agentId).single(),
        supabase.from("customer_project_agents").select("customers(*)").eq("agent_id", agentId),
        supabase.from("commissions").select("*").eq("beneficiary_id", agentId),
        supabase.from("agents").select("*").eq("sponsor_id", agentId),
        supabase.from("plots").select("*"),
        supabase.from("transactions").select("*"),
        supabase.from("projects").select("*"),
      ]);
      const customersById = new Map();
      (projectAgents.data || []).forEach((row) => { if (row.customers) customersById.set(row.customers.id, row.customers); });
      setD({
        agent: agent.data, customers: [...customersById.values()], commissions: commissions.data || [],
        downline: downline.data || [], plots: plots.data || [],
        transactions: transactions.data || [], projects: projects.data || [],
      });
      setLoading(false);
    })();
  }, [agentId]);

  if (loading) return <Loading />;
  if (!d.agent) return <Panel><Empty>No agent profile linked to this login yet. Ask the admin to link your account.</Empty></Panel>;

  const direct = d.commissions.filter((c) => c.kind === "Direct").reduce((s, c) => s + Number(c.amount), 0);
  const bonus = d.commissions.filter((c) => c.kind !== "Direct").reduce((s, c) => s + Number(c.amount), 0);
  const paidOut = d.commissions.filter((c) => c.paid_at).reduce((s, c) => s + Number(c.amount), 0);
  const outstanding = direct + bonus - paidOut;
  const plotNo = (id) => d.plots.find((p) => p.id === id)?.plot_no ?? "—";
  const plotProject = (plotId) => d.projects.find((pr) => pr.id === d.plots.find((p) => p.id === plotId)?.project_id)?.name ?? "—";
  const plotsFor = (custId) => d.plots.filter((p) => p.customer_id === custId);
  const paidFor = (plotId) => d.transactions.filter((t) => t.plot_id === plotId).reduce((s, t) => s + Number(t.amount), 0);
  const projectName = (id) => d.projects.find((p) => p.id === id)?.name ?? "—";
  const openPlots = d.plots.filter((p) => p.status === "available" && !d.projects.find((pr) => pr.id === p.project_id)?.archived);

  return (
    <>
      <header className="cip-in" style={{ marginBottom: "clamp(24px, 4vw, 36px)", paddingBottom: "clamp(20px, 3vw, 28px)", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ ...LABEL, color: C.gold, marginBottom: 12 }}>Agent portal</div>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: "clamp(36px, 5vw, 50px)", lineHeight: 1.02, letterSpacing: "-0.01em", margin: 0, color: C.ink }}>{d.agent.name}</h1>
        <div style={{ fontSize: 15, color: C.muted, marginTop: 10 }}>{d.agent.sponsor_id ? "Referred agent" : "Direct agent"}</div>
      </header>
      <StatGrid style={{ marginBottom: 24 }}>
        <Stat label="Direct commission" value={fmt(direct)} accent={C.steel} />
        <Stat label="Referral bonus" value={fmt(bonus)} accent={C.gold} />
        <Stat label="Total earned" value={fmt(direct + bonus)} accent={C.green} />
        <Stat label="Paid out" value={fmt(paidOut)} accent={C.emeraldLt} />
        <Stat label="Outstanding" value={fmt(outstanding)} accent={outstanding > 0 ? C.gold : undefined} />
        <Stat label="My customers" value={d.customers.length} />
        <Stat label="Agents I invited" value={d.downline.length} />
      </StatGrid>

      <Panel title="My customers">
        {d.customers.length === 0 ? <Empty>No customers yet.</Empty> : (
          <div>
            {d.customers.map((c) => {
              const custPlots = plotsFor(c.id);
              return (
                <div key={c.id} style={{ marginBottom: 20 }}>
                  <div className="cip-num" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 15.5, color: C.ink }}>{c.name}</span>
                    <span style={{ fontSize: 13.5, color: C.muted }}>{c.phone}</span>
                  </div>
                  {custPlots.length === 0 ? (
                    <div style={{ fontSize: 13.5, color: C.faint }}>No plot linked yet.</div>
                  ) : custPlots.map((p) => {
                    const paid = paidFor(p.id);
                    const pending = Number(p.price) - paid;
                    return (
                      <RowCard key={p.id}>
                        <RowLine label="Plot" value={<span>{p.plot_no} <span style={{ color: C.muted, fontWeight: 400 }}>{plotProject(p.id)}</span></span>} />
                        <RowLine label="Paid" value={fmt(paid)} />
                        <RowLine label="Pending" value={fmt(pending)} bold={pending > 0} />
                      </RowCard>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="My commission">
        {d.commissions.length === 0 ? <Empty>No commission yet.</Empty> : mobile ? (
          <div>
            {d.commissions.map((c) => (
              <RowCard key={c.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 22, color: C.ink }}>{plotNo(c.plot_id)}</span>
                  <Badge text={c.kind} color={c.kind === "Direct" ? C.steel : C.gold} />
                </div>
                <RowLine label="Share" value={`${c.pct}%`} />
                <RowLine label="Amount" value={fmt(c.amount)} bold />
                <RowLine label="Status" value={<Badge text={c.paid_at ? `Paid ${fmtDate(c.paid_at)}` : "Outstanding"} color={c.paid_at ? C.green : C.gold} />} />
              </RowCard>
            ))}
          </div>
        ) : (
          <TableScroll minWidth={560}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>Plot</Th><Th>Type</Th><Th right>%</Th><Th right>Amount</Th><Th>Status</Th></tr></thead>
              <tbody>
                {d.commissions.map((c) => (
                  <tr key={c.id}>
                    <Td bold>{plotNo(c.plot_id)}</Td>
                    <Td><Badge text={c.kind} color={c.kind === "Direct" ? C.steel : C.gold} /></Td>
                    <Td right>{c.pct}%</Td>
                    <Td right bold>{fmt(c.amount)}</Td>
                    <Td>
                      <Badge text={c.paid_at ? `Paid ${fmtDate(c.paid_at)}` : "Outstanding"} color={c.paid_at ? C.green : C.gold} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>

      <Panel title="Open plots" right={<span className="cip-num" style={{ fontSize: 13.5, color: C.muted }}>{openPlots.length} available</span>}>
        {openPlots.length === 0 ? <Empty>No open plots right now.</Empty> : mobile ? (
          <div>
            {openPlots.map((p) => (
              <RowCard key={p.id}>
                <div style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 22, color: C.ink, marginBottom: 6 }}>{p.plot_no}</div>
                <RowLine label="Project" value={projectName(p.project_id)} />
                <RowLine label="Price" value={fmt(p.price)} bold />
              </RowCard>
            ))}
          </div>
        ) : (
          <TableScroll minWidth={420}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>Plot</Th><Th>Project</Th><Th right>Price</Th></tr></thead>
              <tbody>
                {openPlots.map((p) => (
                  <tr key={p.id}>
                    <Td bold>{p.plot_no}</Td>
                    <Td>{projectName(p.project_id)}</Td>
                    <Td right>{fmt(p.price)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>
    </>
  );
}

// ---------- CUSTOMER ----------
export function CustomerPortal({ customerId }) {
  const [d, setD] = useState({ customer: null, plots: [], transactions: [], installments: [], agents: [], projects: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const cust = await supabase.from("customers").select("*").eq("id", customerId).single();
      const [plots, tx, installments, agents, projects] = await Promise.all([
        supabase.from("plots").select("*").eq("customer_id", customerId),
        supabase.from("transactions").select("*").eq("customer_id", customerId).order("date"),
        supabase.from("plot_installments").select("*"),
        supabase.from("agents").select("id, name, phone"),
        supabase.from("projects").select("id, name, location"),
      ]);
      setD({
        customer: cust.data, plots: plots.data || [], transactions: tx.data || [],
        installments: installments.data || [], agents: agents.data || [], projects: projects.data || [],
      });
      setLoading(false);
    })();
  }, [customerId]);

  if (loading) return <Loading />;
  if (!d.customer) return <Panel><Empty>No customer profile linked to this login yet. Ask the admin to link your account.</Empty></Panel>;

  const paidFor = (plotId) => d.transactions.filter((t) => t.plot_id === plotId).reduce((s, t) => s + Number(t.amount), 0);
  const totalPaid = d.plots.reduce((s, p) => s + paidFor(p.id), 0);
  const totalOwed = d.plots.reduce((s, p) => s + Number(p.price), 0);

  return (
    <>
      <header className="cip-in" style={{ marginBottom: "clamp(24px, 4vw, 36px)", paddingBottom: "clamp(20px, 3vw, 28px)", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ ...LABEL, color: C.gold, marginBottom: 12 }}>Your plots</div>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: "clamp(36px, 5vw, 50px)", lineHeight: 1.02, letterSpacing: "-0.01em", margin: 0, color: C.ink }}>{d.customer.name}</h1>
        <div style={{ fontSize: 15, color: C.muted, marginTop: 10 }}>{d.plots.length} plot{d.plots.length === 1 ? "" : "s"} owned with Celebrity Infra Pvt Ltd</div>
      </header>

      {d.plots.length > 1 && (
        <StatGrid style={{ marginBottom: 24 }}>
          <Stat label="Total across all plots" value={fmt(totalOwed)} />
          <Stat label="Total paid" value={fmt(totalPaid)} accent={C.green} />
          <Stat label="Total pending" value={fmt(totalOwed - totalPaid)} accent={C.gold} />
        </StatGrid>
      )}

      {d.plots.length === 0 ? (
        <Panel title="Your plots"><Empty>No plot linked to your account yet. Ask the admin if this looks wrong.</Empty></Panel>
      ) : d.plots.map((plot) => {
        const project = d.projects.find((p) => p.id === plot.project_id);
        const agent = d.agents.find((a) => a.id === plot.closed_by_agent_id);
        const plotTx = d.transactions.filter((t) => t.plot_id === plot.id).sort((a, b) => (a.date < b.date ? 1 : -1));
        const paid = paidFor(plot.id);
        const total = Number(plot.price);
        const balance = total - paid;
        const pct = total ? Math.round((paid / total) * 100) : 0;
        const plotInstallments = d.installments.filter((i) => i.plot_id === plot.id);
        const { overdue, nextDueDate } = scheduleStatus(plotInstallments, paid);

        return (
          <Panel key={plot.id} title={`Plot ${plot.plot_no}`} subtitle={project ? `${project.name}${project.location ? " · " + project.location : ""}` : undefined}
            right={<DueBadge overdue={overdue} dueDate={nextDueDate} />}>
            <div style={{ display: "flex", gap: "16px 40px", flexWrap: "wrap", alignItems: "flex-end", marginBottom: 22 }}>
              <div>
                <div style={{ ...LABEL, marginBottom: 10 }}>Balance due</div>
                <div className="cip-num" style={{ fontFamily: DISPLAY, fontSize: "clamp(40px, 7vw, 56px)", fontWeight: 500, lineHeight: 0.95, color: balance > 0 ? C.goldLt : C.green }}>{fmt(balance)}</div>
              </div>
              <div className="cip-num" style={{ display: "flex", gap: 28, flexWrap: "wrap", paddingBottom: 4 }}>
                <div>
                  <div style={{ ...LABEL, marginBottom: 6 }}>Paid</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>{fmt(paid)}</div>
                </div>
                <div>
                  <div style={{ ...LABEL, marginBottom: 6 }}>Plot price</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>{fmt(total)}</div>
                </div>
              </div>
            </div>
            <ProgressBar pct={pct} color={overdue > 0 ? C.red : undefined} />
            <div className="cip-num" style={{ fontSize: 13, marginTop: 10, color: C.muted }}>{pct}% paid</div>

            {plotInstallments.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <div style={{ ...LABEL, marginBottom: 8 }}>Payment schedule</div>
                {[...plotInstallments].sort((a, b) => a.due_date < b.due_date ? -1 : 1).map((i) => (
                  <div key={i.id} className="cip-num" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, fontSize: 14.5, padding: "13px 0", borderBottom: `1px solid ${C.line}` }}>
                    <span style={{ color: C.ink, minWidth: 0 }}>{i.label} <span style={{ color: C.muted, marginLeft: 8, whiteSpace: "nowrap" }}>due {fmtDate(i.due_date)}</span></span>
                    <span style={{ color: C.ink, fontWeight: 600, flex: "none" }}>{fmt(i.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {plotTx.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <div style={{ ...LABEL, marginBottom: 8 }}>Payment history</div>
                {plotTx.map((t) => (
                  <div key={t.id} className="cip-num" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, fontSize: 14.5, padding: "13px 0", borderBottom: `1px solid ${C.line}` }}>
                    <span style={{ color: C.ink, minWidth: 0 }}>{t.type} <span style={{ color: C.muted, marginLeft: 8, whiteSpace: "nowrap" }}>{fmtDate(t.date)}</span></span>
                    <span style={{ color: C.ink, fontWeight: 600, flex: "none" }}>{fmt(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {agent && (
              <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "16px 18px", background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 12 }}>
                <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: "50%", border: `1px solid ${C.lineGold}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.goldLt, flex: "none" }}>
                  <Icon name="support_agent" size={21} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ ...LABEL, marginBottom: 4 }}>Your agent</div>
                  <div style={{ fontSize: 15.5, color: C.ink, fontWeight: 600 }}>{agent.name}</div>
                </div>
                <div className="cip-num" style={{ fontSize: 15, color: C.ink, fontWeight: 500 }}>
                  <span style={{ ...LABEL, display: "block", marginBottom: 4 }}>Phone</span>
                  {agent.phone}
                </div>
              </div>
            )}
          </Panel>
        );
      })}
    </>
  );
}
