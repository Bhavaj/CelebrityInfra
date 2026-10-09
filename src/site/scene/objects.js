import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { L, rng, terrainH, mangoInPlot } from "./layout.js";

/* ---------- geometry helpers ---------- */
// kind: surface shading in litFrag — 0 plain, 1 foliage (leaf-clump detail + sheen), 2 fruit (glossy skin), 3 bark (photo fissures)
export const KIND = { PLAIN: 0, LEAF: 1, FRUIT: 2, BARK: 3 };
function prep(geo, rgb, sway = 0, kind = KIND.PLAIN) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute("uv");
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3), sw = new Float32Array(n), kd = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const c = typeof rgb === "function" ? rgb(i, g) : rgb;
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    sw[i] = sway; kd[i] = kind;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aSway", new THREE.BufferAttribute(sw, 1));
  g.setAttribute("aKind", new THREE.BufferAttribute(kd, 1));
  return g;
}
const box = (w, h, d, x, y, z, rgb) => prep(new THREE.BoxGeometry(w, h, d).translate(x, y, z), rgb);

/* ---------- broadleaf tree (neem / rain-tree silhouette), ~7 m ---------- */
export function treeGeometry() {
  const r = rng(7);
  const parts = [];
  parts.push(prep(new THREE.CylinderGeometry(0.16, 0.26, 3.6, 6, 1).translate(0, 1.8, 0), [0.17, 0.12, 0.08], 0.3, KIND.BARK));
  const blobs = [[0, 4.9, 0, 2.5], [1.1, 4.4, 0.5, 1.8], [-1.0, 4.5, -0.4, 1.9], [0.2, 5.7, -0.6, 1.6]];
  for (const [bx, by, bz, br] of blobs) {
    const g = new THREE.IcosahedronGeometry(br, 1);
    const p = g.attributes.position;
    const nrm = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      const hv = Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719) * 43758.5453;
      const k = 0.86 + 0.28 * (hv - Math.floor(hv)); // position-hashed so shared vertices stay welded
      v.multiplyScalar(k); v.y *= 0.78;
      p.setXYZ(i, v.x + bx, v.y + by, v.z + bz);
      v.y /= 0.78; v.normalize();
      nrm.setXYZ(i, v.x, v.y, v.z);  // spherical normals → soft, not faceted
    }
    parts.push(prep(g, (i, gg) => {
      const y = gg.attributes.position.getY(i);
      const t = 0.75 + 0.25 * Math.min(1, Math.max(0, (y - 3) / 4));
      return [0.15 * t, 0.19 * t, 0.085 * t];
    }, 1, KIND.LEAF));
  }
  return mergeGeometries(parts);
}

/* ---------- mango tree, ~7 m: short stout trunk, dense clumpy dome, fruit hanging off the lower canopy ---------- */
// Fruit is drawn ~2.5x life size so it still reads from the aerial shots. Leaf detail is added per-pixel in litFrag.
const hashf = (x, y, z) => { const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return h - Math.floor(h); };
// smooth-ish 3D value noise from position hashes (geometry only, runs once at build time)
function vnoise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hashf(ix + dx, iy + dy, iz + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
// mango silhouette (radius, height) from the tip up to the stalk: full shoulder, tapered, slightly hooked tip
const MANGO_PROFILE = [[0, -0.5], [0.2, -0.45], [0.36, -0.33], [0.46, -0.15], [0.5, 0.05], [0.48, 0.24], [0.4, 0.38], [0.24, 0.47], [0, 0.5]];
const MANGO_PROFILE_LO = [[0, -0.5], [0.34, -0.36], [0.5, 0], [0.42, 0.34], [0, 0.5]];
function fruitGeometry(seg, hi) {
  const prof = hi ? MANGO_PROFILE : MANGO_PROFILE_LO;
  const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    z *= 0.82;                                         // a little flattened, like the real fruit
    x += 0.09 * Math.max(0, -y) ** 2 * 4;              // the "beak" curls to one side
    p.setXYZ(i, x * 0.27, y * 0.4, z * 0.27);
  }
  g.computeVertexNormals();
  return g;
}

