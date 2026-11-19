import { defineConfig, devices } from "@playwright/test";

/**
 * Tests für die statische Variante (GitHub Pages).
 * Baut die Seite mit Basis-Pfad /codefunke/ und liefert sie wie GitHub Pages
 * aus: ohne eigene HTTP-Header, mit 404.html für unbekannte Pfade.
 */
export default defineConfig({
  testDir: "e2e-pages",
  timeout: 90_000,
  fullyParallel: false,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:4174/codefunke/", trace: "off" },
  webServer: {
    command: "node scripts/build-pages.mjs && node scripts/serve-pages.mjs",
    url: "http://localhost:4174/codefunke/",
    timeout: 180_000,
    reuseExistingServer: false,
    env: { PAGES_BASE: "/codefunke/", PORT: "4174" },
  },
});
