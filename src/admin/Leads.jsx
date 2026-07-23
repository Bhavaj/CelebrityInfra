import React, { useState } from "react";
import { supabase } from "../supabase";
import { C, Panel, Badge, Th, Td, Button, ConfirmButton, SearchBar, TableScroll, Empty, useIsMobile } from "../ui";

const STATUS = ["new", "site_visit", "negotiating", "booked", "lost"];
const statusLabel = { new: "New", site_visit: "Site Visit", negotiating: "Negotiating", booked: "Booked", lost: "Lost" };
const statusColor = { new: C.steel, site_visit: C.gold, negotiating: C.emerald, booked: C.green, lost: C.red };

export default function Leads({ leads, onDone }) {
  const mobile = useIsMobile();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [msg, setMsg] = useState("");

  const rows = leads.filter((l) => {
    if (status && l.status !== status) return false;
    if (!q) return true;
    return `${l.name} ${l.phone} ${l.email || ""}`.toLowerCase().includes(q.toLowerCase());
  }).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  async function setStatusFor(lead, s) {
    const { error } = await supabase.from("leads").update({ status: s }).eq("id", lead.id);
    if (error) { setMsg(error.message); return; }
    onDone();
  }

  async function convert(lead) {
    setMsg("");
    const { data: cust, error: custErr } = await supabase.from("customers")
      .insert({ name: lead.name, phone: lead.phone }).select().single();
    if (custErr) { setMsg(custErr.message); return; }
    const { error: leadErr } = await supabase.from("leads")
      .update({ converted_customer_id: cust.id, status: "booked" }).eq("id", lead.id);
    if (leadErr) { setMsg(leadErr.message); return; }
    onDone();
  }

  async function remove(lead) {
    const { data, error } = await supabase.from("leads").delete().eq("id", lead.id).select();
    if (error) { setMsg(error.message); return; }
    if (!data || data.length === 0) { setMsg("Delete didn't go through — you may not have permission."); return; }
    onDone();
  }

  return (
    <Panel title="Leads & Enquiries" right={
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexDirection: mobile ? "column" : "row" }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search name, phone, email…" />
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          style={{ padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 0, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 14, background: C.field, color: C.ink, width: mobile ? "100%" : undefined }}>
          <option value="">All stages</option>
          {STATUS.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
        </select>
      </div>
    }>
      {msg && <p style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{msg}</p>}
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>{rows.length} lead{rows.length === 1 ? "" : "s"}</div>
      {rows.length === 0 ? <Empty>No enquiries yet — they'll land here automatically when someone submits the homepage form.</Empty> : (
        <TableScroll minWidth={760}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Received</Th><Th>Name</Th><Th>Phone</Th><Th>Email</Th><Th>Preferred date</Th><Th>Stage</Th><Th>Actions</Th></tr></thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <Td>{new Date(l.created_at).toLocaleDateString("en-IN")}</Td>
                  <Td bold>{l.name}</Td>
                  <Td>{l.phone}</Td>
                  <Td>{l.email || "—"}</Td>
                  <Td>{l.preferred_date || "—"}</Td>
                  <Td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Badge text={statusLabel[l.status]} color={statusColor[l.status]} />
                      <select value={l.status} onChange={(e) => setStatusFor(l, e.target.value)}
                        style={{ padding: "5px 8px", border: `1px solid ${C.line}`, borderRadius: 0, fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 12, background: C.field, color: C.ink }}>
                        {STATUS.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
                      </select>
                    </div>
                  </Td>
                  <Td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {l.converted_customer_id
                        ? <span style={{ fontSize: 12, color: C.emeraldLt }}>✓ Converted</span>
                        : <Button kind="ghost" size="sm" onClick={() => convert(l)}>Convert to customer</Button>}
                      <ConfirmButton confirmText={`Delete the enquiry from ${l.name}? This can't be undone.`} onConfirm={() => remove(l)}>
                        Delete
                      </ConfirmButton>
                    </div>
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
