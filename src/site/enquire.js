// Enquiry form → Supabase `leads`. The Supabase client is only fetched when the
// form gets close to the viewport (or is focused), keeping it off the critical path.
let clientPromise = null;
const loadClient = () => (clientPromise ||= import("../shared/supabase.js").then((m) => m.supabase));

export function initEnquire() {
  const form = document.getElementById("enquireForm");
  if (!form) return;
  const success = document.getElementById("enqSuccess");
  const errorEl = document.getElementById("enqError");
  const submit = form.querySelector('button[type="submit"]');
  const name = document.getElementById("enqName");
  const phone = document.getElementById("enqPhone");
  const email = document.getElementById("enqEmail");
  const date = document.getElementById("enqDate");

  const warm = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { loadClient(); warm.disconnect(); }
  }, { rootMargin: "600px 0px" });
  warm.observe(form);
  form.addEventListener("focusin", loadClient, { once: true });

  const check = (input, ok) => { input.setAttribute("aria-invalid", ok ? "false" : "true"); return ok; };
  [name, phone].forEach((el) => el.addEventListener("input", () => el.removeAttribute("aria-invalid")));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const okName = check(name, name.value.trim().length > 0);
    const okPhone = check(phone, phone.value.replace(/\D/g, "").length >= 6);
    if (!okName || !okPhone) { (okName ? phone : name).focus(); return; }

    submit.disabled = true;
    submit.textContent = "Sending…";
    let error = null;
    try {
      const supabase = await loadClient();
      ({ error } = await supabase.from("leads").insert({
        name: name.value.trim(),
        phone: phone.value.trim(),
        email: email.value.trim() || null,
        preferred_date: date.value.trim() || null,
      }));
    } catch (err) { error = err; }
    submit.disabled = false;
    submit.textContent = "Request site visit";
    if (error) {
      console.error(error);
      errorEl.hidden = false;
      return;
    }
    form.hidden = true;
    success.hidden = false;
    success.focus({ preventScroll: true });
  });
}
