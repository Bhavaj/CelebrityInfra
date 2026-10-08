// Renders static images from the live 3D scene (dev server must be running):
//   public/og-image.jpg          1200x630 social card (scene + wordmark)
//   public/media/park1-still.jpg 1600x1000 backdrop for browsers without WebGL2
// Usage: node scripts/stills.mjs [url]
import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:5173/";
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });

async function render(w, h, path, overlay) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#scene.on"));
  await page.waitForTimeout(7000); // intro settle + survey lines fully drawn
  await page.evaluate((overlay) => {
    for (const sel of [".nav", "main", ".trust", ".footer", ".pins", ".scrim-side", ".scrim-full", ".menu", ".skip"]) document.querySelectorAll(sel).forEach((e) => (e.style.display = "none"));
    document.querySelector(".scrim-low").style.opacity = overlay ? "1" : "0.55";
    if (!overlay) return;
    const o = document.createElement("div");
    o.style.cssText = "position:fixed;left:64px;bottom:56px;z-index:50;color:#F4EEE1;font-family:'Cormorant Garamond',serif";
    o.innerHTML = `<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px"><img src="/celebrity-logo.png" style="width:56px;height:56px"><span style="font:600 13px/1.3 Manrope,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#E3C46A">Celebrity Infra<br><span style="color:#B3A78F;letter-spacing:.08em">Narayankhed, Telangana</span></span></div>
      <div style="font-style:italic;font-size:44px;line-height:1">Celebrity's</div>
      <div style="font-size:120px;line-height:.9;letter-spacing:-.02em;font-variant-numeric:lining-nums">PARK <span style="color:#E3C46A">1</span></div>
      <div style="font:600 14px/1 Manrope,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#B3A78F;margin-top:18px">121 sq. yd plots from &#8377;2,50,000 &middot; Easy EMI</div>`;
    document.body.appendChild(o);
  }, overlay);
  await page.waitForTimeout(1200);
  await page.screenshot({ path, type: "jpeg", quality: 82 });
  console.log("saved", path);
  await ctx.close();
}
await render(1200, 630, "public/og-image.jpg", true);
await render(1600, 1000, "public/media/park1-still.jpg", false);
await browser.close();
