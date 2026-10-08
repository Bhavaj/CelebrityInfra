// Usage: node scripts/site-shots.mjs [url] [--only=390,1440] [--sections=top,offer] [--wait=2200] [--reduced]
// Screenshots every homepage section at 390/820/1440 into .shots/site-<section>-<w>.png
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const args = process.argv.slice(2);
const flag = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || "").split("=")[1] || d;
const url = args.find((a) => !a.startsWith("--")) || "http://localhost:5173/";
const only = flag("only", "390,820,1440").split(",").map(Number);
const sections = flag("sections", "top,offer,venture,why,why-end,location,chairman,enquire,footer").split(",");
const wait = Number(flag("wait", 2400));
const reduced = args.includes("--reduced");

const sizes = [
  { w: 390, h: 844, opts: { deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { w: 820, h: 1180, opts: {} },
  { w: 1440, h: 900, opts: {} },
].filter((s) => only.includes(s.w));

mkdirSync(".shots", { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
for (const { w, h, opts } of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? "reduce" : "no-preference", ...opts });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && errs.push(m.type() + ": " + m.text()));
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(wait + 1500);
  const gpu = await page.evaluate(() => {
    const c = document.createElement("canvas").getContext("webgl2");
    const ext = c && c.getExtension("WEBGL_debug_renderer_info");
    return ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "n/a";
  });
  for (const s of sections) {
    await page.evaluate((s) => {
      let y = 0;
      if (s === "footer") y = document.documentElement.scrollHeight;
      else if (s === "why-end") { const el = document.getElementById("why"); y = el.offsetTop + el.offsetHeight - innerHeight; }
      else if (s !== "top") { const el = document.getElementById(s) || document.querySelector(`[data-scene="${s}"]`); y = el.getBoundingClientRect().top + scrollY; }
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
    }, s);
    await page.waitForTimeout(wait);
    await page.screenshot({ path: `.shots/site-${s}-${w}.png` });
  }
  const stats = await page.evaluate(() => window.__stageStats || null);
  console.log(`[${w}] gpu=${gpu} stats=${JSON.stringify(stats)} errors: ${errs.length}`);
  errs.forEach((e) => console.log("   " + e));
  await ctx.close();
}
await browser.close();
