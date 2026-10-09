// Usage: node scripts/tour.mjs <url> [prefix] — screenshots each homepage section at phone + desktop sizes.
import { chromium } from "playwright";
import { mkdirSync } from "fs";
const [url = "http://localhost:5199/", prefix = "tour"] = process.argv.slice(2);
const only = process.env.SIZES ? process.env.SIZES.split(",").map(Number) : null;
const sizes = [
  { w: 390, h: 844, opts: { deviceScaleFactor: 1, isMobile: true, hasTouch: true } },
  { w: 1440, h: 900, opts: {} },
  { w: 1920, h: 1080, opts: {} },
].filter((s) => !only || only.includes(s.w));
const secs = (process.env.SECS || "hero,offer,venture,why,location,chairman,enquire").split(",");
mkdirSync(".shots", { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
for (const { w, h, opts } of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...opts });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__stage, null, { timeout: 60000 });
  await page.waitForTimeout(6000);
  for (const s of secs) {
    await page.evaluate((s) => {
      const el = document.querySelector(`section[data-scene="${s}"]`);
      const y = s === "hero" ? 0 : el.offsetTop + Math.max(0, (el.offsetHeight - innerHeight) / 2);
      window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y);
    }, s);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `.shots/${prefix}-${w}-${s}.png` });
  }
  console.log("done", w);
  await ctx.close();
}
await browser.close();
