// Usage: node scripts/shot.mjs <url> [name] [--scroll=<px>]
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const [url, name = "shot"] = args.filter((a) => !a.startsWith("--"));
if (!url) { console.error("Usage: node scripts/shot.mjs <url> [name] [--scroll=<px>]"); process.exit(1); }
const scroll = Number((flags.find((f) => f.startsWith("--scroll=")) || "").split("=")[1] || 0);

const sizes = [
  { w: 390, h: 844, opts: { deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { w: 820, h: 1180, opts: {} },
  { w: 1440, h: 900, opts: {} },
];
mkdirSync(".shots", { recursive: true });
const browser = await chromium.launch();
for (const { w, h, opts } of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...opts });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => m.type() === "error" && errs.push("console: " + m.text()));
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  } catch (e) { errs.push("goto: " + e.message); }
  await page.waitForTimeout(1500);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const height = Math.min(total, h * 3);
  await page.screenshot({ path: `.shots/${name}-${w}-full.png`, clip: { x: 0, y: 0, width: w, height }, fullPage: true });
  if (scroll) { await page.evaluate((y) => window.scrollTo(0, y), scroll); await page.waitForTimeout(800); }
  await page.screenshot({ path: `.shots/${name}-${w}.png` });
  console.log(`[${w}] saved .shots/${name}-${w}.png (+ -full)  errors: ${errs.length}`);
  errs.forEach((e) => console.log("   " + e));
  await ctx.close();
}
await browser.close();
