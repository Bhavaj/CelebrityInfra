import { HIGHLIGHT, HIGHLIGHT_C, L } from "./layout.js";

// One camera "shot" per section. p/t = position/target (m). sx = where the target sits on screen
// horizontally on wide screens (NDC, + = right, leaving the left for copy; - = left, copy on the right);
// sy = vertical offset on portrait screens (+ = up, leaving the bottom for copy); dy = optional vertical
// offset on wide screens (- = down, leaving the top for copy), mx = optional horizontal offset on portrait.
// dusk 0 → golden hour, 1 → blue hour.
// `tab` = overrides for wide-but-narrow screens (861–1080 px), which keep the stacked left-column layouts:
// the centred / mirrored compositions only exist on the desktop layout (≥ 1081 px).
const [hx, hz] = HIGHLIGHT_C;
export const SHOTS = {
  hero:     { p: [205, 74, 300], t: [-40, 0, -110], fov: 40, sx: 0.38, sy: 0.30, dusk: 0.04, map: 0, hi: 0, pin: null },
  offer:    { p: [hx + 38, 44, hz + 56], t: [hx - 3, 0, hz - 3], fov: 32, sx: 0.36, sy: 0.34, mx: -0.28, dusk: 0.16, map: 0, hi: 1, pin: "plot" },
  // desktop: the headline sits centred above the gate, so the gate drops into the lower half of the frame
  venture:  { p: [10, 4.2, L.SITE + 38], t: [-3, 6.8, L.SITE - 4], fov: 44, sx: 0.02, dy: -0.3, sy: 0.30, dusk: 0.3, map: 0, hi: 0.2, pin: null, tab: { sx: 0.3, dy: 0 } },
  // desktop: the avenue's vanishing point is centred; the reasons pass by on either side like roadside signs
  whyA:     { p: [3.2, 3.1, L.SITE - 5], t: [1.2, 3.6, 10], fov: 46, sx: 0, sy: 0.25, dusk: 0.38, map: 0, hi: 0, pin: null, tab: { sx: 0.3 } },
  whyB:     { p: [-2.5, 5.5, -10], t: [1, 3.5, -95], fov: 46, sx: 0, sy: 0.25, dusk: 0.52, map: 0, hi: 0, pin: null, tab: { sx: 0.3 } },
  // desktop: mirrored, the compound sits left of the card
  location: { p: [0, 640, 70], t: [0, 0, 0], fov: 34, sx: -0.34, sy: 0.3, dusk: 0.56, map: 1, hi: 0, pin: "site", tab: { sx: 0.34 } },
  chairman: { p: [-170, 30, 240], t: [10, 6, -10], fov: 40, sx: 0, sy: 0.22, dy: -0.5, dusk: 0.78, map: 0, hi: 0, pin: null },
  enquire:  { p: [168, 20, 120], t: [-70, 12, -30], fov: 42, sx: -0.1, sy: 0.25, dusk: 0.95, map: 0, hi: 0, pin: null },
};
export const PIN_ANCHORS = {
  plot: [HIGHLIGHT.x0, 0.4, HIGHLIGHT.z0],   // far corner = top of the plot on screen
  site: [0, 2, -L.SITE - 3],                 // north wall, so the map label sits above the compound
};
// the section each scene label belongs to (labels only show while that section is the active one)
export const PIN_SECTION = { plot: "offer", site: "location" };

const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;

// keys: [{y, shot}] sorted by scroll y. Returns a blended shot (written into `out`).
export function evalShots(keys, y, out) {
  let i = 0;
  while (i < keys.length - 2 && y >= keys[i + 1].y) i++;
  const a = keys[i], b = keys[i + 1] || a;
  const span = b.y - a.y;
  const t = span > 0 ? smoother(Math.min(1, Math.max(0, (y - a.y) / span))) : 0;
  const A = a.shot, B = b.shot;
  for (let k = 0; k < 3; k++) { out.p[k] = lerp(A.p[k], B.p[k], t); out.t[k] = lerp(A.t[k], B.t[k], t); }
  out.fov = lerp(A.fov, B.fov, t);
  out.sx = lerp(A.sx, B.sx, t); out.sy = lerp(A.sy, B.sy, t); out.dy = lerp(A.dy || 0, B.dy || 0, t); out.mx = lerp(A.mx || 0, B.mx || 0, t);
  out.dusk = lerp(A.dusk, B.dusk, t); out.map = lerp(A.map, B.map, t); out.hi = lerp(A.hi, B.hi, t);
  out.pin = t < 0.5 ? A.pin : B.pin;
  out.pinW = A.pin === B.pin ? 1 : Math.abs(t - 0.5) * 2;
  return out;
}

