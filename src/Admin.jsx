import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { C, DISPLAY, fmt, PageHeader, Panel, Stat, Modal, Select, Button, useIsMobile } from "./ui";
import Sidebar from "./admin/Sidebar";
import Inventory, { ManageProjects } from "./admin/Inventory";
import Customers from "./admin/Customers";
import Agents from "./admin/Agents";
import Leads from "./admin/Leads";
import LinkUsers from "./LinkUsers";

const TAB_LABEL = { overview: "Overview", inventory: "Plots", customers: "Customers", agents: "Agents", leads: "Leads" };
const TAB_SUBTITLE = {
  overview: "Snapshot of the currently selected project.",
  inventory: "Plots, availability, and payment schedules for the selected project.",
  customers: "Everyone who's bought in — across every project.",
  agents: "Network, per-project commission rates, and the payout ledger.",
  leads: "Site-visit enquiries from the public homepage.",
};

export default function Admin() {
  const mobile = useIsMobile(900);
  const [tab, setTab] = useState("overview");
  const [agentsView, setAgentsView] = useState("tree");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manageProjectsOpen, setManageProjectsOpen] = useState(false);
  const [activeProject, setActiveProject] = useState("");
  const [data, setData] = useState({
    agents: [], customers: [], plots: [], projects: [], commissions: [], transactions: [],
    users: [], leads: [], rates: [], installments: [],
  });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [agents, customers, plots, projects, commissions, transactions, users, leads, rates, installments] = await Promise.all([
      supabase.from("agents").select("*"),
      supabase.from("customers").select("*"),
      supabase.from("plots").select("*").order("plot_no"),
      supabase.from("projects").select("*").order("name"),
      supabase.from("commissions").select("*"),
      supabase.from("transactions").select("*"),
      supabase.rpc("list_users"),
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("agent_project_rates").select("*"),
      supabase.from("plot_installments").select("*").order("due_date"),
    ]);
    const projs = projects.data || [];
    setData({
      agents: agents.data || [], customers: customers.data || [],
      plots: plots.data || [], projects: projs,
      commissions: commissions.data || [], transactions: transactions.data || [],
      users: users.data || [], leads: leads.data || [],
      rates: rates.data || [], installments: installments.data || [],
    });
    const pickable = projs.filter((p) => !p.archived);
    setActiveProject((cur) => (cur && pickable.some((p) => p.id === cur)) ? cur : (pickable[0]?.id ?? ""));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const agentName = (id) => data.agents.find((a) => a.id === id)?.name ?? "—";
  const customerName = (id) => data.customers.find((c) => c.id === id)?.name ?? "—";
  const pickableProjects = data.projects.filter((p) => !p.archived);
  const activeProjectObj = data.projects.find((p) => p.id === activeProject);

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
  const newLeadsCount = data.leads.filter((l) => l.status === "new").length;

  const onSold = () => { load(); setTab("agents"); setAgentsView("commissions"); };
  const pageLabel = TAB_LABEL[tab] || "Overview";

  // Persistent project selector — every tab that's meaningfully project-scoped
  // (Overview, Plots, Agents/rates+ledger) reads `activeProject`; Customers
  // stays a global list (a customer can own plots across several projects)
  // but still uses it to scope the "plots in this project" quick view.
  // Creating/archiving projects lives right next to the selector itself
  // (universal, on every tab) instead of being buried inside the Plots tab.
  const projectPicker = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {pickableProjects.length > 0 && (
        <div style={{ minWidth: mobile ? "100%" : 240 }}>
          <Select value={activeProject} onChange={setActiveProject}
            options={pickableProjects.map((p) => ({ v: p.id, l: p.name }))} />
        </div>
      )}
      <Button kind="ghost" size="sm" onClick={() => setManageProjectsOpen(true)}>
        {pickableProjects.length > 0 ? "Projects" : "+ New project"}
      </Button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", alignItems: mobile ? "stretch" : "flex-start", gap: mobile ? 0 : 24 }}>
      <Sidebar active={tab} onSelect={setTab} onOpenSettings={() => setSettingsOpen(true)} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <PageHeader
          eyebrow={pickableProjects.length > 0 ? "Admin · " + (activeProjectObj?.name || "No project") : "Admin"}
          title={pageLabel}
          subtitle={TAB_SUBTITLE[tab]}
          right={projectPicker}
        />

        {loading && <p style={{ color: C.muted }}>Loading…</p>}

        <div key={tab} className="cip-in-fast">
        {!loading && tab === "overview" && (
          pickableProjects.length === 0 ? (
            <Panel title="No projects yet">
              <p style={{ color: C.muted, margin: 0 }}>Create your first project (e.g. Celebrity's Park-1) using the "+ New project" button next to the selector above to begin adding plots and recording sales.</p>
            </Panel>
          ) : (
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Stat label="Revenue booked" value={fmt(revenue)} accent={C.steel} icon="payments" />
              <Stat label="Collected" value={fmt(collected)} accent={C.green} icon="account_balance_wallet" />
              <Stat label="Commission payout" value={fmt(payout)} accent={C.gold} icon="percent" />
              <Stat label="Plots sold" value={`${sold.length}/${projectPlots.length}`} icon="domain" />
              <Stat label="Customers" value={projectCustomerIds.size} icon="group" />
              <Stat label="Agents" value={data.agents.length} icon="handshake" />
              <Stat label="New leads" value={newLeadsCount} accent={newLeadsCount > 0 ? C.gold : undefined} icon="campaign" />
            </div>
          )
        )}

        {!loading && tab === "inventory" && (
          <Inventory plots={data.plots} projectId={activeProject} projects={data.projects}
            customers={data.customers} agents={data.agents} transactions={data.transactions}
            installments={data.installments} customerName={customerName} onDone={load} onSold={onSold} />
        )}

        {!loading && tab === "customers" && (
          <Customers customers={data.customers} plots={data.plots} transactions={data.transactions}
            installments={data.installments} users={data.users} agents={data.agents}
            projects={data.projects} activeProject={activeProject}
            agentName={agentName} onDone={load} />
        )}

        {!loading && tab === "agents" && (
          <Agents agents={data.agents} customers={data.customers} commissions={data.commissions}
            plots={data.plots} users={data.users} agentName={agentName}
            projects={data.projects} activeProject={activeProject} rates={data.rates}
            view={agentsView} setView={setAgentsView} onDone={load} />
        )}

        {!loading && tab === "leads" && (
          <Leads leads={data.leads} onDone={load} />
        )}
        </div>
      </div>

      {settingsOpen && (
        <Modal title="Settings" onClose={() => setSettingsOpen(false)} maxWidth={860}>
          <LinkUsers agents={data.agents} customers={data.customers} onDone={load} />
        </Modal>
      )}

      {manageProjectsOpen && (
        <ManageProjects projects={data.projects} plots={data.plots} onClose={() => setManageProjectsOpen(false)} onDone={load} />
      )}
    </div>
  );
}
