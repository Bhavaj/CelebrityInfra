import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { shotRanges, measureSections, sceneOptions } from "./scene/shots.js";

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

// Scroll choreography for the homepage copy, keyed to the 3D flyover.
//
// Every scrubbed range below comes from the same scroll keys the camera uses (scene/shots.js → shotRanges):
// copy assembles while the camera travels in to its shot (a0 → a1), holds while the camera holds (h0 → h1)
// and disassembles while the camera leaves (l0 → l1). Three desktop sections are pinned (offer, venture, why);
// their pin spacing is part of the section heights, so the camera keys stretch with them.
//
// Branches (gsap.matchMedia): desktop (≥ 1081 px) gets the full 3D choreography; tablets and phones keep their
// stacked layouts with light, element-based reveals (h2 line masks, counters, the chairman's quote). Reduced
// motion never loads this module (main.js), and every branch is a context, so leaving it reverts all styles.
// Only transform and opacity animate. Arrive and leave tweens never touch the same property of the same element
// (arrive works on split lines/words/items, leave on their containers), so reverse scrubs are always clean.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const SCRUB = 0.6;

/* ---------- camera-synced ranges (re-measured on every refresh, after pins have laid out) ---------- */
let R = null;
ScrollTrigger.addEventListener("refreshInit", () => { R = null; });
function ranges() {
  if (!R) {
    const sec = measureSections();
    R = shotRanges(sec, innerHeight, sceneOptions());
    R.sec = sec;
  }
  return R;
}
// ScrollTrigger config for an absolute scroll range; `from`/`to` are (ranges, viewportHeight) => y.
// Start/end are re-evaluated on every refresh anyway. `stf` additionally re-records function-based tween
// values (viewport-sized distances); it is only used on unstaggered tweens: invalidating a staggered fromTo
// drops the start state of every item the playhead has not reached yet.
const st = (from, to, extra = {}) => ({
  start: () => Math.round(from(ranges(), innerHeight)),
  end: () => Math.max(Math.round(from(ranges(), innerHeight)) + 1, Math.round(to(ranges(), innerHeight))),
  scrub: SCRUB, ...extra,
});
const stf = (from, to, extra = {}) => st(from, to, { invalidateOnRefresh: true, ...extra });
// untransformed document box of an element (offset chain, so in-flight transforms never skew a measurement)
function docBox(el) {
  let x = 0, y = 0;
  for (let e = el; e; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}
// element-based range (tablet/phone): from when the element's top enters near the bottom of the screen
const enter = (el, a = 0.92, b = 0.62) => [() => docBox(el).y - innerHeight * a, () => docBox(el).y - innerHeight * b];

/* ---------- split helpers ---------- */
// h2 line-mask reveal: lines rise out of their own masks. autoSplit re-splits on resize (lines change).
// (headings keep aria "auto": aria-label on the heading, split lines hidden. Paragraphs pass aria "none":
// aria-label is not reliable on <p>, and their line wrappers carry the real text anyway.)
function lineReveal(el, from, to, vars = {}, aria = "auto") {
  return SplitText.create(el, {
    type: "lines", linesClass: "ln", mask: "lines", autoSplit: true, aria,
    onSplit: (self) => gsap.fromTo(self.lines, { yPercent: 112 }, { yPercent: 0, ease: "power2.out", stagger: 0.14, ...vars, scrollTrigger: st(from, to) }),
  });
}
// price odometer: each digit becomes a clipped column of numerals that rolls (scrubbed) to its value.
// Screen readers get the plain price from a visually hidden copy.
function odometer(el) {
  const text = el.textContent.trim();
  const digits = [...text].filter((c) => /\d/.test(c)).length;
  const sr = document.createElement("span"); sr.className = "sr-only"; sr.textContent = text;
  const vis = document.createElement("span"); vis.className = "odo"; vis.setAttribute("aria-hidden", "true");
  const strips = [], ends = [];
  let j = 0;
  for (const ch of text) {
    const cell = document.createElement("span");
    if (/\d/.test(ch)) {
      const loops = 1 + Math.floor((j / digits) * 2.5); // rightmost digits spin furthest
      const n = loops * 10 + Number(ch) + 1;
      const strip = document.createElement("span"); strip.className = "odo-s";
      for (let k = 0; k < n; k++) { const d = document.createElement("span"); d.textContent = k % 10; strip.appendChild(d); }
      cell.appendChild(strip); strips.push(strip); ends.push(-100 * (n - 1) / n); j++;
    } else cell.textContent = ch;
    vis.appendChild(cell);
  }
  el.textContent = "";
  el.append(sr, vis);
  return { strips, ends, revert: () => { el.textContent = text; } };
}
function countUp(els) {
  const tl = gsap.timeline();
  els.forEach((el) => {
    const to = Number(el.dataset.to), dec = Number(el.dataset.dec || 0), o = { v: 0 };
    el.textContent = (0).toFixed(dec);
    tl.to(o, { v: to, duration: 1.6, ease: "power2.out", onUpdate: () => { el.textContent = o.v.toFixed(dec); } }, 0);
  });
  return tl;
}

let deskActive = false;

export async function initMotion({ introExpired, cancelFallback } = {}) {
  // split after the web fonts are in, so lines and chars are measured with the real metrics
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))]).catch(() => {});
  cancelFallback?.();

  /* ---------- hero intro (load, all sizes) ---------- */
  const h1 = $(".hero-title"), script = $(".t-script"), park = $(".t-park"), num = $(".t-num"), numI = $(".t-num-i");
  const facts = $(".hero .facts");
  // the h1 keeps one accessible name; its split parts are hidden from assistive tech
  h1.setAttribute("aria-label", "Celebrity's Park 1");
  num.setAttribute("aria-hidden", "true");
  const parkSplit = SplitText.create(park, { type: "chars", charsClass: "ch", mask: "chars", aria: "hidden" });
  const scriptSplit = SplitText.create(script, { type: "words", wordsClass: "wd", aria: "hidden" });
  const factBits = $$("dt, dd", facts);
  // the CSS intro must not own anything GSAP animates
  h1.classList.remove("intro", "i2");
  facts.classList.remove("intro", "i5");
  // the char masks only clip while the letters rise; after that they would crop the title's glow into boxes
  const unmask = () => { gsap.set(parkSplit.masks, { overflow: "visible" }); h1.classList.remove("is-rising"); };
  if (!introExpired?.()) {
    h1.classList.add("is-rising");
    const tl = gsap.timeline({ delay: 0.12, defaults: { ease: "expo.out" } });
    tl.from(scriptSplit.words, { yPercent: 70, rotateX: -60, opacity: 0, transformPerspective: 700, transformOrigin: "50% 100%", duration: 1.3, stagger: 0.08 }, 0)
      .from(parkSplit.chars, { yPercent: 118, rotateX: -80, transformPerspective: 900, transformOrigin: "50% 100%", duration: 1.6, stagger: 0.075 }, 0.12)
      .from(numI, { yPercent: 50, scale: 0.6, opacity: 0, duration: 1.5 }, 0.5)
      .from(factBits, { y: 22, opacity: 0, duration: 1.1, stagger: 0.05, ease: "power3.out" }, 0.7)
      .add(countUp($$(".num", facts)), 0.75)
      .call(unmask, null, 0.12 + 0.075 * (parkSplit.chars.length - 1) + 1.6)
      .eventCallback("onComplete", () => gsap.set([...scriptSplit.words, ...parkSplit.chars, numI, ...factBits], { clearProps: "transform,opacity" }));
  } else unmask();
  root.classList.remove("mo-wait");

  /* ---------- scroll choreography ---------- */
  const mm = gsap.matchMedia();
  const ok = "(prefers-reduced-motion: no-preference)";
  mm.add({ desk: `(min-width: 1081px) and ${ok}`, small: `(max-width: 1080px) and ${ok}` }, (ctx) => {
    const cleanups = [];
    if (ctx.conditions.desk) desktop(cleanups, { parkSplit });
    else if (ctx.conditions.small) small(cleanups);
    return () => cleanups.forEach((f) => f());
  });

  /* ---------- footer wordmark: chars rise once (desktop) ---------- */
  mm.add(`(min-width: 1081px) and ${ok}`, () => {
    const f = SplitText.create(".f-mark", { type: "chars", charsClass: "fch", mask: "chars", aria: "none" });
    gsap.from(f.chars, { yPercent: 115, duration: 1.2, ease: "expo.out", stagger: 0.06, scrollTrigger: { trigger: ".footer", start: "top 94%", once: true } });
  });

  ScrollTrigger.refresh();
}

