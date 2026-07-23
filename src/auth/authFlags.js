// Transient flags carried across an OTP verification, since verifying flips
// `session` truthy immediately (via Supabase's global auth listener) and
// App.jsx's top-level routing reacts to that on the very next render --
// unmounting whatever login-flow component triggered the OTP before it can
// show its own next step. Storing intent here (sessionStorage survives that
// same-tab transition) lets App.jsx itself gate what renders next, instead
// of racing the component tree that's about to disappear.

const CODE_KEY = "cip_pending_access_code";
const PASSWORD_KEY = "cip_needs_password_setup";

export function storePendingCode(code) {
  sessionStorage.setItem(CODE_KEY, code);
}

export function peekPendingCode() {
  return sessionStorage.getItem(CODE_KEY);
}

export function clearPendingCode() {
  sessionStorage.removeItem(CODE_KEY);
}

export function flagPasswordSetup() {
  sessionStorage.setItem(PASSWORD_KEY, "1");
}

export function peekPasswordSetupFlag() {
  return sessionStorage.getItem(PASSWORD_KEY) === "1";
}

export function clearPasswordSetupFlag() {
  sessionStorage.removeItem(PASSWORD_KEY);
}
