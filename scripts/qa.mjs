// Cross-device / cross-browser QA. Re-runnable, headless, prints a pass/fail table.
//
//   node scripts/qa.mjs                       # full matrix (11 viewports x chromium/webkit/firefox x home+portal)
//   node scripts/qa.mjs --quick               # 4 representative viewports, still all 3 browsers
//   node scripts/qa.mjs --browsers=webkit --devices="iPhone SE,iPhone 14"
//   node scripts/qa.mjs --url=http://localhost:4173 --shots     # --shots also saves screenshots to .shots/qa/
//
// Needs a production build (`npm run build`). If --url is not reachable it starts `vite preview` itself.
// SAFETY: every request to *.supabase.co is intercepted and answered with fake data -- nothing ever
// reaches the real database (a test that sees an un-mocked supabase request fails).
import { chromium, webkit, firefox, devices } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || "").split("=").slice(1).join("=") || d;
const URL_ = flag("url", "http://localhost:4173").replace(/\/$/, "");
const quick = args.includes("--quick");
const shots = args.includes("--shots");
const engines = { chromium, webkit, firefox };
const wantBrowsers = flag("browsers", "chromium,webkit,firefox").split(",");
const GPU_ARGS = ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"];

/* ---------- device matrix ---------- */
const D = (name, label = name, over = {}) => ({ label, desc: { ...devices[name], ...over } });
const MATRIX = [
  D("iPhone SE", "iPhone SE-1 320x568"),
  D("iPhone 8", "iPhone SE 375x667"),
  D("iPhone 14", "iPhone 14 390x844"),
  D("Pixel 7", "Pixel 7 412x915"),
  D("Galaxy S8", "Android 360x740"),
  D("iPad Mini", "iPad Mini portrait 768x1024"),
  D("iPad Mini landscape", "iPad Mini landscape 1024x768"),
  D("iPad Pro 11", "iPad Pro 1024x1366", { viewport: { width: 1024, height: 1366 }, screen: { width: 1024, height: 1366 } }),
  { label: "Laptop 1280x800", desc: { viewport: { width: 1280, height: 800 } } },
  { label: "Desktop 1920x1080", desc: { viewport: { width: 1920, height: 1080 } } },
  D("iPhone 14 landscape", "Phone landscape 844x390"),
];
const QUICK = ["iPhone SE-1 320x568", "iPhone SE 375x667", "iPhone 14 390x844", "iPad Mini portrait 768x1024", "Laptop 1280x800"];
const only = flag("devices", "");
const matrix = MATRIX.filter((m) => (only ? only.split(",").some((o) => m.label.toLowerCase().includes(o.trim().toLowerCase())) : quick ? QUICK.includes(m.label) : true));

/** Context options valid for the engine (Firefox has no isMobile; foreign UAs are dropped so each engine sends its own). */
function ctxOpts(desc, engine) {
  const o = { ...desc };
  delete o.defaultBrowserType;
  if (engine !== "webkit" && /iPhone|iPad/.test(o.userAgent || "")) delete o.userAgent;
  if (engine === "firefox") { delete o.isMobile; delete o.userAgent; }
  return o;
}

