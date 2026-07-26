import React, { useState } from "react";
import { supabase } from "../supabase";
import { C, MONO, fmt, Button, Field } from "../ui";

// Logs one installment/partial payment against a sold plot. Every "paid so
// far" / "balance due" figure shown across Inventory, Customers, and the
// agent/customer portals is derived live from the transactions table by
// summing rows for that plot or customer — so this insert is the one place
// that keeps all of those views in sync, with nothing else to update.
export default function RecordPayment({ plotId, customerId, price, paid, onDone }) {
  const remaining = Number(price) - Number(paid);
  const [amount, setAmount] = useState(remaining > 0 ? String(remaining) : "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState("Installment");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setMsg("Enter an amount greater than 0."); return; }
    setBusy(true); setMsg("");
    const { error } = await supabase.from("transactions").insert({
      plot_id: plotId, customer_id: customerId, amount: amt, date, type,
    });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setAmount("");
    onDone();
  }

  return (
    <div style={{ marginTop: 16, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 8, padding: 14 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: MONO }}>
        Record a payment{remaining > 0 && <span style={{ color: C.goldLt }}> · {fmt(remaining)} remaining</span>}
      </div>
      <Field label="Amount received (₹)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50000" />
      <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <Field label="Type" value={type} onChange={(e) => setType(e.target.value)} placeholder="Installment, Booking advance, Final…" />
      {msg && <p style={{ color: C.red, fontSize: 13 }}>{msg}</p>}
      <Button size="sm" onClick={save} disabled={busy || !amount}>{busy ? "Saving…" : "Add payment"}</Button>
    </div>
  );
}
