import "../shared/tokens.css";
import "./styles.css";
import { initEnquire } from "./enquire.js";

const root = document.documentElement;
root.classList.add("js");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  if (window.__lenis) window.__lenis.scrollTo(id === "#top" ? 0 : target, { offset: id === "#top" ? 0 : -8, duration: 1.6 });
  else (id === "#top" ? scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }) : target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }));
  if (id !== "#top") history.replaceState(null, "", id);
});

/* ---------- reveals ---------- */
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}), { threshold: 0, rootMargin: "0px 0px -8% 0px" });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

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
