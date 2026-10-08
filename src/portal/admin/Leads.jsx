import React, { useState } from "react";
import { supabase } from "../../shared/supabase.js";
import { C, MONO, fmtDate, Panel, Badge, Th, Td, Button, ConfirmButton, SearchBar, TableScroll, Empty, useIsMobile, RowCard, RowLine, Select, LABEL, Icon } from "../ui";

const STATUS = ["new", "site_visit", "negotiating", "booked", "lost"];
const statusLabel = { new: "New", site_visit: "Site Visit", negotiating: "Negotiating", booked: "Booked", lost: "Lost" };
const statusColor = { new: C.steel, site_visit: C.gold, negotiating: C.wineLt, booked: C.green, lost: C.faint };

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
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", flexDirection: mobile ? "column" : "row" }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search name, phone, email…" />
        <div style={{ width: mobile ? "100%" : undefined }}>
          <Select compact={!mobile} value={status} onChange={setStatus} placeholder="All stages"
            options={STATUS.map((s) => ({ v: s, l: statusLabel[s] }))} />
        </div>
      </div>
    }>
      {msg && <p role="alert" style={{ color: C.red, fontSize: 13.5, lineHeight: 1.5, marginBottom: 14 }}>{msg}</p>}
      <div className="cip-num" style={{ fontSize: 13.5, color: C.muted, marginBottom: 16 }}>{rows.length} lead{rows.length === 1 ? "" : "s"}</div>
      {rows.length === 0 ? <Empty>No enquiries yet — they'll land here automatically when someone submits the homepage form.</Empty> : mobile ? (
        <div>
          {rows.map((l) => (
            <RowCard key={l.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 15.5, color: C.ink }}>{l.name}</span>
                <Badge text={statusLabel[l.status]} color={statusColor[l.status]} />
              </div>
              <RowLine label="Received" value={fmtDate(l.created_at)} />
              <RowLine label="Phone" value={l.phone} />
              <RowLine label="Email" value={l.email || "—"} />
              <RowLine label="Pref. date" value={l.preferred_date || "—"} />
              <div style={{ marginTop: 12, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                <div style={{ ...LABEL, marginBottom: 8 }}>Stage</div>
                <div style={{ marginBottom: 10 }}>
                  <Select value={l.status} onChange={(v) => setStatusFor(l, v)}
                    options={STATUS.map((s) => ({ v: s, l: statusLabel[s] }))} />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {l.converted_customer_id
                    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: C.green, minHeight: 36 }}><Icon name="check" size={17} /> Converted</span>
                    : <Button kind="ghost" size="sm" onClick={() => convert(l)}>Convert to customer</Button>}
                  <ConfirmButton confirmText={`Delete the enquiry from ${l.name}? This can't be undone.`} onConfirm={() => remove(l)}>
                    Delete
                  </ConfirmButton>
                </div>
              </div>
            </RowCard>
          ))}
        </div>
      ) : (
        <TableScroll minWidth={760}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><Th>Received</Th><Th>Name</Th><Th>Phone</Th><Th>Email</Th><Th>Preferred date</Th><Th>Stage</Th><Th>Actions</Th></tr></thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <Td>{fmtDate(l.created_at)}</Td>
                  <Td bold>{l.name}</Td>
                  <Td>{l.phone}</Td>
                  <Td>{l.email || "—"}</Td>
                  <Td>{l.preferred_date || "—"}</Td>
                  <Td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Badge text={statusLabel[l.status]} color={statusColor[l.status]} />
                      <Select compact value={l.status} onChange={(v) => setStatusFor(l, v)}
                        options={STATUS.map((s) => ({ v: s, l: statusLabel[s] }))} />
                    </div>
                  </Td>
                  <Td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", alignItems: "center" }}>
                      {l.converted_customer_id
                        ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: C.green, minHeight: 36 }}><Icon name="check" size={17} /> Converted</span>
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