export const SECTION_NAMES = ["hero", "offer", "venture", "why", "location", "chairman", "enquire"];

// The shot a section actually uses at the current layout (tablet overrides applied).
export function shotFor(name, opt = {}) {
  const s = SHOTS[name];
  return opt.tab && s.tab ? { ...s, ...s.tab } : s;
}

// Build scroll keys from section geometry: each section "holds" its shot while it fills the screen.
// opt.pinned = { offer, venture, why }: sections whose content is pinned by motion.js (desktop). Their pin
// spacing is part of the section's height; the keys then line the camera up with the pinned choreography:
//  - offer: the camera holds on the plot for the whole pin,
//  - venture: the camera holds on the gate for the first ~40% of the pin, then drives through it so it is
//    on the avenue exactly as the pin releases (the headline parts like the gates while this happens),
//  - why: the walk down the avenue spans the whole pin.
// opt.tab = 861–1080 px wide layouts (see SHOTS.tab).
export function buildKeys(sections, vh, opt = {}) {
  const P = opt.pinned || {};
  const keys = [];
  const push = (y, shot, name) => { const last = keys[keys.length - 1]; keys.push({ y: last ? Math.max(y, last.y) : y, shot, name }); };
  const hold = (name, a = 0.22, y1) => {
    const s = sections[name], shot = shotFor(name, opt);
    let y0 = s.top - a * vh;
    if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
    push(y0, shot, name); push(y1, shot, name);
  };
  const S = sections;
  const pinLen = (n) => S[n].bottom - S[n].top - vh; // pin spacing (pinned sections are exactly one screen + the pin)
  push(0, SHOTS.hero, "hero"); push(Math.max(0, S.hero.bottom - 0.92 * vh), SHOTS.hero, "hero");
  hold("offer", 0.22, P.offer ? S.offer.bottom - vh : S.offer.bottom - 0.78 * vh);
  hold("venture", 0.15, P.venture ? S.venture.top + pinLen("venture") * 0.42 : S.venture.bottom - 0.85 * vh);
  push(P.venture ? S.venture.bottom - vh : S.why.top - 0.1 * vh, shotFor("whyA", opt), "why");
  push(S.why.bottom - 0.95 * vh, shotFor("whyB", opt), "why");
  hold("location", 0.22, S.location.bottom - 0.78 * vh);
  hold("chairman", 0.3, S.chairman.bottom - 0.7 * vh);
  hold("enquire", 0.3, S.enquire.bottom);
  push(1e9, shotFor("enquire", opt), "end");
  return keys;
}

// Per-section scroll ranges derived from the same keys the camera uses, so copy can assemble exactly while
// the camera lands and disassemble while it leaves:
//   a0 → a1  arrive (camera travelling in from the previous shot)
//   h0 → h1  hold   (camera on this section's shot; for "why", the walk down the avenue)
//   l0 → l1  leave  (camera travelling on to the next shot)
export function shotRanges(sections, vh, opt = {}) {
  const keys = buildKeys(sections, vh, opt);
  const out = {};
  SECTION_NAMES.forEach((n, i) => {
    const ks = keys.filter((k) => k.name === n);
    out[n] = { h0: ks[0].y, h1: ks[ks.length - 1].y };
    if (i) { const p = out[SECTION_NAMES[i - 1]]; out[n].a0 = p.h1; p.l0 = p.h1; p.l1 = out[n].h0; }
    else out[n].a0 = 0;
    out[n].a1 = out[n].h0;
  });
  const last = out.enquire; last.l0 = last.h1; last.l1 = last.h1 + vh;
  return out;
}

// Section geometry in document coordinates (pin spacers included, since they live inside the sections).
export function measureSections() {
  const out = {}, y = window.scrollY;
  for (const n of SECTION_NAMES) {
    const r = document.querySelector(`section[data-scene="${n}"]`).getBoundingClientRect();
    out[n] = { top: r.top + y, bottom: r.bottom + y };
  }
  return out;
}
export function sceneOptions() {
  const pinned = {};
  for (const n of ["offer", "venture", "why"]) pinned[n] = !!document.querySelector(`#${n} > .pin-spacer`);
  return { pinned, tab: innerWidth <= 1080 };
}
