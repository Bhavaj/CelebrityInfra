import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { C, FONT, MONO, R, Crest, Button, Badge, useIsMobile } from "./ui";
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
  const mobile = useIsMobile(480);
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

  const hasAccount = !!profile;
  const role = profile?.role || "customer";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT }}>
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(23,27,26,.85)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: `1px solid ${C.line}`, boxShadow: "0 1px 0 rgba(201,162,39,.15)", paddingTop: "env(safe-area-inset-top)" }} className="cip-in-fade">
        <div style={{ padding: "14px clamp(16px, 3vw, 32px)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Crest size={42} />
          {!mobile && <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.ink }}>Celebrity's Park-1</div>}
          <Badge text={hasAccount ? `${role} portal` : "no account"} color={hasAccount ? C.goldLt : C.red} />
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center", minWidth: 0, flexWrap: "wrap" }}>
            {!mobile && (
              <span style={{ fontSize: 13, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "min(52vw, 320px)" }}>
                {session.user.email || session.user.phone}
              </span>
            )}
            <Button kind="ghostLight" size="sm" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: role === "admin" ? "none" : 1200, margin: "0 auto", padding: `clamp(20px, 3vw, 32px) clamp(16px, 3vw, 32px) 60px` }}>
        {!hasAccount && <NoAccount error={claimError} />}
        {hasAccount && role === "admin" && <Admin />}
        {hasAccount && role === "agent" && (profile.agent_id
          ? <AgentPortal agentId={profile.agent_id} />
          : <NotLinked kind="agent" error={claimError} />)}
        {hasAccount && role === "customer" && (profile.customer_id
          ? <CustomerPortal customerId={profile.customer_id} />
          : <NotLinked kind="customer" error={claimError} />)}
      </div>
    </div>
  );
}

// Shown when Supabase auth succeeded but no `profiles` row exists at all —
// i.e. nobody has ever given this login a role. Distinct from NotLinked,
// which is for logins an admin already assigned a role to but hasn't
// pointed at a specific agent/customer record yet.
function NoAccount({ error }) {
  return (
    <div className="cip-card" style={{ background: C.panel, border: `1px solid ${C.line}`, borderTop: `3px solid ${C.red}`, borderRadius: R.lg, padding: "clamp(20px, 5vw, 32px)", maxWidth: 560 }}>
      <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, color: C.ink, margin: "0 0 8px" }}>You don't have an account yet</h2>
      <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.6 }}>
        {error || <>This login isn't linked to any account. If you were given an invite code, use it on the sign-up screen — otherwise, ask an admin to grant you access.</>}
      </p>
    </div>
  );
}

function NotLinked({ kind, error }) {
  return (
    <div className="cip-card" style={{ background: C.panel, border: `1px solid ${C.line}`, borderTop: `3px solid ${C.goldLt}`, borderRadius: R.lg, padding: "clamp(20px, 5vw, 32px)", maxWidth: 560 }}>
      <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, color: C.ink, margin: "0 0 8px" }}>Almost there</h2>
      <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.6 }}>
        {error
          ? error
          : <>Your login isn't linked to a {kind} record yet. The admin needs to give you a fresh invite code, or connect your account to your {kind} profile.</>}
      </p>
    </div>
  );
}
