import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Eine gemeinsame Test-Konfiguration für Client-Logik, Server-API, Shared-Code und Inhalte.
export default defineConfig({
  resolve: {
    alias: {
      "@content": fileURLToPath(new URL("./content", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
  },
  test: {
    include: ["client/src/**/*.test.ts", "server/test/**/*.test.ts", "shared/**/*.test.ts"],
    environment: "node",
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