/* ---------- Supabase mock (never hits the network) ---------- */
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
function mockSupabase(ctx, state) {
  return ctx.route(/supabase\.co/, (route) => {
    const req = route.request();
    state.hits++;
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (/\/rest\/v1\/leads/.test(req.url()) && req.method() === "POST") {
      state.leadPosts++;
      return state.leadMode === "error"
        ? route.fulfill({ status: 500, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify({ message: "mock failure" }) })
        : route.fulfill({ status: 201, headers: CORS, body: "" });
    }
    if (/\/auth\/v1\//.test(req.url())) return route.fulfill({ status: 401, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify({ message: "mock: not signed in" }) });
    return route.fulfill({ status: 200, headers: { ...CORS, "content-type": "application/json" }, body: "[]" });
  });
}

/* ---------- in-page helpers ---------- */
// Elements that poke outside the viewport horizontally and are not legitimately clipped/hidden.
const overflowers = () => {
  const vw = document.documentElement.clientWidth, out = [];
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX !== "visible") { const r = p.getBoundingClientRect(); if (r.left >= -1 && r.right <= vw + 1) return true; }
      if (cs.position === "fixed") return true;                        // fixed layers (stage, pins) are viewport-bound
    }
    return false;
  };
  for (const el of document.body.querySelectorAll("*")) {
    if (el.closest("svg,.pins,.stage,[hidden]")) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (r.right > vw + 1.5 || r.left < -1.5) { if (!clipped(el)) out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}[${Math.round(r.left)}..${Math.round(r.right)}]`); }
  }
  return { scrollW: document.scrollingElement.scrollWidth - vw, bad: out.slice(0, 4) };
};
const FOCUS_RING = () => {
  const e = document.activeElement; if (!e || e === document.body) return "none";
  const cs = getComputedStyle(e);
  const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
  const shadow = cs.boxShadow && cs.boxShadow !== "none";
  return (outline || shadow) ? "ok" : `no-ring:${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0] || e.id}`;
};

/* ---------- result bookkeeping ---------- */
const rows = [];            // {device, browser, page, checks:{name:[ok,note]}, errors:[]}
const mkRow = (device, browser, page) => { const r = { device, browser, page, checks: {}, info: {}, errors: [] }; rows.push(r); return r; };
const check = (row, name, ok, note = "") => { row.checks[name] = [!!ok, ok ? "" : note]; };
const safe = async (row, name, fn) => { try { await fn(); } catch (e) { check(row, name, false, "threw: " + String(e.message).split("\n")[0].slice(0, 120)); } };
const shotDir = ".shots/qa";
if (shots) mkdirSync(shotDir, { recursive: true });
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function attachErrorCollectors(page, row, gate) {
  const add = (m) => gate.on && row.errors.push(m.slice(0, 160));
  page.on("pageerror", (e) => add("pageerror: " + e.message));
  page.on("console", (m) => m.type() === "error" && add("console: " + m.text()));
  page.on("requestfailed", (r) => { const u = r.url(); if (u.startsWith(URL_) && !/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(r.failure()?.errorText || "")) add("requestfailed: " + u.replace(URL_, "")); });
  page.on("response", (r) => { if (gate.on && r.url().startsWith(URL_) && r.status() >= 400) add(`http ${r.status()}: ${r.url().replace(URL_, "")}`); });
}

/* ---------- homepage ---------- */
async function testHome(browser, engine, dev) {
  const row = mkRow(dev.label, engine, "home");
  const state = { hits: 0, leadPosts: 0, leadMode: "ok" };
  const gate = { on: true };
  const ctx = await browser.newContext(ctxOpts(dev.desc, engine));
  await mockSupabase(ctx, state);
  await ctx.addInitScript(`window.__ov = ${overflowers.toString()}`);
  const page = await ctx.newPage();
  attachErrorCollectors(page, row, gate);
  const vw = dev.desc.viewport.width, vh = dev.desc.viewport.height;
  const touch = !!dev.desc.hasTouch;
  await page.goto(URL_ + "/", { waitUntil: "load" });
  await page.waitForTimeout(2800);

  // 3D or graceful fallback
  await safe(row, "3d/fallback", async () => {
    const st = await page.waitForFunction(() => (document.querySelector("#scene.on") ? "3d" : document.body.classList.contains("no-webgl") ? "fallback" : null), null, { timeout: 12000 }).then((h) => h.jsonValue());
    row.info.stage = st;
    check(row, "3d/fallback", true);
  });

  await safe(row, "no-overflow", async () => {
    const o = await page.evaluate(overflowers);
    check(row, "no-overflow", o.scrollW <= 0 && !o.bad.length, `scrollW+${o.scrollW} ${o.bad.join(" ")}`);
  });

  await safe(row, "hero-fit", async () => {
    const h = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const nav = r("#nav"), cta = r(".hero-cta"), facts = r(".facts"), copy = r(".hero-copy"), pres = r(".presents");
      return { navB: nav.bottom, ctaB: cta.bottom, factsT: facts.top, factsB: facts.bottom, copyB: copy.bottom, presT: pres.top, ih: innerHeight };
    });
    const land = vw > vh && vh < 520;                       // landscape phones: hero is intentionally taller than the screen
    const ctaOk = h.ctaB <= h.ih;                           // primary CTA above the fold
    const noOverlap = h.copyB <= h.factsT + 1 && h.presT >= h.navB - 2;
    row.info.factsInFold = h.factsB <= h.ih;
    check(row, "hero-fit", (land || ctaOk) && noOverlap, `ctaBottom=${Math.round(h.ctaB)}/${h.ih} copyB=${Math.round(h.copyB)} factsT=${Math.round(h.factsT)} presT=${Math.round(h.presT)} navB=${Math.round(h.navB)}`);
    if (shots) await page.screenshot({ path: `${shotDir}/${slug(engine + "-" + dev.label)}-hero.png` });
  });

  // walk every section: reveals appear, no overflow at any scroll position
  await safe(row, "sections", async () => {
    const bad = [];
    for (const id of ["offer", "venture", "why", "location", "enquire"]) {
      await page.evaluate((id) => {
        const el = document.getElementById(id), y = el.getBoundingClientRect().top + scrollY;
        window.__lenis ? window.__lenis.scrollTo(y + 40, { immediate: true }) : scrollTo(0, y + 40);
      }, id);
      await page.waitForTimeout(900);
      const s = await page.evaluate((id) => {
        const hidden = [...document.querySelectorAll(`#${id} .reveal`)].filter((e) => { const r = e.getBoundingClientRect(); return r.top < innerHeight * 0.9 && r.bottom > 0 && parseFloat(getComputedStyle(e).opacity) < 0.95; }).length;
        return { hidden, ov: __ov() };
      }, id);
      if (s.hidden) bad.push(`${id}: ${s.hidden} reveal(s) invisible`);
      if (s.ov.scrollW > 0 || s.ov.bad.length) bad.push(`${id}: overflow ${s.ov.bad.join(" ")}`);
    }
    check(row, "sections", !bad.length, bad.join("; "));
  });

  // enquiry form: validation, no iOS zoom, error + success with mocked network
  await safe(row, "form", async () => {
    // regression for "enquire form invisible on mobile": a tall panel peeking 100px into the viewport must already be revealed
    await page.evaluate(() => { const y = document.querySelector(".enq-panel").getBoundingClientRect().top + scrollY - (innerHeight - 100); window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y); });
    await page.waitForTimeout(1300);
    const peek = await page.evaluate(() => +getComputedStyle(document.querySelector(".enq-panel")).opacity);
    await page.evaluate(() => { const y = document.querySelector("#enquireForm").getBoundingClientRect().top + scrollY - 120; window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y); });
    await page.waitForTimeout(1200);
    const vis = await page.evaluate(() => { const f = document.querySelector("#enquireForm").getBoundingClientRect(), p = document.querySelector(".enq-panel"); return { op: +getComputedStyle(p).opacity, w: f.width, h: f.height }; });
    const sizes = await page.evaluate(() => [...document.querySelectorAll("#enquireForm input")].map((i) => parseFloat(getComputedStyle(i).fontSize)));
    const notes = [];
    if (peek < 0.95) notes.push(`enquire panel still invisible with 100px in view (opacity ${peek})`);
    if (vis.op < 0.95 || vis.h < 50) notes.push(`form not visible (opacity ${vis.op}, h ${vis.h})`);
    if (sizes.some((s) => s < 16)) notes.push(`input font <16px (${sizes.join(",")}) => iOS zoom`);
    // validation: empty submit sends nothing and flags fields
    await page.click('#enquireForm button[type="submit"]');
    await page.waitForTimeout(300);
    const v = await page.evaluate(() => ({ n: document.getElementById("enqName").getAttribute("aria-invalid"), focus: document.activeElement.id }));
    if (v.n !== "true") notes.push("empty submit not flagged");
    if (state.leadPosts) notes.push("empty submit hit the network");
    // server error
    state.leadMode = "error"; gate.on = false;
    await page.fill("#enqName", "QA Tester"); await page.fill("#enqPhone", "9848000000");
    await page.click('#enquireForm button[type="submit"]');
    await page.waitForFunction(() => !document.getElementById("enqError").hidden, null, { timeout: 8000 }).catch(() => notes.push("error state never shown"));
    const btn = await page.evaluate(() => { const b = document.querySelector('#enquireForm button[type="submit"]'); return { dis: b.disabled, t: b.textContent }; });
    if (btn.dis) notes.push("submit stuck disabled after error");
    gate.on = true;
    // success
    state.leadMode = "ok";
    await page.click('#enquireForm button[type="submit"]');
    await page.waitForFunction(() => !document.getElementById("enqSuccess").hidden, null, { timeout: 8000 }).catch(() => notes.push("success state never shown"));
    const ok = await page.evaluate(() => ({ form: document.getElementById("enquireForm").hidden, focus: document.activeElement.id }));
    if (!ok.form) notes.push("form still visible after success");
    if (ok.focus !== "enqSuccess") notes.push("focus not moved to success message");
    if (state.leadPosts !== 2) notes.push(`expected 2 mocked POSTs, saw ${state.leadPosts}`);
    check(row, "form", !notes.length, notes.join("; "));
    if (shots) await page.screenshot({ path: `${shotDir}/${slug(engine + "-" + dev.label)}-form-success.png` });
  });

  // nav + anchors (fresh page so the form state doesn't matter)
  await page.evaluate(() => (window.__lenis ? window.__lenis.scrollTo(0, { immediate: true }) : scrollTo(0, 0)));
  await page.waitForTimeout(500);
  const burger = await page.isVisible("#menuBtn");
  if (burger) {
    await safe(row, "menu", async () => {
      const n = [];
      await page.click("#menuBtn"); await page.waitForTimeout(700);
      const o = await page.evaluate(() => ({ exp: menuBtn.getAttribute("aria-expanded"), vis: getComputedStyle(menu).display !== "none" && +getComputedStyle(menu).opacity > 0.9, focusIn: menu.contains(document.activeElement), lock: getComputedStyle(document.body).overflow, ov: __ov().bad.length }));
      if (o.exp !== "true" || !o.vis) n.push("menu did not open");
      if (!o.focusIn) n.push("focus not moved into menu");
      if (o.lock !== "hidden") n.push("page not scroll-locked while open");
      if (shots) await page.screenshot({ path: `${shotDir}/${slug(engine + "-" + dev.label)}-menu.png` });
      await page.keyboard.press("Escape"); await page.waitForTimeout(700);
      const c = await page.evaluate(() => ({ exp: menuBtn.getAttribute("aria-expanded"), hidden: menu.hidden, focus: document.activeElement.id }));
      if (c.exp !== "false" || !c.hidden) n.push("Escape did not close");
      if (c.focus !== "menuBtn") n.push("focus not returned to button");
      // link inside the menu closes it AND scrolls
      await page.click("#menuBtn"); await page.waitForTimeout(600);
      await page.click('#menu a[href="#why"]'); await page.waitForTimeout(3200);
      const a = await page.evaluate(() => ({ top: document.getElementById("why").getBoundingClientRect().top, hidden: menu.hidden, y: scrollY }));
      if (!a.hidden) n.push("menu stayed open after link tap");
      if ((a.top < 0 || a.top > 100)) n.push(`anchor #why landed at ${Math.round(a.top)}px (expected just under the nav)`);
      check(row, "menu+anchor", !n.length, n.join("; "));
    });
  } else {
    await safe(row, "menu+anchor", async () => {
      const n = [];
      for (const id of ["location", "venture"]) {
        await page.click(`.nav-links a[href="#${id}"]`); await page.waitForTimeout(3200);
        const t = await page.evaluate((id) => document.getElementById(id).getBoundingClientRect().top, id);
        if ((t < 0 || t > 100)) n.push(`#${id} landed at ${Math.round(t)}px`);
      }
      const act = await page.evaluate(() => document.querySelector(".nav-links a.active")?.getAttribute("href"));
      if (act !== "#venture") n.push(`active nav link is ${act}`);
      check(row, "menu+anchor", !n.length, n.join("; "));
    });
  }

  // keyboard: desktop-class viewports only (touch devices have no Tab flow)
  if (!touch) await safe(row, "keyboard", async () => {
    await page.goto(URL_ + "/", { waitUntil: "load" }); await page.waitForTimeout(800); await page.evaluate(() => { history.scrollRestoration = "manual"; window.__lenis ? window.__lenis.scrollTo(0, { immediate: true }) : scrollTo(0, 0); document.activeElement?.blur?.(); }); await page.waitForTimeout(300); // fresh page: Tab starts at document start
    const seq = [], bad = [];
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press("Tab");
      const ring = await page.evaluate(FOCUS_RING);
      const name = await page.evaluate(() => document.activeElement.className || document.activeElement.id || document.activeElement.tagName);
      seq.push(name);
      if (ring !== "ok" && !(engine === "webkit" && ring === "none")) bad.push(ring);
    }
    // WebKit (Safari default) leaves links out of the Tab order, so the skip link / nav links are legitimately skipped there
    if (engine !== "webkit" && seq[0] !== "skip") bad.push("first Tab stop is not the skip link (" + seq[0] + ")");
    const idx = seq.indexOf("menu-btn");
    if (engine !== "webkit" && !seq.includes("btn btn-line btn-sm nav-login") && idx < 0 && vw > 1080) bad.push("nav login not reachable early");
    check(row, "keyboard", !bad.length, bad.join(", "));
  });

  row.info.mockedSupabase = state.hits;
  check(row, "console-errors", row.errors.length === 0, row.errors.slice(0, 2).join(" | "));
  await ctx.close();
}

