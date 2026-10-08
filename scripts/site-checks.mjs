// Usage: node scripts/site-checks.mjs [url] — homepage edge cases → .shots/check-*.png
import { chromium } from "playwright";
const url = process.argv[2] || "http://localhost:5173/";
const gpu = ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"];
const report = [];

async function run(name, launchArgs, ctxOpts, fn) {
  const b = await chromium.launch({ args: launchArgs });
  const ctx = await b.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const out = await fn(page);
  report.push({ name, ...out, errors: errs });
  await b.close();
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

await run("360-menu", gpu, { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, async (page) => {
  const ox = await overflow(page);
  await page.click("#menuBtn"); await page.waitForTimeout(900);
  await page.screenshot({ path: ".shots/check-360-menu.png" });
  const expanded = await page.getAttribute("#menuBtn", "aria-expanded");
  await page.keyboard.press("Escape"); await page.waitForTimeout(600);
  const hidden = await page.evaluate(() => document.getElementById("menu").hidden);
  // tap targets under 44px
  const small = await page.evaluate(() => [...document.querySelectorAll("a,button,input")].filter((e) => {
    const r = e.getBoundingClientRect(); return r.width && r.height && e.offsetParent && (r.height < 44 || r.width < 44) && !e.closest(".dash,.lead,p");
  }).map((e) => `${e.tagName}.${e.className}:${e.textContent.trim().slice(0, 20)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
  return { overflowX: ox, menuExpanded: expanded, closedOnEsc: hidden, smallTargets: small };
});

await run("landscape-phone", gpu, { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, async (page) => {
  await page.screenshot({ path: ".shots/check-landscape.png" });
  return { overflowX: await overflow(page) };
});

await run("reduced-motion", gpu, { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }, async (page) => {
  await page.screenshot({ path: ".shots/check-reduced-hero.png" });
  await page.evaluate(() => document.getElementById("location").scrollIntoView());
  await page.waitForTimeout(1200);
  await page.screenshot({ path: ".shots/check-reduced-location.png" });
  return { lenis: await page.evaluate(() => !!window.__lenis) };
});

await run("no-webgl", ["--disable-3d-apis"], { viewport: { width: 1440, height: 900 } }, async (page) => {
  await page.screenshot({ path: ".shots/check-nowebgl.png" });
  return { noWebglClass: await page.evaluate(() => document.body.classList.contains("no-webgl")) };
});

await run("keyboard", gpu, { viewport: { width: 1440, height: 900 } }, async (page) => {
  for (let i = 0; i < 3; i++) await page.keyboard.press("Tab");
  await page.screenshot({ path: ".shots/check-focus.png" });
  return { focused: await page.evaluate(() => document.activeElement.outerHTML.slice(0, 60)) };
});

console.log(JSON.stringify(report, null, 2));
