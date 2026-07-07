import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { C, Crest, Button } from "./ui";
import Login from "./Login";
import ResetPassword from "./ResetPassword";
import Admin from "./Admin";
import { AgentPortal, CustomerPortal } from "./Portals";

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); setReady(true); return; }
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(data);
      setReady(true);
    })();
  }, [session]);

  if (!ready) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: C.bg, color: C.muted, fontFamily: "'Jost',sans-serif" }}>Loading…</div>;
  if (recovery) return <ResetPassword onDone={() => setRecovery(false)} />;
  if (!session) return <Login />;

  const role = profile?.role || "customer";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Jost',sans-serif" }}>
      <div style={{ background: `linear-gradient(90deg,${C.navy},${C.navy2})`, borderBottom: `3px solid ${C.gold}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Crest size={30} />
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 600, color: "#F7F4EC" }}>Celebrity's Park-1</div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: C.goldLt, textTransform: "uppercase" }}>{role} portal</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "rgba(247,244,236,.7)" }}>{session.user.email}</span>
            <Button kind="ghost" onClick={() => supabase.auth.signOut()}>Sign out</Button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
        {role === "admin" && <Admin />}
        {role === "agent" && (profile?.agent_id
          ? <AgentPortal agentId={profile.agent_id} />
          : <NotLinked kind="agent" />)}
        {role === "customer" && (profile?.customer_id
          ? <CustomerPortal customerId={profile.customer_id} />
          : <NotLinked kind="customer" />)}
      </div>
    </div>
  );
}

function NotLinked({ kind }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 28, maxWidth: 560 }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond',serif", color: C.ink, margin: "0 0 8px" }}>Almost there</h2>
      <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.6 }}>
        Your login isn't linked to a {kind} record yet. The admin needs to connect your account
        to your {kind} profile so your data appears here.
      </p>
    </div>
  );
}
