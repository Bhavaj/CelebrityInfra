import React, { useState } from "react";
import { supabase } from "../supabase";
import { C, Button, Field } from "../ui";
import { ErrorText } from "./shared";
import SetPasswordFlow from "./SetPasswordFlow";

export default function EmailPasswordForm() {
  const [mode, setMode] = useState("signin"); // signin | reset
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) setMsg(error.message);
  }

  if (mode === "reset") {
    return <SetPasswordFlow helperText="Verify your email, then set a password to sign in with next time." />;
  }

  return (
    <div>
      <form onSubmit={submit}>
        <Field label="Email address" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <Field label="Password" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Your password" />
        <Button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        <ErrorText>{msg}</ErrorText>
      </form>
      <button type="button" onClick={() => { setMode("reset"); setMsg(""); }}
        style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginTop: 14, padding: 0, fontFamily: "'Hanken Grotesk',sans-serif", textDecoration: "underline" }}>
        Forgot password, or haven't set one yet?
      </button>
    </div>
  );
}
