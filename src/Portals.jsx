import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { C, fmt, Panel, Stat, Th, Td, TableScroll, Empty } from "./ui";

// ---------- AGENT ----------
export function AgentPortal({ agentId }) {
  const [d, setD] = useState({ agent: null, customers: [], commissions: [], downline: [], plots: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [agent, customers, commissions, downline, plots] = await Promise.all([
        supabase.from("agents").select("*").eq("id", agentId).single(),
        supabase.from("customers").select("*").eq("agent_id", agentId),
        supabase.from("commissions").select("*").eq("beneficiary_id", agentId),
        supabase.from("agents").select("*").eq("sponsor_id", agentId),
        supabase.from("plots").select("*"),
      ]);
      setD({
        agent: agent.data, customers: customers.data || [], commissions: commissions.data || [],
        downline: downline.data || [], plots: plots.data || [],
      });
      setLoading(false);
    })();
  }, [agentId]);

  if (loading) return <p style={{ color: C.muted }}>Loading…</p>;
  if (!d.agent) return <p style={{ color: C.muted }}>No agent profile linked to this login yet. Ask the admin to link your account.</p>;

  const direct = d.commissions.filter((c) => c.kind === "Direct").reduce((s, c) => s + Number(c.amount), 0);
  const bonus = d.commissions.filter((c) => c.kind !== "Direct").reduce((s, c) => s + Number(c.amount), 0);
  const plotNo = (id) => d.plots.find((p) => p.id === id)?.plot_no ?? "—";

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: 28, margin: "0 0 2px", color: C.ink }}>{d.agent.name}</h2>
        <div style={{ fontSize: 13, color: C.muted }}>Quota {d.agent.quota_percent}% · {d.agent.sponsor_id ? "Referred agent" : "Direct agent"}</div>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <Stat label="Direct commission" value={fmt(direct)} accent={C.navy} />
        <Stat label="Referral bonus" value={fmt(bonus)} accent={C.gold} />
        <Stat label="Total earned" value={fmt(direct + bonus)} accent={C.green} />
        <Stat label="My customers" value={d.customers.length} />
        <Stat label="Agents I invited" value={d.downline.length} />
      </div>

      <Panel title="My customers">
        {d.customers.length === 0 ? <Empty>No customers yet.</Empty> : (
          <TableScroll minWidth={360}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><Th>Customer</Th><Th>Phone</Th></tr></thead>
              <tbody>
                {d.customers.map((c) => <tr key={c.id}><Td bold>{c.name}</Td><Td>{c.phone}</Td></tr>)}
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
                    <Td><span style={{ color: c.kind === "Direct" ? C.navy : C.gold, fontWeight: 600, fontSize: 13 }}>{c.kind}</span></Td>
                    <Td right>{c.pct}%</Td>
                    <Td right bold>{fmt(c.amount)}</Td>
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
  const [d, setD] = useState({ customer: null, plot: null, transactions: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const cust = await supabase.from("customers").select("*").eq("id", customerId).single();
      const [plot, tx] = await Promise.all([
        supabase.from("plots").select("*, projects(name, location)").eq("customer_id", customerId).maybeSingle(),
        supabase.from("transactions").select("*").eq("customer_id", customerId).order("date"),
      ]);
      setD({ customer: cust.data, plot: plot.data, transactions: tx.data || [] });
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
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: 28, margin: "0 0 2px", color: C.ink }}>{d.customer.name}</h2>
        <div style={{ fontSize: 13, color: C.muted }}>{d.plot?.projects ? `${d.plot.projects.name} · ${d.plot.projects.location || ""}` : "Celebrity Infra Pvt Ltd"}</div>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <Stat label="Plot owned" value={d.plot ? d.plot.plot_no : "—"} accent={C.navy} />
        <Stat label="Investment" value={fmt(total)} />
        <Stat label="Paid" value={fmt(paid)} accent={C.green} />
        <Stat label="Balance" value={fmt(balance)} accent={balance > 0 ? C.red : C.green} />
      </div>

      {d.plot && (
        <Panel title="Payment progress">
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, color: C.ink }}>
            <span>{pct}% paid</span><span style={{ color: C.muted }}>{fmt(paid)} of {fmt(total)}</span>
          </div>
          <div style={{ height: 12, background: C.goldSoft, borderRadius: 20, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: C.navy }} />
          </div>
        </Panel>
      )}

      <Panel title="Transaction history">
        {d.transactions.length === 0 ? <Empty>No transactions yet.</Empty> : (
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
    </>
  );
}