/* Where an in-page link should land so the section's copy is fully assembled (desktop pinned layouts). */
window.__motion = {
  ranges, // camera-synced scroll ranges (used by scripts/ QA tooling)
  restY(id) {
    if (!deskActive) return null;
    const r = ranges(), H = innerHeight;
    switch (id) {
      case "#offer": return Math.round(r.offer.h1 - H * 0.06);
      case "#venture": return Math.round(r.venture.h0 + (r.venture.h1 - r.venture.h0) * 0.6);
      case "#why": return Math.round(r.sec.why.top);
      case "#location": return Math.round(Math.max(r.location.a1 + H * 0.3, docBox($(".loc-card")).y - 88));
      default: return null;
    }
  },
};

/* =====================================================================================================
   DESKTOP
   ===================================================================================================== */
function desktop(cleanups, { parkSplit }) {
  deskActive = true;
  root.classList.add("m-desk");
  cleanups.push(() => { deskActive = false; root.classList.remove("m-desk"); });

  // Pins first (refreshPriority: refreshed before everything else, so every range below sees their spacing).
  const pin = (sel, len) => ScrollTrigger.create({ trigger: sel, start: "top top", end: () => "+=" + Math.round(innerHeight * len), pin: true, pinSpacing: true, anticipatePin: 1, refreshPriority: 1, invalidateOnRefresh: true });
  pin(".offer > .wrap", 1.0);
  pin(".venture > .wrap", 1.2);
  pin(".why > .wrap", 3.0);

  /* ----- HERO: the title tips back into the land as the camera dives; the gold 1 flies to the plot ----- */
  {
    const dive = (r) => r.offer.a0 + (r.offer.a1 - r.offer.a0) * 0.72; // the plot's label appears about here
    // PARK: the word stays roughly where it is (scroll-compensated) and lies back into the land, hinged on its
    // baseline, each letter lifting away at its own speed; it has faded before it could reach the nav.
    const T = (r, h) => h * 0.44;
    gsap.fromTo(parkSplit.masks, { y: 0 }, { y: (i) => innerHeight * 0.44 * (0.9 - i * 0.16), ease: "none", scrollTrigger: stf(() => 0, T) });
    gsap.timeline({ scrollTrigger: st(() => 0, T) })
      .fromTo(parkSplit.masks, { rotateX: 0, transformPerspective: 900, transformOrigin: "50% 100%" }, { rotateX: 72, ease: "power1.in", stagger: 0.06, duration: 0.82 }, 0)
      .fromTo(parkSplit.masks, { opacity: 1 }, { opacity: 0, ease: "power1.in", stagger: 0.06, duration: 0.4 }, 0.42);
    gsap.timeline({ scrollTrigger: stf(() => 0, (r, h) => h * 0.3) })
      .fromTo(".t-script", { y: 0 }, { y: () => innerHeight * 0.3 * 0.55, ease: "none", duration: 1 }, 0)
      .fromTo(".t-script", { rotateX: 0, opacity: 1, transformPerspective: 800, transformOrigin: "0% 100%" }, { rotateX: 60, opacity: 0, ease: "power1.in", duration: 1 }, 0);
    // the "1": scroll-compensated flight from the title to the plot label's dot, shrinking into it
    const num = $(".t-num");
    const target = () => window.__stage?.pinAt?.("plot", "offer") || { x: innerWidth * 0.68, y: innerHeight * 0.45 };
    const c = () => { const b = docBox(num); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; };
    gsap.fromTo(num, { x: 0, y: 0, scale: 1 }, {
      x: () => target().x - c().x, y: () => target().y - (c().y - dive(ranges())), scale: 0.16, ease: "power2.inOut",
      scrollTrigger: stf(() => 0, dive),
    });
    gsap.fromTo(num, { opacity: 1 }, { opacity: 0, ease: "power2.in", scrollTrigger: st((r) => dive(r) * 0.8, dive) });
    // tagline, date and CTA lift away; the facts rail drops out cell by cell
    // (the title holds its place, so the copy under it must clear out before it would scroll into it)
    gsap.timeline({ scrollTrigger: stf(() => 0, (r, h) => h * 0.16) })
      .fromTo(".hero-sub", { y: 0 }, { y: () => innerHeight * 0.16 * 1.25, ease: "none", duration: 1 }, 0)
      .fromTo(".hero-sub", { opacity: 1 }, { opacity: 0, ease: "power1.out", duration: 0.9 }, 0);
    gsap.fromTo(".hero .facts > div", { yPercent: 0, opacity: 1 }, { yPercent: 130, opacity: 0, ease: "power2.in", stagger: 0.12, scrollTrigger: st(() => 0, (r, h) => h * 0.34) });
    gsap.fromTo(".hero .facts", { opacity: 1 }, { opacity: 0, ease: "power1.in", scrollTrigger: st((r, h) => h * 0.12, (r, h) => h * 0.34) });
  }

  /* ----- OFFER (pinned 1 screen): ticket rises in, heading line-masks in, price rolls, perks one by one ----- */
  {
    const A = (r) => r.offer.a1 - r.offer.a0;
    gsap.fromTo(".offer .ticket", { opacity: 0, y: () => innerHeight * 0.1, rotateX: 12, transformPerspective: 1600, transformOrigin: "50% 100%" },
      { opacity: 1, y: 0, rotateX: 0, ease: "power2.out", scrollTrigger: stf((r) => r.offer.a0 + A(r) * 0.1, (r) => r.offer.a1 - A(r) * 0.05) });
    lineReveal("#offer-h", (r) => r.offer.a0 + A(r) * 0.35, (r) => r.offer.a1 + innerHeight * 0.02);
    const odo = odometer($(".price-amt"));
    cleanups.push(odo.revert);
    gsap.fromTo(odo.strips, { yPercent: 0 }, { yPercent: (i) => odo.ends[i], ease: "power3.out", stagger: 0.05, scrollTrigger: st((r, h) => r.offer.a1 - h * 0.25, (r, h) => r.offer.a1 + h * 0.18) });
    gsap.fromTo(".offer .price-note", { opacity: 0, y: 16 }, { opacity: 1, y: 0, ease: "power2.out", scrollTrigger: st((r, h) => r.offer.a1 + h * 0.02, (r, h) => r.offer.a1 + h * 0.22) });
    // the four perks land one after another across the hold
    const perks = $$(".offer .perks li");
    const seg = (r, h, i) => { const s0 = r.offer.a1 + h * 0.14, s1 = r.offer.h1 - h * 0.18, step = (s1 - s0) / perks.length; return [s0 + i * step, s0 + (i + 1.15) * step]; };
    perks.forEach((li, i) => gsap.fromTo(li, { opacity: 0, x: 56 }, { opacity: 1, x: 0, ease: "power2.out", scrollTrigger: st((r, h) => seg(r, h, i)[0], (r, h) => seg(r, h, i)[1]) }));
    // leave: the whole ticket tips away as the camera lifts off the plot
    // (on .ticket-wrap: the pinned element itself must never be animated, ScrollTrigger owns its transform)
    gsap.fromTo(".offer .ticket-wrap", { opacity: 1, y: 0, rotateX: 0, scale: 1, transformPerspective: 1600, transformOrigin: "50% 0%" },
      { opacity: 0, y: () => -innerHeight * 0.06, rotateX: 14, scale: 0.95, ease: "sine.in", scrollTrigger: stf((r) => r.offer.h1, (r, h) => r.offer.h1 + h * 0.34) });
  }

  /* ----- VENTURE (pinned 1.2 screens): words assemble from depth over the gate, then part like the gates ----- */
  {
    const h2 = $("#venture-h");
    const split = SplitText.create(h2, { type: "words", wordsClass: "vw" });
    const A = (r) => r.venture.a1 - r.venture.a0, Lv = (r) => r.venture.l1 - r.venture.l0;
    gsap.fromTo(split.words, { opacity: 0, scale: 1.4, rotateX: 30, yPercent: 30, transformPerspective: 800, transformOrigin: "50% 100%" },
      { opacity: 1, scale: 1, rotateX: 0, yPercent: 0, ease: "power3.out", stagger: { each: 0.06, from: "center" }, scrollTrigger: st((r) => r.venture.a0 + A(r) * 0.3, (r, h) => r.venture.a1 + h * 0.08) });
    lineReveal(".venture .lead", (r, h) => r.venture.a1 - h * 0.12, (r, h) => r.venture.a1 + h * 0.14, { stagger: 0.1 }, "none");
    // leave: as the camera drives through the gate the headline swings open from its centre, left and right
    const dx = (el) => el.offsetLeft + el.offsetWidth / 2 - (h2.offsetLeft + h2.offsetWidth / 2);
    gsap.fromTo(split.words, { x: 0, rotateY: 0 }, {
      x: (i, el) => Math.sign(dx(el) || 1) * (innerWidth * 0.28 + Math.abs(dx(el)) * 0.9),
      rotateY: (i, el) => Math.sign(dx(el) || 1) * 62, ease: "power2.in",
      scrollTrigger: stf((r) => r.venture.l0 + Lv(r) * 0.1, (r) => r.venture.l1 - Lv(r) * 0.04),
    });
    // the paragraph clears out first, before the gate grows into it
    gsap.fromTo(".venture .lead", { opacity: 1, y: 0 }, { opacity: 0, y: () => -innerHeight * 0.03, ease: "power1.in", scrollTrigger: stf((r) => r.venture.l0, (r) => r.venture.l0 + Lv(r) * 0.3) });
    gsap.fromTo(h2, { opacity: 1 }, { opacity: 0, ease: "power1.in", scrollTrigger: st((r) => r.venture.l0 + Lv(r) * 0.3, (r) => r.venture.l1 - Lv(r) * 0.02) });
  }

  /* ----- WHY (pinned 3 screens): heading recedes down the avenue; the reasons pass by as roadside signs ----- */
  {
    const top = (r) => r.sec.why.top;
    lineReveal("#why-h", (r, h) => top(r) - h * 0.78, (r, h) => top(r) - h * 0.12);
    gsap.fromTo(".why-head", { scale: 1, y: 0, opacity: 1, transformOrigin: "50% 100%" },
      { scale: 0.42, y: () => innerHeight * 0.16, opacity: 0, ease: "power1.in", scrollTrigger: stf((r, h) => top(r) + h * 0.1, (r, h) => top(r) + h * 0.62) });
    // One sign at a time, alternating sides: it grows out of the vanishing point (scale .35), settles beside
    // the road to be read, then slides outward off-screen as the next one comes up the avenue.
    $$(".why .points li").forEach((li, i) => {
      const side = i % 2 ? 1 : -1;
      const s0 = (r, h) => top(r) + h * (0.3 + i * 0.8), s1 = (r, h) => s0(r, h) + h * 1.15;
      gsap.timeline({ scrollTrigger: stf(s0, s1) })
        .fromTo(li, { xPercent: -50, yPercent: -50, x: () => side * innerWidth * 0.015, y: () => -innerHeight * 0.07, scale: 0.35, rotateY: side * 4, opacity: 0, transformPerspective: 1400 },
          { x: () => side * innerWidth * 0.24, y: () => innerHeight * 0.02, scale: 1, rotateY: side * -10, opacity: 1, ease: "power2.out", duration: 0.38 })
        .to(li, { x: () => side * innerWidth * 0.27, y: () => innerHeight * 0.035, scale: 1.04, ease: "none", duration: 0.34 })
        .to(li, { x: () => side * innerWidth * 0.8, y: () => innerHeight * 0.14, scale: 1.22, rotateY: side * -28, ease: "power2.in", duration: 0.28 })
        .to(li, { opacity: 0, ease: "power1.out", duration: 0.17 }, "<"); // gone before it reaches the screen edge
    });
  }

  /* ----- LOCATION: the heading rides the crane-up large and centred, then FLIPs into the mirrored card ----- */
  {
    const h2 = $("#loc-h");
    const A = (r) => r.location.a1 - r.location.a0;
    const f0 = (r) => r.location.a0 + A(r) * 0.04, f1 = (r, h) => r.location.a1 + h * 0.06, fm = (r) => f0(r) + (f1(r, innerHeight) - f0(r)) * 0.45;
    const S = 1.6;
    const c = () => { const b = docBox(h2); return { x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w }; };
    // width of the set text (the box is the card's full column; the lines are left-aligned inside it)
    const textW = () => {
      const rg = document.createRange(); rg.selectNodeContents(h2);
      return Math.min(h2.offsetWidth, rg.getBoundingClientRect().width / (gsap.getProperty(h2, "scaleX") || 1));
    };
    // translate that shows the heading's text centred at (screen centre, sy) when the page is scrolled to y
    const at = (y, sy) => { const b = c(); return { x: innerWidth / 2 - b.x - S * (textW() - b.w) / 2, y: sy - (b.y - y) }; };
    gsap.timeline({ scrollTrigger: stf(f0, f1, { scrub: true }) })
      .fromTo(h2, { x: () => at(f0(ranges()), innerHeight * 0.46).x, y: () => at(f0(ranges()), innerHeight * 0.46).y, scale: S, transformOrigin: "50% 50%" },
        { x: () => at(fm(ranges()), innerHeight * 0.46).x, y: () => at(fm(ranges()), innerHeight * 0.46).y, scale: S, ease: "none", duration: 0.45 })
      .to(h2, { x: 0, y: 0, scale: 1, ease: "power3.inOut", duration: 0.55 })
      .fromTo(h2, { opacity: 0 }, { opacity: 1, ease: "none", duration: 0.12 }, 0);
    gsap.fromTo(".loc-bg", { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, ease: "power2.out", scrollTrigger: st((r, h) => fm(r) + (f1(r, h) - fm(r)) * 0.35, f1) });
    // the details follow, each bullet drawing its gold rule
    const list = $(".location .dash");
    list.classList.add("drawn");
    const rules = $$("li", list).map((li) => { const s = document.createElement("span"); s.className = "dash-rule"; s.setAttribute("aria-hidden", "true"); li.prepend(s); return s; });
    cleanups.push(() => { rules.forEach((s) => s.remove()); list.classList.remove("drawn"); });
    const items = [$(".loc-place"), ...$$("li", list), $(".location .btn")];
    const i0 = (r, h) => r.location.a1 - h * 0.04, i1 = (r, h) => r.location.a1 + h * 0.28;
    gsap.fromTo(items, { opacity: 0, y: 22 }, { opacity: 1, y: 0, ease: "power2.out", stagger: 0.16, scrollTrigger: st(i0, i1) });
    gsap.fromTo(rules, { scaleX: 0 }, { scaleX: 1, ease: "power2.inOut", stagger: 0.16, scrollTrigger: st((r, h) => i0(r, h) + h * 0.05, (r, h) => i1(r, h) + h * 0.05) });
    // leave: fades before it reaches the nav
    gsap.fromTo(".location .split", { opacity: 1, y: 0 }, { opacity: 0, y: () => -innerHeight * 0.05, ease: "power1.in", scrollTrigger: stf((r) => r.location.l0 + (r.location.l1 - r.location.l0) * 0.05, (r) => r.location.l1) });
  }

  /* ----- CHAIRMAN: the quote lights up word by word as dusk falls ----- */
  {
    const A = (r) => r.chairman.a1 - r.chairman.a0;
    quoteLightUp((r) => r.chairman.a0 + A(r) * 0.5, (r) => r.chairman.h0 + (r.chairman.h1 - r.chairman.h0) * 0.5);
    gsap.fromTo(".quote figcaption", { opacity: 0, y: 18 }, { opacity: 1, y: 0, ease: "power2.out", scrollTrigger: st((r) => r.chairman.h0 - A(r) * 0.15, (r) => r.chairman.h0 + (r.chairman.h1 - r.chairman.h0) * 0.6) });
    gsap.fromTo(".quote", { opacity: 1 }, { opacity: 0, ease: "power1.in", scrollTrigger: st((r) => r.chairman.l0 + (r.chairman.l1 - r.chairman.l0) * 0.15, (r) => r.chairman.l1 - (r.chairman.l1 - r.chairman.l0) * 0.1) });
  }

  /* ----- ENQUIRE: calm. Heading line mask, list stagger, fields rise. ----- */
  {
    const A = (r) => r.enquire.a1 - r.enquire.a0;
    lineReveal("#enq-h", (r) => r.enquire.a0 + A(r) * 0.3, (r, h) => r.enquire.a1 + h * 0.02);
    gsap.fromTo([".enq-info .label", ".enq-info .lead", ...$$(".enq-info .dash li")], { opacity: 0, y: 20 },
      { opacity: 1, y: 0, ease: "power2.out", stagger: 0.12, scrollTrigger: st((r) => r.enquire.a0 + A(r) * 0.45, (r, h) => r.enquire.a1 + h * 0.18) });
    gsap.fromTo($$(".enq-panel .field, .enq-panel .btn, .enq-panel .form-note"), { opacity: 0, y: 28 },
      { opacity: 1, y: 0, ease: "power2.out", stagger: 0.08, scrollTrigger: st((r) => r.enquire.a0 + A(r) * 0.55, (r, h) => r.enquire.a1 + h * 0.26) });
  }
}

