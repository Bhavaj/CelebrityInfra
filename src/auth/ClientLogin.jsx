import React, { useState } from "react";
import AuthShell from "./AuthShell";
import EmailPasswordForm from "./EmailPasswordForm";
import CreateAccountFlow from "./CreateAccountFlow";
import { BackButton, TabToggle, Hint } from "./shared";

export default function ClientLogin({ onBack }) {
  const [tab, setTab] = useState("signin"); // signin | create

  return (
    <AuthShell eyebrow="Client" title={tab === "signin" ? "Sign in" : "Create account"} subtitle="View your plot & payments">
      <TabToggle value={tab} onChange={setTab} options={[
        { value: "signin", label: "Sign in" },
        { value: "create", label: "First time? Create account" },
      ]} />
      {tab === "signin" ? (
        <>
          <Hint>Sign in with the email and password you set when you created your account.</Hint>
          <EmailPasswordForm />
        </>
      ) : (
        <CreateAccountFlow role="customer" />
      )}
      <BackButton onClick={onBack} />
    </AuthShell>
  );
}
