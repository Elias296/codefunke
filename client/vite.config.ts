import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

/**
 * Cross-Origin-Isolation erlaubt SharedArrayBuffer. Damit kann Python im Worker
 * auf Eingaben (input()) warten und per Stopp-Knopf unterbrochen werden.
 * "credentialless" lässt trotzdem Bilder von anderen Seiten in der HTML-Vorschau zu.
 */
const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
};

export default defineConfig({
  // Basis-Pfad: "/" auf dem eigenen Server, "/<repo>/" auf GitHub Pages (siehe scripts/build-pages.mjs)
  base: process.env.PAGES_BASE ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@content": fileURLToPath(new URL("../content", import.meta.url)),
      "@shared": fileURLToPath(new URL("../shared", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    headers: isolationHeaders,
    proxy: { "/api": "http://localhost:3001" },
    fs: { allow: [".."] },
  },
  preview: { headers: isolationHeaders, proxy: { "/api": "http://localhost:3001" } },
  worker: { format: "es" },
  // Statische Variante (GitHub Pages) in eigenen Ordner bauen, damit "npm start" immer die Server-Variante ausliefert
  build: { outDir: process.env.VITE_STATIC === "1" ? "dist-pages" : "dist", chunkSizeWarningLimit: 2500, sourcemap: false },
});
