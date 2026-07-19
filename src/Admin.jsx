import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { C, fmt, Panel, Stat, Modal, useIsMobile } from "./ui";
import Sidebar from "./admin/Sidebar";
import Inventory from "./admin/Inventory";
import Customers from "./admin/Customers";
import Partners from "./admin/Partners";
import Leads from "./admin/Leads";
import LinkUsers from "./LinkUsers";

export default function Admin() {
  const mobile = useIsMobile(900);
  const [tab, setTab] = useState("overview");
  const [partnersView, setPartnersView] = useState("tree");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeProject, setActiveProject] = useState("");
  const [data, setData] = useState({ agents: [], customers: [], plots: [], projects: [], commissions: [], transactions: [], users: [], leads: [] });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [agents, customers, plots, projects, commissions, transactions, users, leads] = await Promise.all([
      supabase.from("agents").select("*"),
      supabase.from("customers").select("*"),
      supabase.from("plots").select("*").order("plot_no"),
      supabase.from("projects").select("*").order("name"),
      supabase.from("commissions").select("*"),
      supabase.from("transactions").select("*"),
      supabase.rpc("list_users"),
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
    ]);
    const projs = projects.data || [];
    setData({
      agents: agents.data || [], customers: customers.data || [],
      plots: plots.data || [], projects: projs,
      commissions: commissions.data || [], transactions: transactions.data || [],
      users: users.data || [], leads: leads.data || [],
    });
    const pickable = projs.filter((p) => !p.archived);
    setActiveProject((cur) => (cur && pickable.some((p) => p.id === cur)) ? cur : (pickable[0]?.id ?? ""));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const agentName = (id) => data.agents.find((a) => a.id === id)?.name ?? "—";
  const customerName = (id) => data.customers.find((c) => c.id === id)?.name ?? "—";
  const pickableProjects = data.projects.filter((p) => !p.archived);

  // Overview stats are scoped to the active project.
  const projectPlots = data.plots.filter((p) => p.project_id === activeProject);
  const plotIds = new Set(projectPlots.map((p) => p.id));
  const projectCommissions = data.commissions.filter((c) => plotIds.has(c.plot_id));
  const projectTx = data.transactions.filter((t) => plotIds.has(t.plot_id));
  const sold = projectPlots.filter((p) => p.status === "sold");
  const revenue = sold.reduce((s, p) => s + Number(p.price), 0);
  const collected = projectTx.reduce((s, t) => s + Number(t.amount), 0);
  const payout = projectCommissions.reduce((s, c) => s + Number(c.amount), 0);
  const projectCustomerIds = new Set(sold.map((p) => p.customer_id).filter(Boolean));
  const activeName = data.projects.find((p) => p.id === activeProject)?.name;
  const newLeadsCount = data.leads.filter((l) => l.status === "new").length;

  const onSold = () => { load(); setTab("partners"); setPartnersView("commissions"); };

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      <Sidebar active={tab} onSelect={setTab} onOpenSettings={() => setSettingsOpen(true)} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {(tab === "overview" || tab === "inventory") && pickableProjects.length > 0 && (
          <div style={{ display: "flex", alignItems: mobile ? "stretch" : "center", flexDirection: mobile ? "column" : "row", gap: mobile ? 6 : 12, marginBottom: 18 }}>
            <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Active project</span>
            <select value={activeProject} onChange={(e) => setActiveProject(e.target.value)}
              style={{ padding: "10px 14px", border: `1px solid ${C.gold}`, borderRadius: 6, fontFamily: "'Jost',sans-serif", fontSize: 15, fontWeight: 600, color: C.ink, background: C.field, width: mobile ? "100%" : "auto" }}>
              {pickableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {loading && <p style={{ color: C.muted }}>Loading…</p>}

        {!loading && tab === "overview" && (
          pickableProjects.length === 0 ? (
            <Panel title="No projects yet">
              <p style={{ color: C.muted, marginBottom: 14 }}>Create your first project (e.g. Celebrity's Park-1) from Inventory → Manage Projects to begin adding plots and recording sales.</p>
            </Panel>
          ) : (
            <>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: 28, color: C.ink, margin: "0 0 16px" }}>{activeName}</h2>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
                <Stat label="Revenue booked" value={fmt(revenue)} accent={C.steel} />
                <Stat label="Collected" value={fmt(collected)} accent={C.green} />
                <Stat label="Commission payout" value={fmt(payout)} accent={C.gold} />
                <Stat label="Plots sold" value={`${sold.length}/${projectPlots.length}`} />
                <Stat label="Customers" value={projectCustomerIds.size} />
                <Stat label="Partners" value={data.agents.length} />
                <Stat label="New leads" value={newLeadsCount} accent={newLeadsCount > 0 ? C.gold : undefined} />
              </div>
            </>
          )
        )}

        {!loading && tab === "inventory" && (
          <Inventory plots={data.plots} projectId={activeProject} projects={data.projects}
            customers={data.customers} agents={data.agents} transactions={data.transactions}
            customerName={customerName} onDone={load} onSold={onSold} />
        )}

        {!loading && tab === "customers" && (
          <Customers customers={data.customers} plots={data.plots} transactions={data.transactions}
            agentName={agentName} onDone={load} />
        )}

        {!loading && tab === "partners" && (
          <Partners agents={data.agents} customers={data.customers} commissions={data.commissions}
            plots={data.plots} users={data.users} agentName={agentName}
            view={partnersView} setView={setPartnersView} onDone={load} />
        )}

        {!loading && tab === "leads" && (
          <Leads leads={data.leads} onDone={load} />
        )}
      </div>

      {settingsOpen && (
        <Modal title="Settings" onClose={() => setSettingsOpen(false)}>
          <LinkUsers agents={data.agents} customers={data.customers} onDone={load} />
        </Modal>
      )}
    </div>
  );
}
