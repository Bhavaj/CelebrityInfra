import React, { useState } from "react";
import { supabase } from "../supabase";
import { C, Button } from "../ui";
import { codeInputStyle, ErrorText, Hint } from "./shared";
import { storePendingCode } from "./authFlags";
import SetPasswordFlow from "./SetPasswordFlow";

const ROLE_LABEL = { agent: "Agent", customer: "Client" };

// The only place an invite code is entered. Validates it (without consuming
// it — see check_access_code in 003_check_access_code.sql) so the person can
// see whose access they're about to claim before handing over an email.
// claim_access_code itself only runs later, from App.jsx's pending-code
// effect, once a session exists.
export default function CreateAccountFlow({ role }) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState(null); // { role, label }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function checkCode(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const { data, error } = await supabase.rpc("check_access_code", { p_code: code.trim() }).single();
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    if (data.role !== role) { setMsg(`That code is for a ${ROLE_LABEL[data.role]} account, not a ${ROLE_LABEL[role]} one.`); return; }
    storePendingCode(code.trim());
    setPreview(data);
  }

  if (preview) {
    return (
      <>
        <Hint>Claiming <strong style={{ color: C.goldLt }}>{preview.label}</strong>'s {ROLE_LABEL[role].toLowerCase()} access.</Hint>
        <SetPasswordFlow helperText="Verify your email to finish creating your account." />
      </>
    );
  }

  return (
    <form onSubmit={checkCode}>
      <Hint>Enter the one-time code your admin gave you.</Hint>
      <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. K7M2P9XQ" required style={codeInputStyle} />
      <ErrorText>{msg}</ErrorText>
      <div style={{ marginTop: 16 }}>
        <Button type="submit" disabled={busy}>{busy ? "Checking…" : "Continue"}</Button>
      </div>
    </form>
  );
}
