import React, { useState } from "react";
import { supabase } from "../supabase";
import { C, MONO, Button } from "../ui";

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
    <div style={{ marginTop: 16, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 0, padding: 14 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: MONO }}>Login access</div>
      {code ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, letterSpacing: 4, color: C.goldLt }}>{code}</span>
            <Button size="sm" kind="ghostLight" onClick={copy}>Copy</Button>
          </div>
          <p style={{ fontSize: 12.5, color: C.muted, marginTop: 8 }}>
            Give this to them to sign in with — it's single-use and any earlier code stops working the moment this one is claimed.
          </p>
        </>
      ) : (
        <Button size="sm" onClick={generate} disabled={busy}>
          {busy ? "Generating…" : linked ? "Reissue login code" : "Generate login code"}
        </Button>
      )}
      {msg && <p style={{ fontSize: 12.5, color: C.gold, marginTop: 8 }}>{msg}</p>}
    </div>
  );
}