export function mangoGeometry({ fruits = 30, detail = 2, seg = 7, hiFruit = false } = {}) {
  const r = rng(11);
  const parts = [];
  const bark = [0.2, 0.14, 0.09];
  // trunk: knobby (noise-displaced rings), flared at the root, with streaky bark colour
  const barkCol = (base) => (i, gg) => {
    const q = gg.attributes.position;
    const k = 0.7 + 0.6 * hashf(Math.round(q.getX(i) * 40), Math.round(q.getY(i) * 6), Math.round(q.getZ(i) * 40));
    return [base[0] * k, base[1] * k, base[2] * k];
  };
  const knob = (g, amp, flare) => {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const f = 1 + amp * (vnoise3(x * 3 + 7, y * 2.2, z * 3) - 0.5) + flare * Math.max(0, 0.5 - y);
      p.setXYZ(i, x * f, y, z * f);
    }
    return g;
  };
  parts.push(prep(knob(new THREE.CylinderGeometry(0.28, 0.46, 2.2, 8, 4, true).translate(0, 1.1, 0), 0.5, 0.35), barkCol(bark), 0.15, KIND.BARK));
  for (const [a, tilt, len] of [[0.3, 0.5, 2.3], [2.4, 0.62, 2.0], [4.4, 0.4, 2.6], [5.5, 0.85, 1.6]]) {
    const b = knob(new THREE.CylinderGeometry(0.11, 0.2, len, 6, 2, true).translate(0, len / 2, 0), 0.4, 0);
    b.rotateZ(tilt); b.rotateY(a); b.translate(0, 1.9, 0);
    parts.push(prep(b, barkCol(bark), 0.3, KIND.BARK));
  }
  // canopy: a heap of overlapping leaf masses rather than a few smooth domes. Clump centres sit inside a lopsided
  // dome (heavier on +x, thinner toward -z), with hanging skirts at the rim, a dark core so gaps don't show sky,
  // and ragged outliers. Fewer, cheaper masses for the orchard LOD (detail < 2).
  const nMass = detail >= 2 ? 28 : 13;
  const R = 3.1;
  const masses = [];
  for (let i = 0; i < nMass; i++) {
    const a = r() * Math.PI * 2, rr = R * Math.sqrt(r()) * (1 + 0.18 * Math.cos(a));       // heavier on +x
    const cx = Math.cos(a) * rr * 1.08 + 0.3, cz = Math.sin(a) * rr * (Math.sin(a) < 0 ? 0.82 : 1);
    const edge = Math.min(1, rr / R);
    const cy = 3.15 + 2.5 * Math.pow(Math.max(0, 1 - edge * edge), 0.7) + (r() - 0.5) * 0.7 - (edge > 0.7 ? 0.25 + r() * 0.55 : 0); // dome, rim hangs
    const br = (detail >= 2 ? 0.8 : 1.15) + r() * (detail >= 2 ? 0.55 : 0.6);
    masses.push([cx, cy, cz, br]);
  }
  masses.push([0.3, 4.2, 0, 1.9]);                               // dark core
  const core = masses.length - 1;
  const blobs = masses.slice(0, core);                           // fruit hangs off these
  masses.forEach(([bx, by, bz, br], mi) => {
    const g = new THREE.IcosahedronGeometry(br, mi === core ? 1 : (detail >= 2 ? 1 : 1));
    const p = g.attributes.position, nrm = g.attributes.normal;
    const ao = new Float32Array(p.count), young = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      const d = v.clone().normalize();
      const wx = v.x + bx, wy = v.y + by, wz = v.z + bz;
      const clump = vnoise3(wx * 1.4, wy * 1.4, wz * 1.4) * 0.65 + vnoise3(wx * 3.3 + 5, wy * 3.3, wz * 3.3) * 0.35;
      const k = 0.7 + 0.6 * clump;                               // lumpy outline, leaf-tuft scale
      v.multiplyScalar(k); v.y *= 0.7;
      p.setXYZ(i, v.x + bx, v.y + by, v.z + bz);
      const n = d.clone().add(new THREE.Vector3(hashf(wx, 1, wz) - 0.5, 0, hashf(wz, 2, wx) - 0.5).multiplyScalar(0.45)).normalize();
      nrm.setXYZ(i, n.x, n.y, n.z);
      ao[i] = (mi === core ? 0.3 : 0.5) + 0.5 * clump;           // recessed tufts and the core sit in shade
      young[i] = Math.max(0, vnoise3(wx * 0.7 + 9, wy * 0.7, wz * 0.7) - 0.7) * 3.5; // patches of lighter new flush
    }
    parts.push(prep(g, (i, gg) => {
      const y = gg.attributes.position.getY(i);
      const t = (0.55 + 0.45 * Math.min(1, Math.max(0, (y - 2.6) / 4.2))) * ao[i];
      return [(0.08 + young[i] * 0.06) * t, (0.23 + young[i] * 0.08) * t, 0.065 * t];
    }, 1, KIND.LEAF));
  });
  // fruit: hanging from short stalks off the sides and underside of the canopy
  const proto = fruitGeometry(seg, hiFruit);
  for (let n = 0, tries = 0; n < fruits && tries < fruits * 20; tries++) {
    const [bx, by, bz, br] = blobs[Math.floor(r() * blobs.length)];
    const a = r() * Math.PI * 2, el = 0.6 - r() * 1.1;              // outer flanks, so it reads from the air too
    const d = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    const x = bx + d.x * br * 1.08, z = bz + d.z * br * 1.08, y = by + d.y * br * 0.72 * 1.08;
    if (blobs.some(([cx, cy, cz, cr]) => ((x - cx) ** 2 + ((y - cy) / 0.72) ** 2 + (z - cz) ** 2) < (cr * 0.97) ** 2)) continue;
    if (y < 2.2) continue;
    const ripe = r();
    const base = ripe < 0.4 ? [0.93, 0.6, 0.1] : ripe < 0.75 ? [0.96, 0.76, 0.2] : [0.5, 0.62, 0.16];
    const f = proto.clone().rotateY(r() * 6.28).rotateZ((r() - 0.5) * 0.35).translate(x, y - 0.28, z);
    const cy = y - 0.28;
    parts.push(prep(f, (i, gg) => {
      const fy = (gg.attributes.position.getY(i) - cy) / 0.2;          // -1 tip .. +1 stalk
      const sun = Math.max(0, gg.attributes.normal.getX(i) * 0.5 + 0.5); // one cheek blushes
      const blush = Math.max(0, fy) * 0.5 + sun * 0.35 * (ripe < 0.75 ? 1 : 0.3);
      return [Math.min(1, base[0] + blush * 0.05), base[1] * (1 - blush * 0.45), base[2] * (1 - blush * 0.5)];
    }, 1, KIND.FRUIT));
    if (detail > 1) parts.push(prep(new THREE.CylinderGeometry(0.015, 0.02, 0.26, 4, 1).translate(x, y + 0.02, z), [0.2, 0.22, 0.08], 1));
    n++;
  }
  return mergeGeometries(parts);
}