/* ---------- portal (login surfaces; dashboards need a real session) ---------- */
async function testPortal(browser, engine, dev) {
  const zoomRisk = !!dev.desc.hasTouch || dev.desc.viewport.width <= 640;
  const row = mkRow(dev.label, engine, "portal");
  const state = { hits: 0, leadPosts: 0, leadMode: "ok" };
  const gate = { on: true };
  const ctx = await browser.newContext(ctxOpts(dev.desc, engine));
  await mockSupabase(ctx, state);
  await ctx.addInitScript(`window.__ov = ${overflowers.toString()}`);
  const page = await ctx.newPage();
  attachErrorCollectors(page, row, gate);
  await page.goto(URL_ + "/portal/", { waitUntil: "load" });
  await safe(row, "role-chooser", async () => {
    await page.waitForSelector(".cip-role", { timeout: 12000 });
    await page.waitForTimeout(900);
    const o = await page.evaluate(overflowers);
    const cnt = await page.locator(".cip-role").count();
    const tiny = await page.evaluate(() => [...document.querySelectorAll(".cip-role")].filter((b) => b.getBoundingClientRect().height < 44).length);
    check(row, "role-chooser", cnt === 3 && o.scrollW <= 0 && !o.bad.length && !tiny, `tiles=${cnt} overflow=${o.scrollW} ${o.bad.join(" ")} small=${tiny}`);
    if (shots) await page.screenshot({ path: `${shotDir}/${slug(engine + "-" + dev.label)}-portal-chooser.png` });
  });
  for (const [i, role] of ["admin", "agent", "client"].entries()) {
    await safe(row, `login-${role}`, async () => {
      if (i) { await page.goto(URL_ + "/portal/", { waitUntil: "load" }); await page.waitForSelector(".cip-role"); }
      await page.locator(".cip-role").nth(i).click();
      await page.waitForTimeout(1000);
      const r = await page.evaluate(() => {
        const inputs = [...document.querySelectorAll("input")].filter((e) => e.offsetParent);
        return { n: inputs.length, small: inputs.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).length, ov: __ov(), btns: [...document.querySelectorAll("button")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 40).length };
      });
      const notes = [];
      if (r.ov.scrollW > 0 || r.ov.bad.length) notes.push(`overflow ${r.ov.bad.join(" ")}`);
      if (r.small && zoomRisk) notes.push(`${r.small} input(s) <16px (iOS zoom)`);
      check(row, `login-${role}`, !notes.length, notes.join("; "));
      if (shots) await page.screenshot({ path: `${shotDir}/${slug(engine + "-" + dev.label)}-portal-${role}.png` });
    });
  }
  check(row, "console-errors", row.errors.length === 0, row.errors.slice(0, 2).join(" | "));
  await ctx.close();
}

