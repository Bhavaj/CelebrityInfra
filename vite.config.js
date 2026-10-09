import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // The 3D stage (three.js ~0.65 MB min, ~0.19 MB gzip) is dynamic-imported after first paint and is
    // never on the critical path, so the default 500 kB advisory is raised just above its size.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // three.js in its own long-cache chunk, separate from the app-specific stage code
        manualChunks: (id) => {
          if (id.includes("node_modules/three/")) return "three";
          if (/node_modules\/(gsap|lenis)\//.test(id)) return "motion-vendor";
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
        },
      },
      input: {
        main: resolve(__dirname, "index.html"),
        portal: resolve(__dirname, "portal/index.html"),
      },
    },
  },
});
