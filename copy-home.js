import { copyFileSync, mkdirSync } from "fs";
mkdirSync("dist", { recursive: true });
copyFileSync("public/index.html", "dist/index.html");
console.log("Homepage copied to dist/index.html (site root).");