/* ---------- avenue palm, ~10 m ---------- */
export function palmGeometry() {
  const parts = [];
  const H = 9.4;
  parts.push(prep(new THREE.CylinderGeometry(0.13, 0.2, H, 7, 6).translate(0, H / 2, 0), [0.38, 0.36, 0.32], 0.18));
  parts.push(prep(new THREE.CylinderGeometry(0.26, 0.15, 1.1, 7, 1).translate(0, H + 0.1, 0), [0.24, 0.27, 0.13], 0.3));
  const fronds = 14, seg = 7, len = 4.4;
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + (f % 2) * 0.2;
    const lift = f % 2 ? 0.9 : 0.35;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const pos = [], idx = [];
    for (let s = 0; s <= seg; s++) {
      const t = s / seg;
      const c = dir.clone().multiplyScalar(t * len);
      c.y = H + 0.4 + Math.sin(t * 1.4) * lift * 1.6 - t * t * 2.6;
      const w = 0.62 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.08));
      const l = c.clone().addScaledVector(side, w); l.y -= w * 0.35;
      const rr = c.clone().addScaledVector(side, -w); rr.y -= w * 0.35;
      pos.push(l.x, l.y, l.z, c.x, c.y + 0.04, c.z, rr.x, rr.y, rr.z);
      if (s < seg) {
        const b = s * 3;
        idx.push(b, b + 3, b + 1, b + 1, b + 3, b + 4, b + 1, b + 4, b + 2, b + 2, b + 4, b + 5);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    parts.push(prep(g, [0.17, 0.21, 0.08], 1.2));
  }
  return mergeGeometries(parts);
}

