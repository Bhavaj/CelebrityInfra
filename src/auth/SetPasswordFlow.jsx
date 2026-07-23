import React, { useEffect } from "react";
import EmailOtpForm from "./EmailOtpForm";
import { flagPasswordSetup } from "./authFlags";

// Verifies email ownership via OTP, then flags that a password still needs
// to be set. App.jsx's top-level gate is what actually renders the
// "set your password" step once the session exists — see authFlags.js for
// why this can't just be a local "next step" inside this component.
export default function SetPasswordFlow({ helperText }) {
  useEffect(() => { flagPasswordSetup(); }, []);
  return <EmailOtpForm helperText={helperText || "Verify your email to set a password."} />;
}
