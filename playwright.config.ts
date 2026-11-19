import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-End-Tests im echten Browser.
 * Startet den gebauten Server auf Port 3200 mit einer frischen Test-Datenbank.
 * Vorher einmal bauen: npm run build
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: { baseURL: "http://localhost:3200", trace: "off" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobil\.spec\.ts/ },
    { name: "handy", use: { ...devices["Pixel 7"] }, testMatch: /mobil\.spec\.ts/ },
  ],
  webServer: {
    command: "node --disable-warning=ExperimentalWarning server/src/index.ts",
    url: "http://localhost:3200/api/health",
    reuseExistingServer: false,
    env: { PORT: "3200", DATABASE_PATH: "test-results/e2e.db" },
  },
});
