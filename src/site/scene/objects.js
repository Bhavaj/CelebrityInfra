import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { L, rng, terrainH, mangoInPlot } from "./layout.js";

/* ---------- geometry helpers ---------- */
function prep(geo, rgb, sway = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute("uv");
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3), sw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const c = typeof rgb === "function" ? rgb(i, g) : rgb;
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    sw[i] = sway;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aSway", new THREE.BufferAttribute(sw, 1));
  return g;
}
const box = (w, h, d, x, y, z, rgb) => prep(new THREE.BoxGeometry(w, h, d).translate(x, y, z), rgb);

/* ---------- broadleaf tree (neem / rain-tree silhouette), ~7 m ---------- */
export function treeGeometry() {
  const r = rng(7);
  const parts = [];
  parts.push(prep(new THREE.CylinderGeometry(0.16, 0.26, 3.6, 6, 1).translate(0, 1.8, 0), [0.17, 0.12, 0.08], 0.3));
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
    }, 1));
  }
  return mergeGeometries(parts);
}

/* ---------- mango tree, ~7 m: short stout trunk, dense dark dome, fruit hanging off the lower canopy ---------- */
// Fruit is drawn ~2.5x life size so it still reads from the aerial shots.
export function mangoGeometry({ fruits = 46, detail = 2 } = {}) {
  const r = rng(11);
  const parts = [];
  const bark = [0.2, 0.14, 0.09];
  parts.push(prep(new THREE.CylinderGeometry(0.3, 0.42, 2.2, 7, 1).translate(0, 1.1, 0), bark, 0.15));
  for (const [a, tilt] of [[0.3, 0.5], [2.4, 0.55], [4.4, 0.45]]) {
    const b = new THREE.CylinderGeometry(0.13, 0.2, 2.2, 5, 1).translate(0, 1.1, 0);
    b.rotateZ(tilt); b.rotateY(a); b.translate(0, 1.9, 0);
    parts.push(prep(b, bark, 0.3));
  }
  // canopy: one broad dome + lobes, squashed so it's wider than tall
  const blobs = [[0, 4.6, 0, 3.3], [1.7, 4.1, 0.9, 2.3], [-1.6, 4.2, -0.8, 2.4], [0.7, 4.0, -1.8, 2.2], [-0.8, 4.1, 1.8, 2.2], [0.1, 5.7, 0.2, 2.2]];
  const shell = []; // points on the canopy underside where fruit can hang
  for (const [bx, by, bz, br] of blobs) {
    const g = new THREE.IcosahedronGeometry(br, detail);
    const p = g.attributes.position, nrm = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      const hv = Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719) * 43758.5453;
      const k = 0.9 + 0.2 * (hv - Math.floor(hv));
      v.multiplyScalar(k); v.y *= 0.72;
      p.setXYZ(i, v.x + bx, v.y + by, v.z + bz);
      v.y /= 0.72; v.normalize();
      nrm.setXYZ(i, v.x, v.y, v.z);
    }
    parts.push(prep(g, (i, gg) => {
      const y = gg.attributes.position.getY(i);
      const t = 0.62 + 0.38 * Math.min(1, Math.max(0, (y - 2.6) / 4.2));
      return [0.085 * t, 0.235 * t, 0.07 * t];   // deep glossy mango green
    }, 1));
    shell.push([bx, by, bz, br]);
  }
  // fruit: elongated, hanging from short stalks just outside the lower half of the canopy
  const fruitGeo = () => new THREE.IcosahedronGeometry(1, detail > 1 ? 1 : 0).scale(0.18, 0.27, 0.16);
  for (let n = 0, tries = 0; n < fruits && tries < fruits * 20; tries++) {
    const [bx, by, bz, br] = shell[Math.floor(r() * shell.length)];
    const a = r() * Math.PI * 2, el = 0.35 - r() * 1.05;              // sides and underside of the canopy
    const d = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    const x = bx + d.x * br * 1.04, z = bz + d.z * br * 1.04, y = by + d.y * br * 0.72 * 1.04;
    // must sit on the outside of every canopy lobe (otherwise it's buried)
    if (shell.some(([cx, cy, cz, cr]) => ((x - cx) ** 2 + ((y - cy) / 0.72) ** 2 + (z - cz) ** 2) < (cr * 0.97) ** 2)) continue;
    if (y < 2.2) continue;
    const ripe = r();
    const col = ripe < 0.45 ? [0.95, 0.62, 0.08] : ripe < 0.8 ? [0.98, 0.78, 0.16] : [0.55, 0.62, 0.12];
    const f = fruitGeo().rotateZ((r() - 0.5) * 0.5).translate(x, y - 0.24, z);
    parts.push(prep(f, (i, gg) => {
      const fy = gg.attributes.position.getY(i) - (y - 0.24);
      const blush = Math.max(0, fy) * 2.2;                             // red-orange shoulder near the stalk
      return [Math.min(1, col[0] + blush * 0.05), col[1] * (1 - blush * 0.35), col[2]];
    }, 1));
    if (detail > 1) parts.push(prep(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 3, 1).translate(x, y + 0.02, z), [0.16, 0.2, 0.06], 1));
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

export function placements({ outsideTrees = 380, orchards = 9 } = {}) {
  const r = rng(42);
  const palms = [], trees = [], mangos = [], stones = [], poles = [], glows = [];

  // coconut palms: avenue median, and framing the gate outside
  for (let z = L.SITE - 4; z > -L.RING_IN + 2; z -= 12) palms.push(mat(0, 0, z, 0.9 + r() * 0.2, r() * 6.28));
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) palms.push(mat(s * (L.GATE + 6 + i * 7), 0, L.SITE + 3.5, 0.9 + r() * 0.2, r() * 6.28));

  // mango trees: both kerbs of the avenue, between the palms
  for (let z = L.SITE - 13; z > -L.RING_IN; z -= 12) for (const s of [-1, 1]) mangos.push(mat(s * (L.AVE + 1.6), 0, z, 0.78 + r() * 0.14, r() * 6.28));
  // ...and one in every plot, at the back of the plot so the frontage stays open
  for (const s of [-1, 1]) for (let b = 0; b < L.NB; b++) for (let row = 0; row < 2; row++) for (let c = 0; c < L.NPX; c++) {
    const [x, z] = mangoInPlot(s, b, row, c);
    mangos.push(mat(x, 0, z, 0.56 + r() * 0.12, r() * 6.28));
  }

  // inside the wall verge and the open space: mango with the odd neem
  const vergeM = (L.RING_OUT + L.SITE) / 2;
  const verge = (x, z) => (r() < 0.75 ? mangos : trees).push(mat(x, 0, z, 0.8 + r() * 0.3, r() * 6.28));
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
    (r() < 0.6 ? mangos : trees).push(mat(x, 0, z, 0.75 + r() * 0.4, r() * 6.28));
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
      if (clear(x, z)) mangos.push(mat(x, terrainH(x, z) - 0.2, z, 0.75 + r() * 0.25, r() * 6.28));
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
    trees.push(mat(x, terrainH(x, z) - 0.3, z, 0.8 + r() * 0.7, r() * 6.28));
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
