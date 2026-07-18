import React, { useState } from "react";
import { supabase } from "./supabase";
import { C, Crest, Button } from "./ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState("in"); // in | up | forgot
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      } else if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({ email, password: pw });
        if (error) throw error;
        if (data?.user && !data?.session) {
          setMsg("Account created. Please check your email to confirm, then sign in.");
        } else {
          setMsg("Account created. You can sign in now.");
        }
        setMode("in");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/portal/",
        });
        if (error) throw error;
        setMsg("If that email exists, a password reset link is on its way. Check your inbox.");
      }
    } catch (err) {
      const text = err?.message || err?.error_description || err?.msg
        || (typeof err === "string" ? err : JSON.stringify(err));
      setMsg(text || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const heading = mode === "in" ? "Welcome back" : mode === "up" ? "Create account" : "Reset password";
  const cta = mode === "in" ? "Sign in" : mode === "up" ? "Sign up" : "Send reset link";

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
          {heading}
        </h1>
        <p style={{ color: "rgba(247,244,236,.6)", fontSize: 13, letterSpacing: 1, marginBottom: 28 }}>Park-1 Owner &amp; Agent Portal</p>

        <form onSubmit={submit}>
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
          {mode !== "forgot" && (
            <input type="password" required placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} style={{ ...inp, marginTop: 12 }} />
          )}
          <div style={{ marginTop: 18 }}>
            <Button type="submit" disabled={busy}>{busy ? "Please wait…" : cta}</Button>
          </div>
        </form>

        {mode === "in" && (
          <button onClick={() => { setMode("forgot"); setMsg(""); }} style={linkBtn}>Forgot password?</button>
        )}

        {msg && <p style={{ color: C.goldLt, fontSize: 13, marginTop: 16 }}>{msg}</p>}

        <p style={{ color: "rgba(247,244,236,.6)", fontSize: 13, marginTop: 22 }}>
          {mode === "in" && <>No account yet? <button onClick={() => { setMode("up"); setMsg(""); }} style={swap}>Sign up</button></>}
          {mode === "up" && <>Already have an account? <button onClick={() => { setMode("in"); setMsg(""); }} style={swap}>Sign in</button></>}
          {mode === "forgot" && <>Remembered it? <button onClick={() => { setMode("in"); setMsg(""); }} style={swap}>Back to sign in</button></>}
        </p>
      </div>
    </div>
  );
}

const inp = {
  width: "100%", background: "rgba(247,244,236,.06)", border: "1px solid rgba(247,244,236,.2)",
  color: "#F7F4EC", padding: "14px 16px", fontFamily: "'Jost',sans-serif", fontSize: 15, borderRadius: 6,
  transition: "border-color .18s ease, box-shadow .18s ease",
};
const swap = { background: "none", border: "none", color: "#E8C874", cursor: "pointer", fontSize: 13, textDecoration: "underline", fontFamily: "'Jost',sans-serif" };
const linkBtn = { background: "none", border: "none", color: "rgba(247,244,236,.7)", cursor: "pointer", fontSize: 13, marginTop: 14, padding: 0, fontFamily: "'Jost',sans-serif", textDecoration: "underline" };
