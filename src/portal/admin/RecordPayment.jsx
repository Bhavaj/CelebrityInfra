import React, { useState } from "react";
import { supabase } from "../../shared/supabase.js";
import { C, MONO, fmt, todayISO, Button, Field, LABEL } from "../ui";

// Logs one installment/partial payment against a booked or sold plot. Every
// "paid so far" / "balance due" figure shown across Inventory, Customers, and
// the agent/customer portals is derived live from the transactions table by
// summing rows for that plot or customer. The record_payment RPC does the
// insert AND accrues commission on that payment increment (rate + sponsor
// gap-fill cascade, scaled to the amount received rather than the full
// price) — so this is the one place that keeps payments, balances, and
// commission payouts all in sync.
export default function RecordPayment({ plotId, price, paid, onDone }) {
  const remaining = Number(price) - Number(paid);
  const [amount, setAmount] = useState(remaining > 0 ? String(remaining) : "");
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState("Installment");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setMsg("Enter an amount greater than 0."); return; }
    setBusy(true); setMsg("");
    const { error } = await supabase.rpc("record_payment", {
      p_plot_id: plotId, p_amount: amt, p_date: date, p_type: type,
    });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setAmount("");
    onDone();
  }

  return (
    <div className="cip-inset" style={{ marginTop: 20 }}>
      <div style={{ ...LABEL, marginBottom: 12 }}>
        Record a payment{remaining > 0 && <span className="cip-num" style={{ color: C.goldLt, marginLeft: 10, letterSpacing: "0.06em" }}>{fmt(remaining)} remaining</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", columnGap: 14 }}>
        <Field label="Amount received (₹)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50000" />
        <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Field label="Type" value={type} onChange={(e) => setType(e.target.value)} placeholder="Installment, Booking advance, Final…" />
      </div>
      {msg && <p role="alert" style={{ color: C.red, fontSize: 13.5, lineHeight: 1.5, marginBottom: 14 }}>{msg}</p>}
      <Button size="sm" onClick={save} disabled={busy || !amount}>{busy ? "Saving…" : "Add payment"}</Button>
    </div>
  );
}
