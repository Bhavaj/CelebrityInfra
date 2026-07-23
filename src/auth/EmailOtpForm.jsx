import React, { useState } from "react";
import { supabase } from "../supabase";
import { C, Button, Field } from "../ui";
import { Hint, ErrorText } from "./shared";

// Two-step email -> OTP code form, shared by every flow that needs to verify
// email ownership (account creation, forgot/set password). Once verifyOtp
// succeeds, the caller has an active session and can proceed (e.g. set a
// password, or let App.jsx's global auth listener pick up the sign-in).
export default function EmailOtpForm({ helperText, onVerified }) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [stage, setStage] = useState("email"); // email | otp
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function sendCode(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setStage("otp");
  }

  async function verify(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    onVerified && onVerified(email.trim());
  }

  return (
    <div>
      {helperText && <Hint>{helperText}</Hint>}
      {stage === "email" ? (
        <form onSubmit={sendCode}>
          <Field label="Email address" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <div style={{ marginTop: 4 }}>
            <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send code"}</Button>
          </div>
        </form>
      ) : (
        <form onSubmit={verify}>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 10 }}>Code sent to {email.trim()}</p>
          <Field label="6-digit code" type="text" inputMode="numeric" required value={token} onChange={(e) => setToken(e.target.value)} placeholder="123456" />
          <div style={{ display: "flex", gap: 10 }}>
            <Button type="submit" disabled={busy}>{busy ? "Verifying…" : "Verify"}</Button>
            <Button type="button" kind="ghostLight" onClick={() => { setStage("email"); setToken(""); setMsg(""); }}>Change email</Button>
          </div>
        </form>
      )}
      <ErrorText>{msg}</ErrorText>
    </div>
  );
}
