import * as THREE from "three";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { L, HIGHLIGHT } from "./layout.js";
import * as SH from "./shaders.js";
import * as OB from "./objects.js";
import { SHOTS, PIN_ANCHORS, PIN_SECTION, evalShots, buildKeys, measureSections, sceneOptions, shotFor } from "./shots.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";

gsap.registerPlugin(ScrollTrigger);

const Y_UP = new THREE.Vector3(0, 1, 0);
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Light/atmosphere palette across the evening (display-space RGB).
const PAL = [
  { d: 0.0, zen: [0.25, 0.38, 0.58], hor: [0.93, 0.8, 0.62], sun: [1.0, 0.86, 0.64], sky: [0.27, 0.32, 0.36], bnc: [0.05, 0.06, 0.035], fog: [0.6, 0.66, 0.66], el: 0.3 },
  { d: 0.5, zen: [0.13, 0.12, 0.19], hor: [0.86, 0.48, 0.29], sun: [1.0, 0.56, 0.31], sky: [0.15, 0.14, 0.19], bnc: [0.05, 0.03, 0.025], fog: [0.5, 0.36, 0.31], el: 0.07 },
  { d: 1.0, zen: [0.045, 0.055, 0.1], hor: [0.42, 0.25, 0.22], sun: [0.8, 0.36, 0.2], sky: [0.075, 0.08, 0.115], bnc: [0.02, 0.016, 0.016], fog: [0.21, 0.155, 0.16], el: -0.035 },
];
function palette(d) {
  const i = d < 0.5 ? 0 : 1, a = PAL[i], b = PAL[i + 1];
  const t = Math.min(1, Math.max(0, (d - a.d) / (b.d - a.d)));
  const o = {};
  for (const k of ["zen", "hor", "sun", "sky", "bnc", "fog"]) o[k] = mix3(a[k], b[k], t);
  o.el = a.el + (b.el - a.el) * t;
  return o;
}

