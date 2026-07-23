import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { C, FONT, MONO, Crest, Button, Badge } from "./ui";
import RoleChooser from "./auth/RoleChooser";
import AdminLogin from "./auth/AdminLogin";
import AgentLogin from "./auth/AgentLogin";
import ClientLogin from "./auth/ClientLogin";
import AuthShell from "./auth/AuthShell";
import NewPasswordForm from "./auth/NewPasswordForm";
import { peekPendingCode, clearPendingCode, peekPasswordSetupFlag, clearPasswordSetupFlag } from "./auth/authFlags";
import Admin from "./Admin";
import { AgentPortal, CustomerPortal } from "./Portals";

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);
  const [loginScreen, setLoginScreen] = useState("chooser"); // chooser | admin | agent | client
  const [claimError, setClaimError] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Verifying an OTP flips `session` truthy immediately, which would
  // otherwise bounce straight past the "set a password" step still owed by
  // account-creation / forgot-password flows (see auth/authFlags.js) — this
  // gate is what actually shows that step, at the top level, safely outside
  // whatever login component triggered the OTP.
  useEffect(() => {
    if (session && peekPasswordSetupFlag()) setNeedsPassword(true);
  }, [session]);

  useEffect(() => {
    if (!session) { setProfile(null); setReady(true); return; }
    (async () => {
      setReady(false);
      let { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();

      if (!data) {
        const pending = peekPendingCode();
        if (pending) {
          const { error } = await supabase.rpc("claim_access_code", { p_code: pending });
          clearPendingCode();
          if (error) {
            setClaimError(error.message);
          } else {
            setClaimError("");
            ({ data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single());
          }
        }
      }

      setProfile(data);
      setReady(true);
    })();
  }, [session]);

  function signOut() {
    supabase.auth.signOut();
    setLoginScreen("chooser");
    setClaimError("");
    setNeedsPassword(false);
  }

  if (!ready) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: C.bg, color: C.muted, fontFamily: FONT }}>Loading…</div>;

  if (session && needsPassword) {
    return (
      <AuthShell title="Set your password" subtitle="Last step — choose a password to sign in with next time.">
        <NewPasswordForm onDone={() => { clearPasswordSetupFlag(); setNeedsPassword(false); }} />
      </AuthShell>
    );
  }

  if (!session) {
    if (loginScreen === "admin") return <AdminLogin onBack={() => setLoginScreen("chooser")} />;
    if (loginScreen === "agent") return <AgentLogin onBack={() => setLoginScreen("chooser")} />;
    if (loginScreen === "client") return <ClientLogin onBack={() => setLoginScreen("chooser")} />;
    return <RoleChooser onSelect={setLoginScreen} />;
  }

  const role = profile?.role || "customer";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT }}>
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: C.panel, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Crest size={30} />
          <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.ink }}>Celebrity's Park-1</div>
          <Badge text={`${role} portal`} color={C.goldLt} />
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center", minWidth: 0, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "min(52vw, 320px)" }}>
              {session.user.email || session.user.phone}
            </span>
            <Button kind="ghostLight" size="sm" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(20px, 4vw, 32px) clamp(14px, 4vw, 20px) 60px" }}>
        {role === "admin" && <Admin />}
        {role === "agent" && (profile?.agent_id
          ? <AgentPortal agentId={profile.agent_id} />
          : <NotLinked kind="agent" error={claimError} />)}
        {role === "customer" && (profile?.customer_id
          ? <CustomerPortal customerId={profile.customer_id} />
          : <NotLinked kind="customer" error={claimError} />)}
      </div>
    </div>
  );
}

function NotLinked({ kind, error }) {
  return (
    <div className="cip-card" style={{ background: C.panel, border: `1px solid ${C.line}`, borderTop: `3px solid ${C.goldLt}`, borderRadius: 0, padding: "clamp(20px, 5vw, 32px)", maxWidth: 560 }}>
      <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, color: C.ink, margin: "0 0 8px" }}>Almost there</h2>
      <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.6 }}>
        {error
          ? error
          : <>Your login isn't linked to a {kind} record yet. The admin needs to give you a fresh invite code, or connect your account to your {kind} profile.</>}
      </p>
    </div>
  );
}