/* ---------- compound wall with piers, gap at the gate ---------- */
export function wallGeometry() {
  const parts = [];
  const S = L.SITE, H = L.WALL_H, T = 0.28;
  const plaster = [0.56, 0.5, 0.42], cap = [0.42, 0.38, 0.32];
  const run = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    parts.push(box(alongX ? len : T, H, alongX ? T : len, cx, H / 2, cz, plaster));
    parts.push(box(alongX ? len : T + 0.12, 0.1, alongX ? T + 0.12 : len, cx, H + 0.05, cz, cap));
    const n = Math.round(len / 6);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      parts.push(box(0.48, H + 0.3, 0.48, x, (H + 0.3) / 2, z, cap));
    }
  };
  run(-S, -S, S, -S); run(-S, -S, -S, S); run(S, -S, S, S);
  run(-S, S, -L.GATE - 1.6, S); run(L.GATE + 1.6, S, S, S);
  return mergeGeometries(parts);
}

/* ---------- entrance arch ---------- */
export function gateGeometry() {
  const parts = [];
  const z = L.SITE, gx = L.GATE + 0.8;
  const stone = [0.5, 0.44, 0.36], dark = [0.26, 0.22, 0.18];
  for (const s of [-1, 1]) {
    parts.push(box(1.9, 0.5, 1.9, s * gx, 0.25, z, dark));
    parts.push(box(1.6, 8.2, 1.6, s * gx, 4.1, z, stone));
    parts.push(box(1.95, 0.3, 1.95, s * gx, 8.35, z, dark));
    parts.push(box(0.9, 0.5, 0.9, s * gx, 8.75, z, stone));
    // flanking low wing walls
    parts.push(box(3.2, 2.6, 0.5, s * (gx + 2.4), 1.3, z, stone));
  }
  parts.push(box(2 * gx + 1.6, 1.5, 1.3, 0, 7.15, z, stone));
  parts.push(box(2 * gx + 1.9, 0.18, 1.45, 0, 6.32, z, dark));
  parts.push(box(2 * gx + 1.9, 0.18, 1.45, 0, 7.98, z, dark));
  return mergeGeometries(parts);
}
export function gateTrimGeometry() {
  const z = L.SITE + 0.66, w = 2 * (L.GATE + 0.8) + 1.4;
  const gold = [0.55, 0.42, 0.16];
  return mergeGeometries([
    box(w, 0.05, 0.03, 0, 6.5, z, gold), box(w, 0.05, 0.03, 0, 7.8, z, gold),
    box(0.28, 0.28, 0.28, -(L.GATE + 0.8), 9.15, L.SITE, gold), box(0.28, 0.28, 0.28, L.GATE + 0.8, 9.15, L.SITE, gold),
  ]);
}
export async function gateSignTexture() {
  try { await Promise.race([document.fonts.load('600 64px "Cinzel"'), new Promise((r) => setTimeout(r, 1500))]); } catch {}
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 112;
  const x = c.getContext("2d");
  x.fillStyle = "#1a1510"; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = "#e3c46a";
  x.font = '600 62px "Cinzel", Georgia, serif';
  x.textAlign = "center"; x.textBaseline = "middle";
  if ("letterSpacing" in x) x.letterSpacing = "10px";
  x.fillText("CELEBRITY'S PARK-1", c.width / 2, c.height / 2 + 3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ---------- small instanced parts ---------- */
export const stoneGeometry = () => mergeGeometries([box(0.22, 0.5, 0.22, 0, 0.1, 0, [0.78, 0.74, 0.66]), box(0.23, 0.12, 0.23, 0, 0.4, 0, [0.5, 0.17, 0.1])]);
export const poleGeometry = () => mergeGeometries([
  box(0.13, 6.6, 0.13, 0, 3.3, 0, [0.1, 0.085, 0.07]),
  box(1.25, 0.08, 0.08, 0.55, 6.5, 0, [0.1, 0.085, 0.07]),
  box(0.5, 0.12, 0.26, 1.1, 6.42, 0, [0.14, 0.12, 0.1]),
]);

export function birdGeometry() {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([
    0, 0, 0.35, -1, 0.05, -0.15, 0, 0, -0.25,
    0, 0, 0.35, 0, 0, -0.25, 1, 0.05, -0.15,
  ], 3));
  return g;
}

/* ---------- placement ---------- */
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S3 = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const mat = (x, y, z, s = 1, ry = 0) => M.compose(V.set(x, y, z), Q.setFromAxisAngle(UP, ry), S3.set(s, s, s)).clone();
// organic variant for trees: unequal width/depth/height and a slight lean, so no two canopies match
const EU = new THREE.Euler();
const lop = (x, y, z, s, ry, rr) => M.compose(V.set(x, y, z), Q.setFromEuler(EU.set((rr() - 0.5) * 0.07, ry, (rr() - 0.5) * 0.07)), S3.set(s * (0.86 + rr() * 0.3), s * (0.88 + rr() * 0.26), s * (0.86 + rr() * 0.3))).clone();

export function placements({ outsideTrees = 380, orchards = 9 } = {}) {
  const r = rng(42);
  const palms = [], trees = [], mangos = [], stones = [], poles = [], glows = [];

  // coconut palms: avenue median, and framing the gate outside
  for (let z = L.SITE - 4; z > -L.RING_IN + 2; z -= 12) palms.push(mat(0, 0, z, 0.9 + r() * 0.2, r() * 6.28));
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) palms.push(mat(s * (L.GATE + 6 + i * 7), 0, L.SITE + 3.5, 0.9 + r() * 0.2, r() * 6.28));

  // mango trees: both kerbs of the avenue, between the palms
  for (let z = L.SITE - 13; z > -L.RING_IN; z -= 12) for (const s of [-1, 1]) mangos.push(lop(s * (L.AVE + 1.6), 0, z, 0.78 + r() * 0.14, r() * 6.28, r));
  // ...and one in every plot, at the back of the plot so the frontage stays open
  for (const s of [-1, 1]) for (let b = 0; b < L.NB; b++) for (let row = 0; row < 2; row++) for (let c = 0; c < L.NPX; c++) {
    const [x, z] = mangoInPlot(s, b, row, c);
    mangos.push(lop(x, 0, z, 0.52 + r() * 0.2, r() * 6.28, r));
  }

  // inside the wall verge and the open space: mango with the odd neem
  const vergeM = (L.RING_OUT + L.SITE) / 2;
  const verge = (x, z) => (r() < 0.75 ? mangos : trees).push(lop(x, 0, z, 0.74 + r() * 0.4, r() * 6.28, r));
  for (let t = -vergeM; t <= vergeM; t += 8) {
    const j = () => (r() - 0.5) * 1.2;
    verge(t + j(), -vergeM + j());
    verge(-vergeM + j(), t + j());
    verge(vergeM + j(), t + j());
    if (Math.abs(t) > L.GATE + 4) verge(t + j(), vergeM + j());
  }
  for (let i = 0; i < 70; i++) {
    const x = (r() * 2 - 1) * (L.BX1 - 2), z = L.PARK_Z - 3 - r() * (L.RING_IN + L.PARK_Z - 6);
    if (Math.abs(x) < L.AVE + 3) continue;
    const d = Math.hypot(x, z - (L.PARK_Z - L.RING_IN) * 0.5);
    if (Math.abs(d - 14) < 2.5) continue;
    (r() < 0.6 ? mangos : trees).push(lop(x, 0, z, 0.7 + r() * 0.5, r() * 6.28, r));
  }
  const insideCount = trees.length, insideMangos = mangos.length;

  const clear = (x, z, pad = 12) => Math.max(Math.abs(x), Math.abs(z)) > L.SITE + pad && Math.abs(z - (L.ACC0 + L.ACC1) / 2) > 9;
  // neighbouring mango orchards: grid-planted blocks in the surrounding fields
  for (let o = 0, tries = 0; o < orchards && tries < 200; tries++) {
    const a = r() * Math.PI * 2, rad = 150 + r() * 520;
    const cx = Math.cos(a) * rad, cz = Math.sin(a) * rad;
    const nx = 5 + Math.floor(r() * 6), nz = 4 + Math.floor(r() * 5), sp = 9;
    const rot = -0.28 + (r() - 0.5) * 0.1, ca = Math.cos(rot), sa = Math.sin(rot);
    if (!clear(cx, cz, 60)) continue;
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      const lx = (i - nx / 2) * sp, lz = (k - nz / 2) * sp;
      const x = cx + lx * ca - lz * sa, z = cz + lx * sa + lz * ca;
      if (clear(x, z)) mangos.push(lop(x, terrainH(x, z) - 0.2, z, 0.7 + r() * 0.35, r() * 6.28, r));
    }
    o++;
  }

  // countryside: trees cluster along field bunds and in small groves
  let tries = 0;
  while (trees.length - insideCount < outsideTrees && tries++ < outsideTrees * 8) {
    const a = r() * Math.PI * 2, rad = 112 + Math.pow(r(), 1.6) * 900;
    let x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    if (!clear(x, z)) continue;
    if (r() < 0.55) { // snap to a field bund
      const qx = 0.96 * x - 0.28 * z, qz = 0.28 * x + 0.96 * z;
      const sx = Math.round(qx / 64) * 64, sz = Math.round(qz / 46) * 46;
      const nx = Math.abs(qx - sx) < Math.abs(qz - sz) ? sx : qx, nz = nx === qx ? sz : qz;
      x = 0.96 * nx + 0.28 * nz; z = -0.28 * nx + 0.96 * nz;
      if (!clear(x, z)) continue;
    }
    trees.push(lop(x, terrainH(x, z) - 0.3, z, 0.7 + r() * 0.8, r() * 6.28, r));
  }

  // boundary stones at every plot corner
  for (const s of [-1, 1]) for (let b = 0; b < L.NB; b++) for (let row = 0; row <= 2; row++) for (let c = 0; c <= L.NPX; c++) {
    stones.push(mat(s * (L.BX0 + c * L.PW), 0, L.Z0 - b * L.PITCH - row * L.PD, 1, 0));
  }

  // lamp posts: avenue (both kerbs) + perimeter road; heads face the road
  let seed = 0;
  const lamp = (x, z, ry) => {
    poles.push(mat(x, 0, z, 1, ry));
    const hx = x + Math.cos(-ry) * 1.1, hz = z + Math.sin(-ry) * 1.1;
    glows.push({ m: mat(hx, 6.3, hz), seed: (seed++ * 0.618) % 1 });
  };
  for (let z = L.SITE - 6; z > -L.RING_IN; z -= 24) { lamp(L.AVE + 0.6, z, Math.PI); lamp(-(L.AVE + 0.6), z, 0); }
  const rm = L.RING_IN - 0.6;
  for (let t = -rm + 10; t < rm; t += 28) {
    lamp(t, -rm, Math.PI / 2); lamp(-rm, t, Math.PI); lamp(rm, t, 0);
    if (Math.abs(t) > L.AVE + 6 && Math.abs(t - 32) > 16) lamp(t, rm, -Math.PI / 2); // keep the offer plot's frontage clear
  }
  return { palms, trees, mangos, insideCount, insideMangos, stones, poles, glows };
}
