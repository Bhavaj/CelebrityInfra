import { copyFileSync, mkdirSync } from "fs";
mkdirSync("dist", { recursive: true });
copyFileSync("public/index.html", "dist/index.html");
copyFileSync("public/logo.jpg", "dist/logo.jpg");
console.log("Homepage and logo copied to dist/ (site root) — /logo.jpg is referenced as an absolute path by both the homepage and the portal, so it must live at the site root regardless of the portal's /portal/ base.");
