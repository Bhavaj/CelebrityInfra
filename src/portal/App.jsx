import React, { Suspense, lazy, useEffect, useState } from "react";
import { supabase } from "../shared/supabase.js";
import { C, FONT, DISPLAY, WORDMARK, LABEL, R, Crest, Button, Icon, Loading, useIsMobile } from "./ui";
import RoleChooser from "./auth/RoleChooser";
import AdminLogin from "./auth/AdminLogin";
import AgentLogin from "./auth/AgentLogin";
import ClientLogin from "./auth/ClientLogin";
import AuthShell from "./auth/AuthShell";
import NewPasswordForm from "./auth/NewPasswordForm";
import { peekPendingCode, clearPendingCode, peekPasswordSetupFlag, clearPasswordSetupFlag } from "./auth/authFlags";
const Admin = lazy(() => import("./Admin"));
const AgentPortal = lazy(() => import("./Portals").then((m) => ({ default: m.AgentPortal })));
const CustomerPortal = lazy(() => import("./Portals").then((m) => ({ default: m.CustomerPortal })));

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

  // Keyed on the user id, not the whole `session` object: Supabase fires
  // onAuthStateChange (and replaces the session object) on every silent
  // token refresh, including the one that happens whenever the browser tab
  // regains focus. Depending on the full session object made this effect
  // re-run — and every admin/portal tab reset with it — just from switching
  // back to the tab, with the same user still signed in the whole time.
  const userId = session?.user?.id;
  useEffect(() => {
    if (!session) { setProfile(null); setReady(true); return; }
    (async () => {
      setReady(false);
      let { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();

      if (!data) {
        const pending = peekPendingCode();
        if (pending) {
          const { error } = await supabase.rpc("claim_access_code", { p_code: pending });
          if (error) {
            // Leave the pending code in sessionStorage on failure (instead of
            // clearing it unconditionally) so a transient error — the RPC
            // used to fail here every time on an ambiguous-column bug —
            // doesn't strand the code; a refresh retries the same claim
            // automatically instead of silently losing it.
            setClaimError(error.message);
          } else {
            clearPendingCode();
            setClaimError("");
            ({ data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single());
          }
        }
      }

      setProfile(data);
      setReady(true);
    })();
  }, [userId]);

  function signOut() {
    supabase.auth.signOut();
    setLoginScreen("chooser");
    setClaimError("");
    setNeedsPassword(false);
  }

  if (!ready) return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: C.bg, fontFamily: FONT }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <Crest size={56} />
        <Loading label="Opening your portal" />
      </div>
    </div>
  );

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

  const roleLabel = hasAccount ? { admin: "Admin", agent: "Agent", customer: "Client" }[role] || role : "No account";

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, fontFamily: FONT }}>
      <div className="cip-topbar cip-in-fade">
        <div className="cip-topbar-inner">
          <a href="/" aria-label="Back to celebrityinfra.in" style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <Crest size={mobile ? 34 : 38} />
            <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <span style={{ fontFamily: WORDMARK, fontSize: mobile ? 14 : 15.5, fontWeight: 600, letterSpacing: "0.2em", lineHeight: 1, color: C.ink }}>CELEBRITY</span>
              {!mobile && <span style={{ ...LABEL, fontSize: 9, letterSpacing: "0.28em", color: C.gold }}>Park‑1 Portal</span>}
            </span>
          </a>
          <span aria-hidden="true" style={{ width: 1, height: 26, background: C.lineStrong, flex: "none" }} />
          <span style={{ ...LABEL, color: hasAccount ? C.muted : C.red, letterSpacing: "0.16em", whiteSpace: "nowrap" }}>{roleLabel}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
            {!mobile && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, color: C.muted, minWidth: 0 }}>
                <Icon name="account_circle" size={20} style={{ color: C.faint, flex: "none" }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "min(40vw, 280px)" }}>
                  {session.user.email || session.user.phone}
                </span>
              </span>
            )}
            <Button kind="ghostLight" size="sm" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: role === "admin" ? 1720 : 1160, margin: "0 auto", padding: "clamp(24px, 4vw, 48px) max(clamp(16px, 3vw, 40px), env(safe-area-inset-right)) calc(72px + env(safe-area-inset-bottom)) max(clamp(16px, 3vw, 40px), env(safe-area-inset-left))" }}>
        <Suspense fallback={<Loading label="Opening your portal" />}>
        {!hasAccount && <NoAccount error={claimError} />}
        {hasAccount && role === "admin" && <Admin />}
        {hasAccount && role === "agent" && (profile.agent_id
          ? <AgentPortal agentId={profile.agent_id} />
          : <NotLinked kind="agent" error={claimError} />)}
        {hasAccount && role === "customer" && (profile.customer_id
          ? <CustomerPortal customerId={profile.customer_id} />
          : <NotLinked kind="customer" error={claimError} />)}
        </Suspense>
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
    <div className="cip-panel cip-in" style={{ maxWidth: 600, margin: "clamp(8px, 6vh, 64px) auto 0", padding: "clamp(24px, 5vw, 40px)" }}>
      <div style={{ ...LABEL, color: C.red, marginBottom: 14 }}>No account</div>
      <h2 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: "clamp(30px, 5vw, 38px)", lineHeight: 1.1, color: C.ink, margin: "0 0 14px" }}>You don't have an account yet</h2>
      <p style={{ color: C.muted, fontSize: 15.5, lineHeight: 1.65 }}>
        {error || <>This login isn't linked to any account. Go back and use "Create account" with the invite code your admin gave you — otherwise, ask an admin for a code.</>}
      </p>
    </div>
  );
}

function NotLinked({ kind, error }) {
  return (
    <div className="cip-panel cip-in" style={{ maxWidth: 600, margin: "clamp(8px, 6vh, 64px) auto 0", padding: "clamp(24px, 5vw, 40px)" }}>
      <div style={{ ...LABEL, color: C.gold, marginBottom: 14 }}>Account not linked</div>
      <h2 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: "clamp(30px, 5vw, 38px)", lineHeight: 1.1, color: C.ink, margin: "0 0 14px" }}>Almost there</h2>
      <p style={{ color: C.muted, fontSize: 15.5, lineHeight: 1.65 }}>
        {error
          ? error
          : <>Your login isn't linked to a {kind} record yet. Ask the admin for a fresh invite code and use "Create account" to claim it.</>}
      </p>
    </div>
  );
}
