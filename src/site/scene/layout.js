// Park-1 site plan, in metres. Origin = centre of the site, +z = south (entrance gate side),
// -x = west (the sun sets there). 192 m x 192 m ≈ 9.1 acres inside the compound wall.
// Plots are 9.2 m x 11 m = 101.2 m² = 121 sq. yd. Indicative only — mirrors the brochure, not a survey.
export const L = {
  SITE: 96,          // compound wall half-size
  RING_IN: 85,       // inner edge of the perimeter road
  RING_OUT: 92,      // outer edge of the perimeter road (green verge up to the wall)
  AVE: 7,            // main avenue half-width (incl. planted median)
  MED: 1.4,          // median half-width
  BX0: 9,            // first plot edge, measured from the avenue centreline
  PW: 9.2, PD: 11, NPX: 8,
  Z0: 83,            // southern edge of the first block
  BLOCK: 22, PITCH: 32, NB: 5,
  GATE: 8,           // half-width of the gate opening
  ACC0: 103, ACC1: 111, // public access road (runs east-west outside the gate)
  WALL_H: 1.9,
};
L.BX1 = L.BX0 + L.NPX * L.PW;                         // 82.6
L.PARK_Z = L.Z0 - (L.NB - 1) * L.PITCH - L.BLOCK;     // -67  (landscaped open space to the north)

export function plotRect(side, block, row, col) {
  const xa = L.BX0 + col * L.PW, xb = xa + L.PW;
  const zTop = L.Z0 - block * L.PITCH - row * L.PD;
  return side > 0 ? { x0: xa, x1: xb, z0: zTop - L.PD, z1: zTop } : { x0: -xb, x1: -xa, z0: zTop - L.PD, z1: zTop };
}
// Each plot has a young mango tree near its back boundary, so every block carries a row of mangoes down its
// spine (rows 0/1 sit back to back). The ground shader draws a soil basin under each one.
L.MANGO_BACK = 2.6;  // metres in from the plot's back edge
export function mangoInPlot(side, block, row, col) {
  const p = plotRect(side, block, row, col);
  return [(p.x0 + p.x1) / 2, row === 0 ? p.z0 + L.MANGO_BACK : p.z1 - L.MANGO_BACK];
}
// The plot the "Offer" shot descends onto: east of the avenue, first block, front row, third plot.
export const HIGHLIGHT = plotRect(1, 0, 0, 2);
export const HIGHLIGHT_C = [(HIGHLIGHT.x0 + HIGHLIGHT.x1) / 2, (HIGHLIGHT.z0 + HIGHLIGHT.z1) / 2];

// GLSL #defines generated from the same numbers.
export const GLSL_LAYOUT = Object.entries(L)
  .map(([k, v]) => `#define ${k} ${Number(v).toFixed(4)}`).join("\n");

/* ---------- terrain height (identical maths in GLSL: see shaders.js `terrainH`) ---------- */
const fract = (x) => x - Math.floor(x);
export function hash12(x, y) {
  let p3x = fract(x * 0.1031), p3y = fract(y * 0.1031), p3z = fract(x * 0.1031);
  const d = p3x * (p3y + 33.33) + p3y * (p3z + 33.33) + p3z * (p3x + 33.33);
  p3x += d; p3y += d; p3z += d;
  return fract((p3x + p3y) * p3z);
}
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash12(ix, iy), b = hash12(ix + 1, iy), c = hash12(ix, iy + 1), d = hash12(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function terrainH(x, z) {
  const d = Math.max(Math.abs(x), Math.abs(z));
  const r = Math.hypot(x, z);
  const w = smooth(118, 420, d);
  let h = w * ((vnoise(x * 0.0035, z * 0.0035) * 2 - 1) * 14 + (vnoise(x * 0.011 + 7.3, z * 0.011) * 2 - 1) * 3.5);
  const far = smooth(900, 3400, r);
  const n = vnoise(x * 0.0009 + 3.1, z * 0.0009);
  h += far * n * n * 300;
  // keep the public access road level with the gate
  const road = 1 - smooth(4, 26, Math.abs(z - (L.ACC0 + L.ACC1) / 2));
  return h * (1 - road * (1 - smooth(300, 700, Math.abs(x))));
}

/* ---------- deterministic RNG for scattering ---------- */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
