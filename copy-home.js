import { copyFileSync, mkdirSync } from "fs";
mkdirSync("dist", { recursive: true });
copyFileSync("public/index.html", "dist/index.html");
copyFileSync("public/celebrity-logo.png", "dist/celebrity-logo.png");
console.log("Homepage and logo copied to dist/ (site root) — /celebrity-logo.png is referenced as an absolute path by the homepage, so it must live at the site root regardless of the portal's /portal/ base.");
