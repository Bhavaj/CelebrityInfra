import "../shared/tokens.css";
import "./styles.css";
import { initEnquire } from "./enquire.js";

const root = document.documentElement;
root.classList.add("js");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- scroll position on reload / deep links ---------- */
// The page only reaches its full height once motion.js has pinned its sections, which is after the browser
// would restore a reload's scroll position (it gives up when the old position is out of range) or jump to a
// #fragment. So both are done here, once the layout is final: a reload returns to where it was, a deep link
// lands where that section's copy is assembled.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
const SCROLL_KEY = "ci-home-scroll";
addEventListener("pagehide", () => {
  try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ y: Math.round(scrollY), w: innerWidth })); } catch { /* storage unavailable */ }
});
function restoreScroll() {
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY)); sessionStorage.removeItem(SCROLL_KEY); } catch { /* storage unavailable */ }
  const navType = performance.getEntriesByType?.("navigation")[0]?.type;
  let y = null;
  if (saved && navType !== "navigate" && saved.w === innerWidth) y = saved.y;
  else if (location.hash.length > 1) {
    const el = document.querySelector(location.hash);
    y = window.__motion?.restY(location.hash) ?? (el ? el.getBoundingClientRect().top + scrollY - document.getElementById("nav").offsetHeight : null);
  }
  if (y == null) return;
  const apply = () => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : scrollTo({ top: y, behavior: "instant" }));
  apply();
  // the browser's own jump to a #fragment can land after this; take the position back once it has
  if (document.readyState !== "complete") addEventListener("load", () => requestAnimationFrame(apply), { once: true });
}

/* ---------- scroll choreography (motion.js: GSAP + SplitText, lazy-loaded, independent of WebGL) ---------- */
// The hero title and facts rail wait (hidden) for motion.js to play their intro. If it hasn't taken over
// within 2.5 s (slow network, script error), `mo-wait` is dropped and the CSS intro plays instead, so the
// copy is never left hidden. Everything else is visible until motion.js sets its own start states.
if (!reduceMotion && !window.__noMotion) {
  root.classList.add("mo-wait");
  const fallback = setTimeout(() => root.classList.remove("mo-wait"), 2500);
  import("./motion.js")
    .then((m) => m.initMotion({ introExpired: () => !root.classList.contains("mo-wait"), cancelFallback: () => clearTimeout(fallback) }))
    .catch((err) => { console.warn("motion unavailable", err); root.classList.remove("mo-wait"); })
    .finally(restoreScroll);
} else if (document.readyState === "complete") restoreScroll();
else addEventListener("load", restoreScroll, { once: true });

/* ---------- nav: solid after leaving the hero (class toggle only on change) ---------- */
const nav = document.getElementById("nav");
let navSolid = false;
const setSolid = (v) => { if (v !== navSolid) { navSolid = v; nav.classList.toggle("solid", v); } };
addEventListener("scroll", () => setSolid(scrollY > 40), { passive: true });
setSolid(scrollY > 40);

/* ---------- mobile menu ---------- */
const menu = document.getElementById("menu");
const menuBtn = document.getElementById("menuBtn");
function setMenu(open) {
  if (open) {
    menu.hidden = false;
    requestAnimationFrame(() => document.body.classList.add("menu-open"));
    menu.querySelector("a")?.focus({ preventScroll: true });
  } else {
    document.body.classList.remove("menu-open");
    setTimeout(() => { if (!document.body.classList.contains("menu-open")) menu.hidden = true; }, 400);
  }
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  window.__lenis?.[open ? "stop" : "start"]();
}
menuBtn.addEventListener("click", () => setMenu(menuBtn.getAttribute("aria-expanded") !== "true"));
menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") { setMenu(false); menuBtn.focus(); }
});
matchMedia("(min-width: 1081px)").addEventListener("change", (e) => e.matches && setMenu(false));

/* ---------- in-page links: smooth via Lenis once loaded, native otherwise ---------- */
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute("href");
  const target = id === "#top" ? document.body : document.querySelector(id);
  if (!target) return;
  e.preventDefault();
  // pinned / scrubbed sections: land where the section's copy is fully assembled (motion.js knows where)
  const rest = id === "#top" ? 0 : window.__motion?.restY(id);
  if (window.__lenis) window.__lenis.scrollTo(rest ?? target, { offset: rest != null ? 0 : -8, duration: 1.6 });
  else if (rest != null) scrollTo({ top: rest, behavior: reduceMotion ? "auto" : "smooth" });
  else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  if (id !== "#top") history.replaceState(null, "", id);
});

/* ---------- active section → body[data-scene] (drives the canvas scrims) + nav state ---------- */
const navLinks = [...document.querySelectorAll(".nav-links a")];
const sceneIo = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  const name = e.target.dataset.scene;
  if (document.body.dataset.scene !== name) document.body.dataset.scene = name;
  const id = e.target.id ? "#" + e.target.id : "";
  navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === id));
}), { rootMargin: "-48% 0px -48% 0px" });
document.querySelectorAll("[data-scene]").forEach((el) => el !== document.body && sceneIo.observe(el));

/* ---------- enquiry form (Supabase is imported lazily) ---------- */
initEnquire();

/* ---------- 3D stage: loaded after first paint, never in the critical path ---------- */
function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch { return false; }
}
function startScene() {
  if (!hasWebGL()) { document.body.classList.add("no-webgl"); return; }
  import("./scene/stage.js")
    .then((m) => m.createStage({ canvas: document.getElementById("scene"), reduceMotion }))
    .catch((err) => { console.warn("3D stage unavailable", err); document.body.classList.add("no-webgl"); });
}
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
if (document.readyState === "complete") idle(startScene, { timeout: 1200 });
else addEventListener("load", () => idle(startScene, { timeout: 1200 }), { once: true });
