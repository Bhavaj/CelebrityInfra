import React, { useState } from "react";
import { supabase } from "../supabase";
import { Button } from "../ui";
import AuthShell from "./AuthShell";
import EmailPasswordForm from "./EmailPasswordForm";
import CreateAccountFlow from "./CreateAccountFlow";
import { Divider, BackButton, TabToggle } from "./shared";

export default function ClientLogin({ onBack }) {
  const [tab, setTab] = useState("signin"); // signin | create

  async function google() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/portal/" },
    });
  }

  return (
    <AuthShell eyebrow="Client" title={tab === "signin" ? "Sign in" : "Create account"} subtitle="View your plot & payments">
      <TabToggle value={tab} onChange={setTab} options={[
        { value: "signin", label: "Sign in" },
        { value: "create", label: "Create account" },
      ]} />
      {tab === "signin" ? (
        <>
          <Button onClick={google}>Continue with Google</Button>
          <Divider />
          <EmailPasswordForm />
        </>
      ) : (
        <CreateAccountFlow role="customer" />
      )}
      <BackButton onClick={onBack} />
    </AuthShell>
  );
}