/* ---------- special modes: reduced motion + no WebGL ---------- */
async function testModes(engine, bt) {
  // reduced motion
  for (const dev of [MATRIX.find((m) => m.label.startsWith("Laptop")), MATRIX.find((m) => m.label.startsWith("iPhone 14 "))]) {
    const row = mkRow(dev.label, engine, "reduced-motion");
    const browser = await bt.launch({ args: engine === "chromium" ? GPU_ARGS : [] });
    const gate = { on: true };
    const ctx = await browser.newContext({ ...ctxOpts(dev.desc, engine), reducedMotion: "reduce" });
    await mockSupabase(ctx, { hits: 0, leadPosts: 0 });
    const page = await ctx.newPage();
    attachErrorCollectors(page, row, gate);
    await page.goto(URL_ + "/", { waitUntil: "load" });
    await page.waitForTimeout(3000);
    await safe(row, "reduced-motion", async () => {
      const r = await page.evaluate(() => ({
        lenis: !!window.__lenis,
        intro: [...document.querySelectorAll(".intro")].every((e) => +getComputedStyle(e).opacity === 1),
        anim: getComputedStyle(document.querySelector(".intro")).animationDuration,
        scene: !!document.querySelector("#scene.on") || document.body.classList.contains("no-webgl"),
      }));
      await page.evaluate(() => document.getElementById("enquire").scrollIntoView());
      await page.waitForTimeout(700);
      const rev = await page.evaluate(() => [...document.querySelectorAll(".reveal")].every((e) => +getComputedStyle(e).opacity === 1));
      const n = [];
      if (r.lenis) n.push("Lenis smooth-scroll active");
      if (!r.intro) n.push("intro text hidden");
      if (!rev) n.push("reveals hidden");
      if (!r.scene) n.push("no scene/fallback");
      check(row, "reduced-motion", !n.length, n.join("; "));
      const o = await page.evaluate(overflowers); check(row, "no-overflow", o.scrollW <= 0 && !o.bad.length, o.bad.join(" "));
    });
    check(row, "console-errors", row.errors.length === 0, row.errors.slice(0, 2).join(" | "));
    await browser.close();
  }
  // WebGL unavailable -> still-image fallback
  if (engine !== "webkit") {
    const dev = MATRIX.find((m) => m.label.startsWith("iPhone 14 "));
    const row = mkRow(dev.label, engine, "no-webgl");
    const browser = engine === "chromium"
      ? await bt.launch({ args: ["--disable-3d-apis", "--disable-gpu"] })
      : await bt.launch({ firefoxUserPrefs: { "webgl.disabled": true, "webgl.force-enabled": false } });
    const gate = { on: true };
    const ctx = await browser.newContext(ctxOpts(dev.desc, engine));
    await mockSupabase(ctx, { hits: 0, leadPosts: 0 });
    const page = await ctx.newPage();
    attachErrorCollectors(page, row, gate);
    const stillLoaded = page.waitForResponse((r) => /park1-still/.test(r.url()) && r.ok(), { timeout: 8000 }).then(() => true, () => false);
    await page.goto(URL_ + "/", { waitUntil: "load" });
    await page.waitForTimeout(2500);
    await safe(row, "no-webgl-fallback", async () => {
      const r = await page.evaluate(() => ({ cls: document.body.classList.contains("no-webgl"), bg: getComputedStyle(document.querySelector(".stage-static")).backgroundImage, canvasOn: !!document.querySelector("#scene.on") }));
      const n = [];
      if (!r.cls) n.push("body.no-webgl missing (WebGL not actually disabled?)");
      if (!/park1-still/.test(r.bg)) n.push("still image not applied");
      if (!(await stillLoaded)) n.push("still image request failed");
      if (r.canvasOn) n.push("canvas shown without WebGL");
      check(row, "no-webgl-fallback", !n.length, n.join("; "));
      const o = await page.evaluate(overflowers); check(row, "no-overflow", o.scrollW <= 0 && !o.bad.length, o.bad.join(" "));
      if (shots) await page.screenshot({ path: `${shotDir}/${slug(engine)}-no-webgl.png` });
    });
    check(row, "console-errors", row.errors.length === 0, row.errors.slice(0, 2).join(" | "));
    await browser.close();
  }
}

