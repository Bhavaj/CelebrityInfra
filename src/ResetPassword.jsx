import React, { useState } from "react";
import { supabase } from "./supabase";
import { C, Crest, Button } from "./ui";

export default function ResetPassword({ onDone }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (pw.length < 6) { setMsg("Password must be at least 6 characters."); return; }
    if (pw !== pw2) { setMsg("Passwords don't match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setMsg("Password updated. Signing you in…");
    setTimeout(onDone, 900);
  }

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(60% 42% at 50% 0%, rgba(201,162,39,.10), transparent 60%), radial-gradient(55% 40% at 100% 100%, rgba(47,191,143,.05), transparent 55%), ${C.bg}`, display: "grid", placeItems: "center", padding: 20, fontFamily: "'Jost',sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <Crest size={42} />
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, letterSpacing: 2, color: C.goldLt }}>CELEBRITY</div>
            <div style={{ fontSize: 9, letterSpacing: 4, color: "rgba(247,244,236,.6)" }}>INFRA PVT LTD</div>
          </div>
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: 32, color: "#F7F4EC", margin: "0 0 4px" }}>
          Set a new password
        </h1>
        <p style={{ color: "rgba(247,244,236,.6)", fontSize: 13, letterSpacing: 1, marginBottom: 28 }}>Choose something you'll remember</p>

        <form onSubmit={submit}>
          <input type="password" required placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} style={inp} />
          <input type="password" required placeholder="Confirm new password" value={pw2} onChange={(e) => setPw2(e.target.value)} style={{ ...inp, marginTop: 12 }} />
          <div style={{ marginTop: 18 }}>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
          </div>
        </form>
        {msg && <p style={{ color: C.goldLt, fontSize: 13, marginTop: 16 }}>{msg}</p>}
      </div>
    </div>
  );
}

const inp = {
  width: "100%", background: "rgba(247,244,236,.06)", border: "1px solid rgba(247,244,236,.2)",
  color: "#F7F4EC", padding: "14px 16px", fontFamily: "'Jost',sans-serif", fontSize: 15, borderRadius: 4,
};
