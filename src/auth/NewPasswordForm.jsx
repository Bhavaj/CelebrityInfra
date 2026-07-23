import React, { useState } from "react";
import { supabase } from "../supabase";
import { Button, Field } from "../ui";
import { Hint, ErrorText } from "./shared";

// Sets a password on the currently active session (left behind by a just-
// verified email OTP). Used both when creating an account and when
// resetting a forgotten password — same mechanism either way.
export default function NewPasswordForm({ onDone }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (pw.length < 6) { setMsg("Password must be at least 6 characters."); return; }
    if (pw !== pw2) { setMsg("Passwords don't match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    onDone && onDone();
  }

  return (
    <form onSubmit={submit}>
      <Hint>Choose a password you'll use to sign in from now on.</Hint>
      <Field label="New password" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" />
      <Field label="Confirm password" type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Retype password" />
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save password"}</Button>
      <ErrorText>{msg}</ErrorText>
    </form>
  );
}