/* ---------- run ---------- */
async function reachable() { try { return (await fetch(URL_ + "/")).ok; } catch { return false; } }
let server = null;
if (!(await reachable())) {
  if (!existsSync("dist/index.html")) { console.error("dist/ missing: run `npm run build` first."); process.exit(2); }
  const port = new globalThis.URL(URL_).port || "4173";
  console.log(`(starting vite preview on :${port})`);
  server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--port", port, "--strictPort"], { stdio: "ignore" });
  for (let i = 0; i < 30 && !(await reachable()); i++) await new Promise((r) => setTimeout(r, 500));
  if (!(await reachable())) { server.kill(); console.error("preview server did not start"); process.exit(2); }
}

const t0 = Date.now();
for (const name of wantBrowsers) {
  const bt = engines[name];
  if (!bt) continue;
  let browser;
  try { browser = await bt.launch({ args: name === "chromium" ? GPU_ARGS : [] }); }
  catch (e) { console.error(`cannot launch ${name}: ${e.message.split("\n")[0]} (npx playwright install ${name})`); continue; }
  for (const dev of matrix) {
    for (const [pg, fn] of [["home", testHome], ["portal", testPortal]]) {
      try { await fn(browser, name, dev); }
      catch (e) { const r = mkRow(dev.label, name, pg); check(r, "run", false, String(e.message).split("\n")[0]); }
    }
    process.stdout.write(".");
  }
  await browser.close();
  await testModes(name, bt).catch((e) => { const r = mkRow("modes", name, "modes"); check(r, "run", false, String(e.message).split("\n")[0]); });
}
server?.kill();

/* ---------- report ---------- */
console.log(`\n\nQA matrix (${((Date.now() - t0) / 1000).toFixed(0)}s)\n`);
const pad = (s, n) => String(s).padEnd(n);
console.log(pad("device", 30) + pad("browser", 10) + pad("page", 15) + pad("result", 8) + "details");
let fails = 0;
for (const r of rows) {
  const failed = Object.entries(r.checks).filter(([, [ok]]) => !ok);
  fails += failed.length;
  const total = Object.keys(r.checks).length;
  console.log(pad(r.device, 30) + pad(r.browser, 10) + pad(r.page, 15) + pad(failed.length ? "FAIL" : "PASS", 8) +
    (failed.length ? failed.map(([k, [, n]]) => `${k}: ${n}`).join(" || ") : `${total}/${total} checks` + (r.info.stage ? ` [${r.info.stage}]` : "")));
}
console.log(`\n${rows.length} runs, ${fails} failing check(s), ${rows.filter((r) => r.errors.length).length} run(s) with console errors`);
mkdirSync(".shots", { recursive: true });
writeFileSync(".shots/qa-results.json", JSON.stringify(rows, null, 2));
process.exit(fails ? 1 : 0);
