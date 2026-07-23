import React from "react";
import { supabase } from "../supabase";
import { Button } from "../ui";
import AuthShell from "./AuthShell";
import EmailPasswordForm from "./EmailPasswordForm";
import { Divider, BackButton } from "./shared";

export default function AdminLogin({ onBack }) {
  async function google() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/portal/" },
    });
  }

  return (
    <AuthShell eyebrow="Admin" title="Sign in" subtitle="Celebrity Infra management console">
      <Button onClick={google}>Continue with Google</Button>
      <Divider />
      <EmailPasswordForm />
      <BackButton onClick={onBack} />
    </AuthShell>
  );
}