export async function createStage({ canvas, reduceMotion }) {
  const coarse = matchMedia("(pointer: coarse)").matches;
  const small = Math.min(innerWidth, innerHeight) < 700;
  const mobile = coarse || small;
  const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const maxDpr = lowEnd ? 1 : mobile ? 1.25 : 1.5;
  let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  let pending = false; // reduced-motion: render-on-demand flag

  // Anti-aliasing (thousands of small leaf/fruit silhouettes stair-step badly without it):
  //  - touch devices: native 4x MSAA. Tile-based mobile GPUs resolve it in-tile, so it's near-free.
  //  - desktop: one FXAA pass. Native MSAA costs integrated desktop GPUs far more (measured: frame p50 16.7 → 180 ms
  //    on the dev laptop's iGPU), FXAA is a single cheap full-screen pass.
  // `dbg` = test-harness switches (scripts/perf.mjs); dbg.noAa turns both off for comparisons.
  const dbg = window.__stageDebug || {};
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: coarse && !dbg.noAa, powerPreference: "high-performance", alpha: false, stencil: false });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // shaders author display-space colour directly
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x0a0907, 1);

  const scene = new THREE.Scene();
  let post = null;
  if (!coarse && !dbg.noAa) {
    const rt = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true, stencilBuffer: false });
    const m = new THREE.ShaderMaterial({ ...FXAAShader, uniforms: THREE.UniformsUtils.clone(FXAAShader.uniforms), depthTest: false, depthWrite: false });
    m.uniforms.tDiffuse.value = rt.texture;
    post = { rt, m, scene: new THREE.Scene(), cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
    post.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m));
  }
  const sizePost = () => {
    if (!post) return;
    const w = Math.max(1, Math.round(W * dpr)), h = Math.max(1, Math.round(H * dpr));
    post.rt.setSize(w, h); post.m.uniforms.resolution.value.set(1 / w, 1 / h);
  };
  const draw = () => {
    if (!post) { renderer.render(scene, camera); return; }
    renderer.setRenderTarget(post.rt); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(post.scene, post.cam);
  };
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 9500);

  /* ---------- shared uniforms ---------- */
  const U = {
    uSunDir: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Vector3() },
    uSkyCol: { value: new THREE.Vector3() }, uBounce: { value: new THREE.Vector3() },
    uFogCol: { value: new THREE.Vector3() }, uFogDen: { value: 1 / 3300 },
    uTime: { value: 0 }, uDusk: { value: 0 }, uLamps: { value: 0 },
  };
  const ground = {
    ...U, uReveal: { value: reduceMotion ? 1 : 0 }, uHi: { value: 0 }, uMap: { value: 0 },
    uHiRect: { value: new THREE.Vector4(HIGHLIGHT.x0, HIGHLIGHT.z0, HIGHLIGHT.x1, HIGHLIGHT.z1) },
    uDetail: { value: new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1) },   // neutral grey (=1.0) until the photo loads
  };
  // photo-derived ground detail (CC0 Poly Haven grass / laterite soil / asphalt, packed into RGB); the flat colours
  // render until it arrives, then it fades the real texture in on top of them
  ground.uDetail.value.needsUpdate = true;
  new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}media/ground-detail.jpg`, (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    ground.uDetail.value = t;
  });
  const skyU = { uZenith: { value: new THREE.Vector3() }, uHorizon: { value: new THREE.Vector3() }, uSunCol: U.uSunCol, uSunDir: U.uSunDir, uFogCol: U.uFogCol, uTime: U.uTime, uDusk: U.uDusk };

  /* ---------- terrain (polar grid: dense near the site, coarse toward the horizon) ---------- */
  {
    const NR = mobile ? 80 : 110, NA = mobile ? 120 : 168, R = 6200;
    const pos = [], idx = [];
    pos.push(0, 0, 0);
    for (let i = 1; i <= NR; i++) {
      const r = R * Math.pow(i / NR, 2.2);
      for (let j = 0; j < NA; j++) { const a = (j / NA) * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); }
    }
    for (let j = 0; j < NA; j++) idx.push(0, 1 + ((j + 1) % NA), 1 + j);
    for (let i = 1; i < NR; i++) for (let j = 0; j < NA; j++) {
      const a = 1 + (i - 1) * NA + j, b = 1 + (i - 1) * NA + ((j + 1) % NA), c = a + NA, d = b + NA;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: SH.groundVert, fragmentShader: SH.groundFrag, uniforms: ground }));
    m.frustumCulled = false; m.name = "ground";
    scene.add(m);
  }

  /* ---------- sky (drawn last so early-z rejects everything behind the land) ---------- */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(8000, 32, 16),
    new THREE.ShaderMaterial({ vertexShader: SH.skyVert, fragmentShader: SH.skyFrag, uniforms: skyU, side: THREE.BackSide, depthWrite: false })
  );
  sky.renderOrder = 10; sky.frustumCulled = false; sky.name = "sky";
  scene.add(sky);

  /* ---------- props ---------- */
  const lit = (extra = {}) => new THREE.ShaderMaterial({
    vertexShader: SH.litVert, fragmentShader: SH.litFrag, vertexColors: true,
    uniforms: { ...U, uSway: { value: extra.sway ?? 0 }, uWrap: { value: extra.wrap ?? 0.15 }, uEmissive: { value: new THREE.Vector3(...(extra.emissive || [0, 0, 0])) } },
    side: extra.side ?? THREE.FrontSide,
    defines: { SURFACE_DETAIL: mobile || dbg.noDetail ? 0 : 1 },   // per-pixel leaf/skin detail: desktop only
  });
  const place = placements();
  function placements() {
    return OB.placements({ outsideTrees: mobile ? 210 : 520, orchards: mobile ? 6 : 10 });
  }
  const instanced = (geo, mat, list) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    return im;
  };

  scene.add(new THREE.Mesh(OB.wallGeometry(), lit({ wrap: 0.3 })));
  scene.add(new THREE.Mesh(OB.gateGeometry(), lit({ wrap: 0.3 })));
  scene.add(new THREE.Mesh(OB.gateTrimGeometry(), lit({ emissive: [0.5, 0.36, 0.12] })));
  scene.add(instanced(OB.stoneGeometry(), lit({ wrap: 0.4 }), place.stones));
  scene.add(instanced(OB.poleGeometry(), lit(), place.poles));

  const treeMat = lit({ sway: 1, wrap: 0.55 });
  const trees = instanced(OB.treeGeometry(), treeMat, place.trees);
  const tint = new THREE.Color();
  // per-tree hue drift: some olive/yellow-green, some deep blue-green, some dry, never one flat green
  const hueTint = (j, k) => { const h = (j * 0.7548776) % 1, v = (j * 0.5698403) % 1; return tint.setRGB(k * (0.88 + h * 0.3), k * (0.94 + v * 0.1), k * (1.06 - h * 0.2)); };
  for (let i = 0; i < place.trees.length; i++) { const k = 0.82 + ((i * 0.618) % 1) * 0.36; trees.setColorAt(i, hueTint(i, k)); }
  trees.instanceColor.needsUpdate = true;
  trees.name = "trees";
  scene.add(trees);
  // mango trees: full-detail (with fruit) inside the compound, a light fruitless version for the far orchards.
  // ~290 trees are instanced, so per-tree triangles dominate the frame cost on integrated GPUs: keep fruit low-poly
  // (smooth normals hide the facets) and spend the triangles on the canopy silhouette instead.
  const mangoMat = lit({ sway: 1, wrap: 0.5 });
  const mangoTint = (im, off) => {
    for (let i = 0; i < im.count; i++) { const j = i + off, k = 0.86 + ((j * 0.618) % 1) * 0.28; im.setColorAt(i, hueTint(j, k)); }
    im.instanceColor.needsUpdate = true;
  };
  const mangos = instanced(OB.mangoGeometry(mobile ? { fruits: 22, detail: 1, seg: 5 } : { fruits: 30, detail: 2, seg: 7 }), mangoMat, place.mangos.slice(0, place.insideMangos));
  mangoTint(mangos, 0);
  mangos.name = "mangos";
  scene.add(mangos);
  const orchard = instanced(OB.mangoGeometry({ fruits: 0, detail: 1 }), mangoMat, place.mangos.slice(place.insideMangos));
  mangoTint(orchard, place.insideMangos);
  orchard.name = "orchard";
  scene.add(orchard);

  const palms = instanced(OB.palmGeometry(), lit({ sway: 1, wrap: 0.5, side: THREE.DoubleSide }), place.palms);
  palms.name = "palms";
  scene.add(palms);

  // gate sign
  OB.gateSignTexture().then((tex) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(13, 13 * (112 / 1024)), new THREE.ShaderMaterial({
      uniforms: { ...U, uMap: { value: tex } },
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `${SH.FOG_CHUNK}
        uniform sampler2D uMap; uniform vec3 uSkyCol; uniform float uLamps; varying vec2 vUv; varying vec3 vW;
        void main(){ vec3 t = texture2D(uMap, vUv).rgb; float g = smoothstep(.25,.6,t.r);
          vec3 c = t * (uSkyCol*1.6 + uSunCol*.35) + t * g * (.35 + .9*uLamps);
          gl_FragColor = vec4(applyFog(c, vW), 1.); }`,
    }));
    m.position.set(0, 7.15, L.SITE + 0.66);
    scene.add(m);
    if (reduceMotion) requestRender();
  });

  // lamp glows
  const glowGeo = new THREE.PlaneGeometry(1, 1);
  glowGeo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(new Float32Array(place.glows.map((g) => g.seed)), 1));
  const glows = instanced(glowGeo, new THREE.ShaderMaterial({
    vertexShader: SH.glowVert, fragmentShader: SH.glowFrag, uniforms: U,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }), place.glows.map((g) => g.m));
  glows.renderOrder = 12; glows.name = "glows";
  scene.add(glows);

  // soft cast shadows for trees, palms and gate pillars (one instanced draw)
  const sunAz = 0.38;
  const anti = new THREE.Vector2(Math.cos(sunAz), Math.sin(sunAz)); // shadows fall east-south-east
  const shadowList = [];
  const P = new THREE.Vector3(), Qt = new THREE.Quaternion(), Sc = new THREE.Vector3();
  const ry = Math.atan2(-anti.x, -anti.y);
  const addShadow = (x, z, y, w, len) => {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x + anti.x * len * 0.42, y + 0.04, z + anti.y * len * 0.42),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry)),
      new THREE.Vector3(w, len, 1));
    shadowList.push(m);
  };
  for (const m of place.trees) { m.decompose(P, Qt, Sc); addShadow(P.x, P.z, P.y + 0.3, 5.2 * Sc.x, 17 * Sc.x); }
  // mango shadows inside the compound only: the far orchards are lost in haze, and their decals are pure overdraw
  for (const m of place.mangos.slice(0, place.insideMangos)) { m.decompose(P, Qt, Sc); addShadow(P.x, P.z, P.y + 0.2, 7 * Sc.x, 19 * Sc.x); }
  for (const m of place.palms) { m.decompose(P, Qt, Sc); addShadow(P.x, P.z, 0, 4.2 * Sc.x, 22 * Sc.x); }
  for (const s of [-1, 1]) addShadow(s * (L.GATE + 0.8), L.SITE, 0, 2.6, 26);
  const shadowMat = new THREE.ShaderMaterial({
    vertexShader: SH.shadowVert, fragmentShader: SH.shadowFrag,
    uniforms: { ...U, uStrength: { value: 0.5 } }, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const shadows = instanced(new THREE.PlaneGeometry(1, 1), shadowMat, shadowList);
  shadows.renderOrder = 1; shadows.name = "shadows";
  scene.add(shadows);

  // birds
  const NB = 13;
  const bg = OB.birdGeometry();
  const ba = new Float32Array(NB * 4);
  for (let i = 0; i < NB; i++) { ba.set([i * 1.7 + Math.random() * 0.8, (Math.random() - 0.5) * 26, (Math.random() - 0.5) * 10, Math.random()], i * 4); }
  bg.setAttribute("aBird", new THREE.InstancedBufferAttribute(ba, 4));
  const birds = new THREE.InstancedMesh(bg, new THREE.ShaderMaterial({ vertexShader: SH.birdVert, fragmentShader: SH.birdFrag, uniforms: U, side: THREE.DoubleSide }), NB);
  birds.frustumCulled = false; birds.name = "birds";
  scene.add(birds);

  const pinEls = {};
  /* ---------- sizing ---------- */
  const stageEl = canvas.parentElement;
  let W = 1, H = 1, aspect = 1;
  function resize() {
    W = stageEl.clientWidth; H = stageEl.clientHeight; aspect = W / H;
    renderer.setSize(W, H, false);
    sizePost();
    for (const k in pinEls) pinEls[k].w = 0;
    if (reduceMotion) requestRender();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stageEl);
  resize();

  /* ---------- scroll → shot keys ---------- */
  // Section geometry is measured after every ScrollTrigger refresh, i.e. after motion.js has laid out its
  // pinned sections (their pin spacing is part of the section heights, so the shots stretch over the pins).
  let keys = [{ y: 0, shot: SHOTS.hero }, { y: 1e9, shot: SHOTS.hero }];
  let sceneOpt = sceneOptions();
  function rebuild() {
    sceneOpt = sceneOptions();
    keys = buildKeys(measureSections(), innerHeight, sceneOpt);
    for (const k in pinEls) pinEls[k].w = 0;
  }
  ScrollTrigger.addEventListener("refresh", rebuild);
  rebuild();

  let lenis = null;
  if (!reduceMotion) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
    lenis.on("scroll", ScrollTrigger.update);
    document.documentElement.classList.add("lenis");
    window.__lenis = lenis;
  }

  /* ---------- pins ---------- */
  // A label only shows while (1) the camera is on its shot, (2) its section is the active one, and (3) it is not
  // covered by copy. Phones scroll the copy over the scene, so without (2)/(3) the plot label used to show
  // through the hero facts rail. Beside its point it tries the right, then the left, before giving up.
  const PIN_COVERS = { plot: [".hero-copy", ".hero .facts", ".offer .ticket"], site: [".location .loc-card", ".why .points"] };
  document.querySelectorAll(".pin").forEach((el) => {
    const k = el.dataset.pin;
    if (!PIN_ANCHORS[k]) return;
    pinEls[k] = { el, on: false, p: v3(PIN_ANCHORS[k]), sec: PIN_SECTION[k], covers: PIN_COVERS[k].map((s) => document.querySelector(s)).filter(Boolean) };
  });
  const proj = new THREE.Vector3();
  const hits = (pin, x0, y0) => {
    for (const c of pin.covers) {
      const r = c.getBoundingClientRect();
      if (r.bottom > 0 && r.top < H && x0 < r.right && x0 + pin.w > r.left && y0 < r.bottom && y0 + pin.h > r.top) return true;
    }
    return false;
  };
  function updatePins(shot) {
    const scene = document.body.dataset.scene;
    for (const k in pinEls) {
      const pin = pinEls[k];
      const want = shot.pin === k && shot.pinW > 0.6 && scene === pin.sec;
      let vis = false;
      if (want) {
        proj.copy(pin.p).project(camera);
        vis = proj.z < 1 && Math.abs(proj.x) < 1.1 && Math.abs(proj.y) < 1.1;
        if (vis) {
          if (!pin.w) { pin.w = pin.el.offsetWidth; pin.h = pin.el.offsetHeight; } // measured once (and after resizes)
          const x = (proj.x * 0.5 + 0.5) * W, y = (-proj.y * 0.5 + 0.5) * H;
          // narrow screens: label stacked above the point; otherwise beside it (right, else left)
          let mode = W < 600 ? "above" : "", tx = 0, ty = 0;
          const place = (m) => {
            tx = m === "above" ? Math.min(Math.max(x - pin.w / 2, 12), W - pin.w - 12) : m === "flip" ? x - pin.w : x;
            ty = m === "above" ? y - pin.h : y - pin.h / 2;
          };
          place(mode);
          if (mode !== "above" && (tx + pin.w > W - 12 || hits(pin, tx, ty))) { mode = "flip"; place(mode); }
          if (tx < 0 || hits(pin, tx, ty)) vis = false;
          else if (mode !== pin.mode) { pin.el.classList.remove("flip", "above"); if (mode) pin.el.classList.add(mode); pin.mode = mode; pin.w = 0; vis = pin.on; }
          else pin.el.style.transform = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0)`;
        }
      }
      if (vis !== pin.on) { pin.on = vis; pin.el.classList.toggle("on", vis); }
    }
  }

  // Screen position (px) of a label's anchor when the camera rests on a given shot: lets copy hand off to a
  // label before it appears (the hero's gold "1" flies to the plot). Same framing maths as applyShot, no drift.
  const aimCam = new THREE.PerspectiveCamera(38, 1, 0.5, 9500);
  function pinAt(k, shotName) {
    if (!PIN_ANCHORS[k] || !SHOTS[shotName]) return null;
    const s = shotFor(shotName, sceneOpt);
    aimCam.fov = aspect < 1.25 ? Math.min(74, 2 * Math.atan(Math.tan((s.fov * Math.PI) / 360) * (1.25 / aspect) ** 0.72) * 180 / Math.PI) : s.fov;
    aimCam.aspect = aspect;
    aimCam.position.set(...s.p);
    if (s.p[1] > 300) aimCam.up.set(0, 0, -1).lerp(Y_UP, 1 - Math.min(1, (s.p[1] - 300) / 300)).normalize();
    else aimCam.up.set(0, 1, 0);
    aimCam.lookAt(...s.t);
    aimCam.updateProjectionMatrix();
    const wide = Math.min(1, Math.max(0, (aspect - 0.85) / 0.4));
    const e = aimCam.projectionMatrix.elements;
    e[8] = -(s.sx * wide + (s.mx || 0) * (1 - wide)); e[9] = -(s.sy * (1 - wide) + (s.dy || 0) * wide);
    aimCam.updateMatrixWorld();
    proj.set(...PIN_ANCHORS[k]).project(aimCam);
    return { x: (proj.x * 0.5 + 0.5) * W, y: (-proj.y * 0.5 + 0.5) * H };
  }

  /* ---------- camera state (damped toward the scroll-derived shot) ---------- */
  const want = { p: [0, 0, 0], t: [0, 0, 0], fov: 38, sx: 0, sy: 0, dy: 0, mx: 0, dusk: 0, map: 0, hi: 0, pin: null, pinW: 1 };
  const cur = { p: new THREE.Vector3(), t: new THREE.Vector3(), fov: 38, sx: 0, sy: 0, dy: 0, mx: 0, dusk: 0, map: 0, hi: 0 };
  evalShots(keys, scrollY, want);
  cur.p.set(want.p[0] * 1.18, want.p[1] * 1.35 + 30, want.p[2] * 1.12); // intro: settle in from higher and further
  if (reduceMotion) cur.p.set(...SHOTS.hero.p);
  cur.t.set(...want.t); cur.fov = want.fov; cur.sx = want.sx; cur.sy = want.sy; cur.dusk = want.dusk;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const onPointer = (e) => { pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = e.clientY / innerHeight * 2 - 1; };
  if (!coarse && !reduceMotion) addEventListener("pointermove", onPointer, { passive: true });

  const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
  let lastPal = -1;
  const rootStyle = document.documentElement.style;
  let cssSun = "";
  function applyShot(dt, time) {
    if (!reduceMotion) evalShots(keys, window.scrollY, want);
    else Object.assign(want, SHOTS.hero, { pinW: 1, pin: null });
    const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 3.4);
    tmpP.set(...want.p); tmpT.set(...want.t);
    cur.p.lerp(tmpP, k); cur.t.lerp(tmpT, k);
    for (const f of ["fov", "sx", "sy", "dy", "mx", "dusk", "map", "hi"]) cur[f] += (want[f] - cur[f]) * k;

    // portrait screens: widen vertical FOV so the horizontal framing survives
    const fov = aspect < 1.25 ? Math.min(74, 2 * Math.atan(Math.tan((cur.fov * Math.PI) / 360) * (1.25 / aspect) ** 0.72) * 180 / Math.PI) : cur.fov;
    camera.fov = fov; camera.aspect = aspect;

    // idle drift + pointer parallax, proportional to shot distance
    const dist = cur.p.distanceTo(cur.t);
    pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 2.5);
    pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 2.5);
    fwd.subVectors(cur.t, cur.p).normalize();
    right.crossVectors(fwd, camera.up).normalize();
    up.crossVectors(right, fwd);
    const drift = reduceMotion ? 0 : dist * 0.012;
    camera.position.copy(cur.p)
      .addScaledVector(right, Math.sin(time * 0.11) * drift + pointer.sx * dist * 0.035)
      .addScaledVector(up, Math.sin(time * 0.17) * drift * 0.5 - pointer.sy * dist * 0.02);
    if (cur.p.y > 300) camera.up.set(0, 0, -1).lerp(Y_UP, 1 - Math.min(1, (cur.p.y - 300) / 300)).normalize();
    else camera.up.set(0, 1, 0);
    camera.lookAt(cur.t);
    camera.updateProjectionMatrix();
    // lens shift: frame the subject into the negative space beside the copy
    const wide = Math.min(1, Math.max(0, (aspect - 0.85) / 0.4));
    const e = camera.projectionMatrix.elements;
    e[8] = -(cur.sx * wide + cur.mx * (1 - wide)); e[9] = -(cur.sy * (1 - wide) + cur.dy * wide);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    sky.position.copy(camera.position);

    // atmosphere (only recompute when dusk moved noticeably)
    if (Math.abs(cur.dusk - lastPal) > 0.002) {
      lastPal = cur.dusk;
      const pl = palette(cur.dusk);
      const el = pl.el;
      U.uSunDir.value.set(-Math.cos(sunAz) * Math.cos(el), Math.sin(el), -Math.sin(sunAz) * Math.cos(el)).normalize();
      U.uSunCol.value.set(...pl.sun); U.uSkyCol.value.set(...pl.sky); U.uBounce.value.set(...pl.bnc); U.uFogCol.value.set(...pl.fog);
      skyU.uZenith.value.set(...pl.zen); skyU.uHorizon.value.set(...pl.hor);
      U.uDusk.value = cur.dusk;
      // the page's accents pick up the scene's light: warm gold in the afternoon, ember toward blue hour.
      // Desktop only (the CSS that reads it is too), and quantised: a root custom property restyles the whole page.
      if (!mobile) {
        const sun = pl.sun.map((c) => Math.round(Math.min(1, c) * 63) * 4).join(",");
        if (sun !== cssSun) { cssSun = sun; rootStyle.setProperty("--scene-sun", sun); }
      }
      U.uLamps.value = Math.min(1, Math.max(0, (cur.dusk - 0.3) / 0.5));
      shadowMat.uniforms.uStrength.value = 0.55 * (1 - Math.min(1, Math.max(0, (cur.dusk - 0.45) / 0.45)));
    }
    ground.uHi.value = cur.hi; ground.uMap.value = cur.map;
    updatePins(reduceMotion ? { pin: null } : want);
  }

  /* ---------- adaptive quality ---------- */
  // Frame interval is vsync-capped, so "healthy" ≈ one refresh (≤ ~17.5 ms at 60 Hz).
  // Two consecutive slow windows → step DPR down; three healthy windows → step back up (bounded).
  let acc = 0, frames = 0, lastCheck = performance.now() + 3000, upgrades = 0, tier = 0, slow = 0, good = 0;
  const targetDpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const setDpr = (v) => { dpr = v; renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); sizePost(); };
  let frameGap = lowEnd ? 1000 / 31 : 0, lastDraw = 0;   // low-core devices start capped at ~30 fps
  function adapt(dt, now) {
    if (dbg.noAdapt || now < lastCheck - 1500) return;           // ignore start-up (shader compile, first uploads)
    if (dt > 0 && dt < 250) { acc += dt; frames++; }
    if (now - lastCheck < 1500 || frames < 30) return;
    const avg = acc / frames; acc = 0; frames = 0; lastCheck = now;
    const base = frameGap || 16.7;
    if (avg > base * 1.32) { slow++; good = 0; } else if (avg < base * 1.05) { good++; slow = 0; } else { slow = good = 0; }
    if (slow >= 2) {
      slow = 0;
      if (dpr > 0.75) setDpr(Math.max(0.75, dpr - 0.25));
      else if (tier === 1) { tier = 2; frameGap = 1000 / 31; }   // still slow at the floor: cap at ~30 fps
      else if (tier === 0) { tier = 1; birds.visible = false; shadows.visible = false; trees.count = place.insideCount; orchard.count = 0; }
    } else if (good >= 3 && dpr < targetDpr && upgrades < 3) {
      good = 0; upgrades++; setDpr(Math.min(targetDpr, dpr + 0.25));
    }
    window.__stageStats = { avg: +avg.toFixed(2), dpr, tier };
  }

  /* ---------- loop ---------- */
  let last = performance.now(), t0 = last, shown = false, rafOn = false;
  function frame(now) {
    if (frameGap && now - lastDraw < frameGap - 1) return;   // cheap skip: no draw, no allocation
    lastDraw = now;
    const dt = Math.min(0.1, (now - last) / 1000);
    adapt(now - last, now);
    last = now;
    lenis?.raf(now);
    U.uTime.value = (now - t0) / 1000;
    applyShot(dt, U.uTime.value);
    draw();
    if (!shown) reveal();
  }
  function reveal() {
    shown = true;
    canvas.classList.add("on");
    if (!reduceMotion) gsap.to(ground.uReveal, { value: 1, duration: 4.2, delay: 0.4, ease: "power2.inOut" });
  }
  function start() { if (rafOn || reduceMotion) return; rafOn = true; last = performance.now(); renderer.setAnimationLoop(frame); }
  function stop() { rafOn = false; renderer.setAnimationLoop(null); }
  function requestRender() {
    if (pending) return; pending = true;
    requestAnimationFrame(() => { pending = false; applyShot(0, 0); draw(); if (!shown) { shown = true; canvas.classList.add("on"); } });
  }

  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVis);
  renderer.compile(scene, camera);
  if (reduceMotion) requestRender(); else start();
  function dispose() {
    stop();
    document.removeEventListener("visibilitychange", onVis);
    removeEventListener("pointermove", onPointer);
    ScrollTrigger.removeEventListener("refresh", rebuild);
    ro.disconnect();
    lenis?.destroy();
    scene.traverse((o) => { o.geometry?.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose()); });
    if (post) { post.rt.dispose(); post.m.dispose(); post.scene.children[0].geometry.dispose(); }
    renderer.dispose();
  }
  const api = { renderer, stop, start, scene, pinAt, dispose };
  window.__stage = api;
  ScrollTrigger.refresh(); // copy that hands off to scene labels (motion.js) re-reads their screen positions
  return api;
}
