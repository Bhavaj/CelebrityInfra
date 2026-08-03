import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { C, fmt, fmtDate, Panel, Stat, DueBadge, ProgressBar, Th, Td, TableScroll, Empty, useIsMobile, RowCard, RowLine } from "./ui";
import { scheduleStatus } from "./admin/Inventory";

// ---------- AGENT ----------
export function AgentPortal({ agentId }) {
  const mobile = useIsMobile();
  const [d, setD] = useState({ agent: null, customers: [], commissions: [], downline: [], plots: [], transactions: [], projects: [], rates: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [agent, customers, commissions, downline, plots, transactions, projects, rates] = await Promise.all([
        supabase.from("agents").select("*").eq("id", agentId).single(),
        supabase.from("customers").select("*").eq("agent_id", agentId),
        supabase.from("commissions").select("*").eq("beneficiary_id", agentId),
        supabase.from("agents").select("*").eq("sponsor_id", agentId),
        supabase.from("plots").select("*"),
        supabase.from("transactions").select("*"),
        supabase.from("projects").select("*"),
        supabase.from("agent_project_rates").select("*").eq("agent_id", agentId),
      ]);
      setD({
        agent: agent.data, customers: customers.data || [], commissions: commissions.data || [],
        downline: downline.data || [], plots: plots.data || [],
        transactions: transactions.data || [], projects: projects.data || [], rates: rates.data || [],
      });
      setLoading(false);
    })();
  }, [agentId]);

  if (loading) return <p style={{ color: C.muted }}>Loading…</p>;
  if (!d.agent) return <p style={{ color: C.muted }}>No agent profile linked to this login yet. Ask the admin to link your account.</p>;

  const direct = d.commissions.filter((c) => c.kind === "Direct").reduce((s, c) => s + Number(c.amount), 0);
  const bonus = d.commissions.filter((c) => c.kind !== "Direct").reduce((s, c) => s + Number(c.amount), 0);
  const plotNo = (id) => d.plots.find((p) => p.id === id)?.plot_no ?? "—";
  const plotProject = (plotId) => d.projects.find((pr) => pr.id === d.plots.find((p) => p.id === plotId)?.project_id)?.name ?? "—";
  const plotsFor = (custId) => d.plots.filter((p) => p.customer_id === custId);
  const paidFor = (plotId) => d.transactions.filter((t) => t.plot_id === plotId).reduce((s, t) => s + Number(t.amount), 0);
  const projectName = (id) => d.projects.find((p) => p.id === id)?.name ?? "—";
  const openPlots = d.plots.filter((p) => p.status !== "sold" && !d.projects.find((pr) => pr.id === p.project_id)?.archived);

  const activeProjects = d.projects.filter((p) => !p.archived);
  const effectiveRate = (projectId) => {
    const override = d.rates.find((r) => r.project_id === projectId);
    return override ? Number(override.commission_pct) : Number(d.agent.quota_percent);
  };
  const commissionsByProject = activeProjects.map((p) => {
    const plotIdsInProject = new Set(d.plots.filter((pl) => pl.project_id === p.id).map((pl) => pl.id));
    const rows = d.commissions.filter((c) => plotIdsInProject.has(c.plot_id));
    return { project: p, rate: effectiveRate(p.id), total: rows.reduce((s, c) => s + Number(c.amount), 0), count: rows.length };
  }).filter((r) => r.count > 0 || r.rate !== Number(d.agent.quota_percent));

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Space Grotesk',serif", fontWeight: 600, fontSize: 28, margin: "0 0 2px", color: C.ink }}>{d.agent.name}</h2>
        <div style={{ fontSize: 13, color: C.muted }}>Default rate {d.agent.quota_percent}% · {d.agent.sponsor_id ? "Referred agent" : "Direct agent"}</div>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <Stat label="Direct commission" value={fmt(direct)} accent={C.steel} />
        <Stat label="Referral bonus" value={fmt(bonus)} accent={C.gold} />
        <Stat label="Total earned" value={fmt(direct + bonus)} accent={C.green} />
        <Stat label="My customers" value={d.customers.length} />
        <Stat label="Agents I invited" value={d.downline.length} />
      </div>

      {commissionsByProject.length > 0 && (
        <Panel title="My rate by project">
          {commissionsByProject.map((r) => (
            <div key={r.project.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.line}`, fontSize: 14 }}>
              <span style={{ color: C.ink }}>{r.project.name}</span>
              <span style={{ color: C.muted }}>{r.rate}% rate · {fmt(r.total)} earned</span>
            </div>
          ))}
        </Panel>
      )}

      <Panel title="My customers">
        {d.customers.length === 0 ? <Empty>No customers yet.</Empty> : (
          <div>
            {d.customers.map((c) => {
              const custPlots = plotsFor(c.id);
              return (
                <div key={c.id} style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 6 }}>{c.name} · {c.phone}</div>
                  {custPlots.length === 0 ? (
                    <div style={{ fontSize: 13, color: C.muted, paddingLeft: 4 }}>No plot linked yet.</div>
                  ) : custPlots.map((p) => {
                    const paid = paidFor(p.id);
                    const pending = Number(p.price) - paid;
                    return (
                      <RowCard key={p.id}>
                        <RowLine label="Plot" value={`${p.plot_no} · ${plotProject(p.id)}`} />
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
                  <span style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{plotNo(c.plot_id)}</span>
                  <span style={{ color: c.kind === "Direct" ? C.emeraldLt : C.goldLt, fontWeight: 600, fontSize: 12 }}>{c.kind}</span>
                </div>
                <RowLine label="Share" value={`${c.pct}%`} />
                <RowLine label="Amount" value={fmt(c.amount)} bold />
              </RowCard>
            ))}
          </div>
        ) : (
          <TableScroll minWidth={480}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>Plot</Th><Th>Type</Th><Th right>%</Th><Th right>Amount</Th></tr></thead>
              <tbody>
                {d.commissions.map((c) => (
                  <tr key={c.id}>
                    <Td bold>{plotNo(c.plot_id)}</Td>
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

      <Panel title="Open plots" right={<span style={{ fontSize: 12, color: C.muted }}>{openPlots.length} available</span>}>
        {openPlots.length === 0 ? <Empty>No open plots right now.</Empty> : mobile ? (
          <div>
            {openPlots.map((p) => (
              <RowCard key={p.id}>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 6 }}>{p.plot_no}</div>
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

  if (loading) return <p style={{ color: C.muted }}>Loading…</p>;
  if (!d.customer) return <p style={{ color: C.muted }}>No customer profile linked to this login yet. Ask the admin to link your account.</p>;

  const paidFor = (plotId) => d.transactions.filter((t) => t.plot_id === plotId).reduce((s, t) => s + Number(t.amount), 0);
  const totalPaid = d.plots.reduce((s, p) => s + paidFor(p.id), 0);
  const totalOwed = d.plots.reduce((s, p) => s + Number(p.price), 0);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Space Grotesk',serif", fontWeight: 600, fontSize: 28, margin: "0 0 2px", color: C.ink }}>{d.customer.name}</h2>
        <div style={{ fontSize: 13, color: C.muted }}>{d.plots.length} plot{d.plots.length === 1 ? "" : "s"} owned · Celebrity Infra Pvt Ltd</div>
      </div>

      {d.plots.length > 1 && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
          <Stat label="Total across all plots" value={fmt(totalOwed)} />
          <Stat label="Total paid" value={fmt(totalPaid)} accent={C.green} />
          <Stat label="Total pending" value={fmt(totalOwed - totalPaid)} accent={C.gold} />
        </div>
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
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "baseline", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase" }}>Balance due</div>
                <div style={{ fontFamily: "'Space Grotesk',serif", fontSize: 32, fontWeight: 600, color: balance > 0 ? C.red : C.green }}>{fmt(balance)}</div>
              </div>
              <div style={{ fontSize: 13, color: C.muted }}>{fmt(paid)} paid of {fmt(total)}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, color: C.ink }}>
              <span>{pct}% paid</span>
            </div>
            <ProgressBar pct={pct} color={overdue > 0 ? `linear-gradient(90deg,#7a2a24,${C.red})` : undefined} />

            {plotInstallments.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Payment schedule</div>
                {[...plotInstallments].sort((a, b) => a.due_date < b.due_date ? -1 : 1).map((i) => (
                  <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
                    <span style={{ color: C.muted }}>{i.label} · due {fmtDate(i.due_date)}</span>
                    <span style={{ color: C.ink, fontWeight: 500 }}>{fmt(i.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {plotTx.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Payment history</div>
                {plotTx.map((t) => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
                    <span style={{ color: C.muted }}>{t.date} · {t.type}</span>
                    <span style={{ color: C.ink, fontWeight: 500 }}>{fmt(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {agent && (
              <div style={{ marginTop: 16, display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase" }}>Your agent</div>
                  <div style={{ fontSize: 15, color: C.ink, fontWeight: 600 }}>{agent.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase" }}>Phone</div>
                  <div style={{ fontSize: 15, color: C.ink, fontWeight: 600 }}>{agent.phone}</div>
                </div>
              </div>
            )}
          </Panel>
        );
      })}
    </>
  );
}