function quoteLightUp(from, to) {
  const split = SplitText.create(".quote blockquote", { type: "words", wordsClass: "qw" });
  gsap.fromTo(split.words, { opacity: 0.15 }, { opacity: 1, ease: "none", stagger: 0.1, scrollTrigger: st(from, to) });
  return split;
}

/* =====================================================================================================
   TABLET + PHONE: stacked layouts stay as they are. Light reveals keyed to each element entering the
   screen (on phones the camera lands well before the copy scrolls up over the scene window).
   ===================================================================================================== */
function small(cleanups) {
  for (const sel of ["#offer-h", "#venture-h", "#why-h", "#loc-h", "#enq-h"]) {
    const el = $(sel);
    const [a, b] = enter(el, 0.95, 0.66);
    lineReveal(el, a, b);
  }
  const price = $(".price-amt");
  const odo = odometer(price);
  cleanups.push(odo.revert);
  const [pa, pb] = enter(price, 0.95, 0.6);
  gsap.fromTo(odo.strips, { yPercent: 0 }, { yPercent: (i) => odo.ends[i], ease: "power3.out", stagger: 0.05, scrollTrigger: st(pa, pb) });
  $$(".why .points li").forEach((li) => {
    const [a, b] = enter(li, 0.96, 0.74);
    gsap.fromTo(li, { opacity: 0, y: 28 }, { opacity: 1, y: 0, ease: "power2.out", scrollTrigger: st(a, b) });
  });
  const q = $(".quote blockquote");
  quoteLightUp(() => docBox(q).y - innerHeight * 0.85, () => docBox(q).y + docBox(q).h - innerHeight * 0.55);
}
