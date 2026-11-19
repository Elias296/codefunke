// Baut Codefunke als statische Seite für GitHub Pages (ohne Server).
//
//   npm run build:pages                      → Basis-Pfad "/"
//   PAGES_BASE=/codefunke/ npm run build:pages → für https://<name>.github.io/codefunke/
//
// Ergebnis: client/dist-pages – kann auf jeden statischen Host hochgeladen werden.
import { spawnSync } from "node:child_process";
import { copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

let base = process.env.PAGES_BASE || "/";
if (!base.startsWith("/")) base = `/${base}`;
if (!base.endsWith("/")) base = `${base}/`;

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npm, ["run", "build", "-w", "client"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, VITE_STATIC: "1", PAGES_BASE: base },
});
if (result.status !== 0) process.exit(result.status ?? 1);

const dist = join(import.meta.dirname, "..", "client", "dist-pages");
// GitHub Pages kennt kein "Single-Page-App"-Routing: Für unbekannte Pfade
// liefert es 404.html aus. Als Kopie von index.html startet dort die App
// und zeigt die richtige Seite an (z. B. bei direkten Links auf ein Kapitel).
copyFileSync(join(dist, "index.html"), join(dist, "404.html"));
// Jekyll (der Standard-Generator von GitHub Pages) abschalten
writeFileSync(join(dist, ".nojekyll"), "");
console.log(`\n✓ Statische Seite gebaut (Basis-Pfad ${base}) → client/dist-pages`);
