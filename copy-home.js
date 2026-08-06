import { copyFileSync, cpSync, mkdirSync } from "fs";
mkdirSync("dist", { recursive: true });
copyFileSync("public/index.html", "dist/index.html");
copyFileSync("public/celebrity-logo.png", "dist/celebrity-logo.png");
cpSync("public/media", "dist/media", { recursive: true });
console.log("Homepage, logo, and hero media copied to dist/ (site root) — the homepage references /celebrity-logo.png and /media/* as absolute paths, so they must live at the site root regardless of the portal's /portal/ base.");
