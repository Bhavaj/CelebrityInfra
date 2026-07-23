import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { C, fmt, Panel, Stat, Th, Td, TableScroll, Empty } from "./ui";

// ---------- AGENT ----------
export function AgentPortal({ agentId }) {
  const [d, setD] = useState({ agent: null, customers: [], commissions: [], downline: [], plots: [], transactions: [], projects: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [agent, customers, commissions, downline, plots, transactions, projects] = await Promise.all([
        supabase.from("agents").select("*").eq("id", agentId).single(),
        supabase.from("customers").select("*").eq("agent_id", agentId),
        supabase.from("commissions").select("*").eq("beneficiary_id", agentId),
        supabase.from("agents").select("*").eq("sponsor_id", agentId),
        supabase.from("plots").select("*"),
        supabase.from("transactions").select("*"),
        supabase.from("projects").select("*"),
      ]);
      setD({
        agent: agent.data, customers: customers.data || [], commissions: commissions.data || [],
        downline: downline.data || [], plots: plots.data || [],
        transactions: transactions.data || [], projects: projects.data || [],
      });
      setLoading(false);
    })();
  }, [agentId]);

  if (loading) return <p style={{ color: C.muted }}>Loading…</p>;
  if (!d.agent) return <p style={{ color: C.muted }}>No agent profile linked to this login yet. Ask the admin to link your account.</p>;

  const direct = d.commissions.filter((c) => c.kind === "Direct").reduce((s, c) => s + Number(c.amount), 0);
  const bonus = d.commissions.filter((c) => c.kind !== "Direct").reduce((s, c) => s + Number(c.amount), 0);
  const plotNo = (id) => d.plots.find((p) => p.id === id)?.plot_no ?? "—";
  const plotFor = (custId) => d.plots.find((p) => p.customer_id === custId);
  const paidFor = (custId) => d.transactions.filter((t) => t.customer_id === custId).reduce((s, t) => s + Number(t.amount), 0);
  const projectName = (id) => d.projects.find((p) => p.id === id)?.name ?? "—";
  const openPlots = d.plots.filter((p) => p.status !== "sold" && !d.projects.find((pr) => pr.id === p.project_id)?.archived);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Hanken Grotesk',serif", fontWeight: 600, fontSize: 28, margin: "0 0 2px", color: C.ink }}>{d.agent.name}</h2>
        <div style={{ fontSize: 13, color: C.muted }}>Quota {d.agent.quota_percent}% · {d.agent.sponsor_id ? "Referred agent" : "Direct agent"}</div>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <Stat label="Direct commission" value={fmt(direct)} accent={C.steel} />
        <Stat label="Referral bonus" value={fmt(bonus)} accent={C.gold} />
        <Stat label="Total earned" value={fmt(direct + bonus)} accent={C.green} />
        <Stat label="My customers" value={d.customers.length} />
        <Stat label="Agents I invited" value={d.downline.length} />
      </div>

      <Panel title="My customers">
        {d.customers.length === 0 ? <Empty>No customers yet.</Empty> : (
          <TableScroll minWidth={520}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>Customer</Th><Th>Phone</Th><Th right>Paid</Th><Th right>Pending</Th></tr></thead>
              <tbody>
                {d.customers.map((c) => {
                  const plot = plotFor(c.id);
                  const paid = paidFor(c.id);
                  const pending = plot ? Number(plot.price) - paid : null;
                  return (
                    <tr key={c.id}>
                      <Td bold>{c.name}</Td>
                      <Td>{c.phone}</Td>
                      <Td right>{plot ? fmt(paid) : "—"}</Td>
                      <Td right bold={pending > 0}>{plot ? fmt(pending) : "—"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>

      <Panel title="My commission">
        {d.commissions.length === 0 ? <Empty>No commission yet.</Empty> : (
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
        {openPlots.length === 0 ? <Empty>No open plots right now.</Empty> : (
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
  const [d, setD] = useState({ customer: null, plot: null, transactions: [], agent: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const cust = await supabase.from("customers").select("*").eq("id", customerId).single();
      const [plot, tx, agent] = await Promise.all([
        supabase.from("plots").select("*, projects(name, location)").eq("customer_id", customerId).maybeSingle(),
        supabase.from("transactions").select("*").eq("customer_id", customerId).order("date"),
        cust.data?.agent_id
          ? supabase.from("agents").select("name, phone").eq("id", cust.data.agent_id).single()
          : Promise.resolve({ data: null }),
      ]);
      setD({ customer: cust.data, plot: plot.data, transactions: tx.data || [], agent: agent.data });
      setLoading(false);
    })();
  }, [customerId]);

  if (loading) return <p style={{ color: C.muted }}>Loading…</p>;
  if (!d.customer) return <p style={{ color: C.muted }}>No customer profile linked to this login yet. Ask the admin to link your account.</p>;

  const paid = d.transactions.reduce((s, t) => s + Number(t.amount), 0);
  const total = d.plot ? Number(d.plot.price) : 0;
  const balance = total - paid;
  const pct = total ? Math.round((paid / total) * 100) : 0;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Hanken Grotesk',serif", fontWeight: 600, fontSize: 28, margin: "0 0 2px", color: C.ink }}>{d.customer.name}</h2>
        <div style={{ fontSize: 13, color: C.muted }}>
          {d.plot ? `Plot ${d.plot.plot_no} · ` : ""}{d.plot?.projects ? `${d.plot.projects.name}${d.plot.projects.location ? " · " + d.plot.projects.location : ""}` : "Celebrity Infra Pvt Ltd"}
        </div>
      </div>

      {d.plot ? (
        <Panel title="Your balance">
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "baseline", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase" }}>Balance due</div>
              <div style={{ fontFamily: "'Hanken Grotesk',serif", fontSize: 36, fontWeight: 600, color: balance > 0 ? C.red : C.green }}>{fmt(balance)}</div>
            </div>
            <div style={{ fontSize: 13, color: C.muted }}>{fmt(paid)} paid of {fmt(total)}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, color: C.ink }}>
            <span>{pct}% paid</span>
          </div>
          <div style={{ height: 12, background: C.field, borderRadius: 0, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg,${C.goldDeep},${C.gold})` }} />
          </div>
        </Panel>
      ) : (
        <Panel title="Your plot">
          <Empty>No plot linked to your account yet. Ask the admin if this looks wrong.</Empty>
        </Panel>
      )}

      <Panel title="Payment history">
        {d.transactions.length === 0 ? <Empty>No payments recorded yet.</Empty> : (
          <TableScroll minWidth={420}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>Date</Th><Th>Type</Th><Th right>Amount</Th></tr></thead>
              <tbody>
                {d.transactions.map((t) => (
                  <tr key={t.id}><Td>{t.date}</Td><Td>{t.type}</Td><Td right bold>{fmt(t.amount)}</Td></tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>

      {d.agent && (
        <Panel title="Your agent">
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase" }}>Name</div>
              <div style={{ fontSize: 16, color: C.ink, fontWeight: 600 }}>{d.agent.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase" }}>Phone</div>
              <div style={{ fontSize: 16, color: C.ink, fontWeight: 600 }}>{d.agent.phone}</div>
            </div>
          </div>
        </Panel>
      )}
    </>
  );
}
