import { HIGHLIGHT, HIGHLIGHT_C, L } from "./layout.js";

// One camera "shot" per section. p/t = position/target (m). sx = where the target sits on screen
// horizontally on wide screens (NDC, + = right, leaving the left for copy); sy = vertical offset on
// portrait screens (+ = up, leaving the bottom for copy); dy = optional vertical offset on wide screens, mx = optional horizontal offset on portrait. dusk 0 → golden hour, 1 → blue hour.
const [hx, hz] = HIGHLIGHT_C;
export const SHOTS = {
  hero:     { p: [205, 74, 300], t: [-40, 0, -110], fov: 40, sx: 0.38, sy: 0.30, dusk: 0.04, map: 0, hi: 0, pin: null },
  offer:    { p: [hx + 38, 44, hz + 56], t: [hx - 3, 0, hz - 3], fov: 32, sx: 0.36, sy: 0.34, mx: -0.28, dusk: 0.16, map: 0, hi: 1, pin: "plot" },
  venture:  { p: [10, 4.2, L.SITE + 38], t: [-3, 6.8, L.SITE - 4], fov: 44, sx: 0.3, sy: 0.30, dusk: 0.3, map: 0, hi: 0.2, pin: "gate" },
  whyA:     { p: [3.2, 3.1, L.SITE - 5], t: [1.2, 3.6, 10], fov: 46, sx: 0.3, sy: 0.25, dusk: 0.38, map: 0, hi: 0, pin: null },
  whyB:     { p: [-2.5, 5.5, -10], t: [1, 3.5, -95], fov: 46, sx: 0.3, sy: 0.25, dusk: 0.52, map: 0, hi: 0, pin: null },
  location: { p: [0, 640, 70], t: [0, 0, 0], fov: 34, sx: 0.34, sy: 0.3, dusk: 0.56, map: 1, hi: 0, pin: "site" },
  chairman: { p: [-170, 30, 240], t: [10, 6, -10], fov: 40, sx: 0, sy: 0.22, dy: -0.42, dusk: 0.78, map: 0, hi: 0, pin: null },
  enquire:  { p: [168, 20, 120], t: [-70, 12, -30], fov: 42, sx: -0.1, sy: 0.25, dusk: 0.95, map: 0, hi: 0, pin: null },
};
export const PIN_ANCHORS = {
  plot: [HIGHLIGHT.x0, 0.4, HIGHLIGHT.z0],   // far corner = top of the plot on screen
  gate: [L.GATE + 0.8, 9.4, L.SITE],
  site: [0, 2, -L.SITE - 3],                 // north wall, so the map label sits above the compound
};

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

// Build scroll keys from section geometry: each section "holds" its shot while it fills the screen.
export function buildKeys(sections, vh) {
  const keys = [];
  const push = (y, shot) => { const last = keys[keys.length - 1]; keys.push({ y: last ? Math.max(y, last.y) : y, shot }); };
  const hold = (s, shot, a = 0.22, b = 0.78) => {
    let y0 = s.top - a * vh, y1 = s.bottom - b * vh;
    if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
    push(y0, shot); push(y1, shot);
  };
  const S = sections;
  push(0, SHOTS.hero); push(Math.max(0, S.hero.bottom - 0.92 * vh), SHOTS.hero);
  hold(S.offer, SHOTS.offer);
  hold(S.venture, SHOTS.venture, 0.15, 0.85);
  push(S.why.top - 0.1 * vh, SHOTS.whyA); push(S.why.bottom - 0.95 * vh, SHOTS.whyB);
  hold(S.location, SHOTS.location);
  hold(S.chairman, SHOTS.chairman, 0.3, 0.7);
  hold(S.enquire, SHOTS.enquire, 0.3, 0);
  push(1e9, SHOTS.enquire);
  return keys;
}
