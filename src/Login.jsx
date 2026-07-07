import React, { useState } from "react";
import { supabase } from "./supabase";
import { C, Crest, Button } from "./ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState("in"); // in | up
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password: pw });
        if (error) throw error;
        setMsg("Account created. If email confirmation is on, check your inbox, then sign in.");
        setMode("in");
      }
    } catch (err) {
      setMsg(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg,${C.navy},${C.navy2})`, display: "grid", placeItems: "center", padding: 20, fontFamily: "'Jost',sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <Crest size={42} />
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, letterSpacing: 2, color: C.goldLt }}>CELEBRITY</div>
            <div style={{ fontSize: 9, letterSpacing: 4, color: "rgba(247,244,236,.6)" }}>INFRA PVT LTD</div>
          </div>
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: 32, color: "#F7F4EC", margin: "0 0 4px" }}>
          {mode === "in" ? "Welcome back" : "Create account"}
        </h1>
        <p style={{ color: "rgba(247,244,236,.6)", fontSize: 13, letterSpacing: 1, marginBottom: 28 }}>Park-1 Owner &amp; Agent Portal</p>

        <form onSubmit={submit}>
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            style={inp} />
          <input type="password" required placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)}
            style={{ ...inp, marginTop: 12 }} />
          <div style={{ marginTop: 18 }}>
            <Button type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Sign up"}</Button>
          </div>
        </form>

        {msg && <p style={{ color: C.goldLt, fontSize: 13, marginTop: 16 }}>{msg}</p>}

        <p style={{ color: "rgba(247,244,236,.6)", fontSize: 13, marginTop: 22 }}>
          {mode === "in" ? "No account yet? " : "Already have an account? "}
          <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }}
            style={{ background: "none", border: "none", color: C.goldLt, cursor: "pointer", fontSize: 13, textDecoration: "underline", fontFamily: "'Jost',sans-serif" }}>
            {mode === "in" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

const inp = {
  width: "100%", background: "rgba(247,244,236,.06)", border: "1px solid rgba(247,244,236,.2)",
  color: "#F7F4EC", padding: "14px 16px", fontFamily: "'Jost',sans-serif", fontSize: 15, borderRadius: 4,
};
