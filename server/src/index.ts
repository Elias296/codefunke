/**
 * Startet den Codefunke-Server.
 *
 * Umgebungsvariablen:
 *   PORT              – Port (Standard 3000)
 *   DATABASE_PATH     – SQLite-Datei (Standard server/data/codefunke.db)
 *   COOKIE_SECURE     – "1" erzwingt Secure-Cookies (bei HTTPS; Standard: an, wenn NODE_ENV=production)
 *   TRUST_PROXY       – z. B. "1", wenn ein Reverse-Proxy (Render, Fly, nginx) davor sitzt
 *   ALLOWED_ORIGINS   – zusätzliche erlaubte Origins, kommagetrennt
 *   CODEFUNKE_DEV     – "1" im Entwicklungsmodus (dann liefert Vite die Webseite aus)
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { openDb } from "./db.ts";
import { createApp } from "./app.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const port = Number(process.env.PORT ?? 3000);
const dev = process.env.CODEFUNKE_DEV === "1";
const db = openDb(process.env.DATABASE_PATH ?? join(root, "server", "data", "codefunke.db"));
const trust = process.env.TRUST_PROXY;

const app = createApp({
  db,
  clientDist: dev ? undefined : join(root, "client", "dist"),
  secureCookies: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "1" : process.env.NODE_ENV === "production",
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  trustProxy: trust === undefined ? false : /^\d+$/.test(trust) ? Number(trust) : trust === "true" ? true : trust,
});

app.listen(port, () => {
  console.log(dev
    ? `🔥 Codefunke-API läuft auf http://localhost:${port} (Webseite über Vite: http://localhost:5173)`
    : `🔥 Codefunke läuft auf http://localhost:${port}`);
});
