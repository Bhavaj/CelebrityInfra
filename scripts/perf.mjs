// Usage: node scripts/perf.mjs [url] [--cpu=4] [--mobile] [--dsf=2] [--duration=14]
// Smooth-scrolls the whole homepage (through Lenis, like a wheel user) with CPU throttling via CDP,
// and reports rAF frame-interval stats, long tasks and the 3D stage's adaptive-quality state.
import { chromium } from "playwright";

const args = process.argv.slice(2);
const flag = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || "").split("=")[1] || d;
const url = args.find((a) => !a.startsWith("--")) || "http://localhost:5173/";
const cpu = Number(flag("cpu", 4));
const duration = Number(flag("duration", 14));
const mobile = args.includes("--mobile");

const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext(mobile
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
  : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: Number(flag("dsf", 1)) });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.addInitScript((dbg) => { window.__stageDebug = dbg; }, { aa: args.includes("--aa"), noAdapt: args.includes("--noadapt") });
await page.addInitScript(() => {
  window.__perf = { frames: [], long: [], stalls: [], recording: false };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (window.__perf.recording) window.__perf.long.push(e.duration); })
    .observe({ type: "longtask", buffered: false });
  let last = 0;
  const tick = (t) => { if (window.__perf.recording && last) { window.__perf.frames.push(t - last); if (t - last > 100) window.__perf.stalls.push([Math.round(t - last), Math.round(scrollY), document.body.dataset.scene]); } last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});

const t0 = Date.now();
await page.goto(url, { waitUntil: "load" });
const loadMs = Date.now() - t0;
const paint = await page.evaluate(() => {
  const fcp = performance.getEntriesByName("first-contentful-paint")[0];
  return fcp ? Math.round(fcp.startTime) : null;
});
await page.waitForFunction(() => document.querySelector("#scene.on"), null, { timeout: 30000 }).catch(() => errors.push("canvas never shown"));
await page.waitForTimeout(3500); // let shaders compile + intro settle

const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });

const exp = flag("exp", "");
if (exp) await page.evaluate((exp) => {
  const st = window.__stage;
  if (exp.startsWith("hide=")) exp.slice(5).split("+").forEach((n) => { const o = st.scene.getObjectByName(n); if (o) o.visible = false; });
  if (exp === "nostage") { st.stop(); document.addEventListener("visibilitychange", () => st.stop()); st.start = () => {}; }
  if (exp === "noscrim") document.querySelectorAll(".scrim").forEach((e) => e.remove());
  if (exp === "nopins") document.querySelector(".pins").remove();
  if (exp === "noshadowcss") document.querySelectorAll(".panel").forEach((e) => (e.style.boxShadow = "none"));
}, exp);
await page.evaluate(() => { window.__perf.recording = true; });
if (!args.includes("--noscroll")) await page.evaluate((d) => {
  const end = document.documentElement.scrollHeight - innerHeight;
  if (window.__lenis) window.__lenis.scrollTo(end, { duration: d, easing: (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 });
  else window.scrollTo({ top: end, behavior: "smooth" });
}, duration);
await page.waitForTimeout(duration * 1000 + 800);
const res = await page.evaluate(() => { window.__perf.recording = false; return { ...window.__perf, stage: window.__stageStats || null, dpr: devicePixelRatio }; });
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });

const f = res.frames.slice().sort((a, b) => a - b);
const pct = (p) => f[Math.min(f.length - 1, Math.floor(f.length * p))];
const avg = f.reduce((a, b) => a + b, 0) / f.length;
const over = (ms) => f.filter((x) => x > ms).length;
console.log(JSON.stringify({
  viewport: mobile ? "390x844@3x (touch)" : `1440x900@${flag("dsf", 1)}x`, cpuThrottle: `${cpu}x`,
  fcpMs: paint, loadMs,
  frames: f.length, avgFrameMs: +avg.toFixed(2), fps: +(1000 / avg).toFixed(1),
  p50Ms: +pct(0.5).toFixed(2), p95Ms: +pct(0.95).toFixed(2), p99Ms: +pct(0.99).toFixed(2), maxMs: +f[f.length - 1].toFixed(1),
  framesOver20ms: over(20), framesOver33ms: over(33.4),
  longTasks: res.long.length, longTaskTotalMs: Math.round(res.long.reduce((a, b) => a + b, 0)),
  stalls: res.stalls, stage: res.stage, errors,
}, null, 2));
await browser.close();
