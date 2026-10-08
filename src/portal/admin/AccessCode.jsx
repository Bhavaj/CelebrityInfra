import React, { useState } from "react";
import { supabase } from "../../shared/supabase.js";
import { C, MONO, Button, LABEL } from "../ui";

// Generates/reissues the one-time invite code an agent or customer claims to
// bind their Google/phone login to this record. Reissuing auto-revokes any
// earlier active code, so a lost phone/Google account loses access as soon as
// the new code is claimed.
export default function AccessCode({ role, targetId, linked }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function generate() {
    setBusy(true); setMsg("");
    const { data, error } = await supabase.rpc("create_access_code", { p_role: role, p_target_id: targetId });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setCode(data);
  }

  async function copy() {
    try { await navigator.clipboard.writeText(code); setMsg("Copied to clipboard."); }
    catch { setMsg(""); }
  }

  return (
    <div className="cip-inset" style={{ marginTop: 20 }}>
      <div style={{ ...LABEL, marginBottom: 12 }}>Login access</div>
      {code ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 500, letterSpacing: "0.24em", color: C.goldLt, overflowWrap: "anywhere" }}>{code}</span>
            <Button size="sm" kind="ghostLight" onClick={copy}>Copy</Button>
          </div>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 12, lineHeight: 1.6 }}>
            Give this to them to sign in with — it's single-use and any earlier code stops working the moment this one is claimed.
          </p>
        </>
      ) : (
        <Button size="sm" onClick={generate} disabled={busy}>
          {busy ? "Generating…" : linked ? "Reissue login code" : "Generate login code"}
        </Button>
      )}
      {msg && <p role="status" style={{ fontSize: 13, color: C.goldLt, marginTop: 10 }}>{msg}</p>}
    </div>
  );
}
