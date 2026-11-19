// Spielt "GitHub Pages" lokal nach: liefert client/dist-pages unter einem Basis-Pfad
// aus, ohne besondere HTTP-Header und mit 404.html für unbekannte Pfade.
//
//   PAGES_BASE=/codefunke/ node scripts/serve-pages.mjs   → http://localhost:4173/codefunke/
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT ?? 4173);
let base = process.env.PAGES_BASE || "/";
if (!base.endsWith("/")) base = `${base}/`;
const dist = join(import.meta.dirname, "..", "client", "dist-pages");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".gif": "image/gif", ".wasm": "application/wasm",
  ".zip": "application/zip", ".woff2": "font/woff2", ".woff": "font/woff", ".mp3": "audio/mpeg", ".cur": "image/x-icon", ".txt": "text/plain",
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  let path = decodeURIComponent(url.pathname);
  if (!path.startsWith(base)) path = "/__nicht_vorhanden__";
  const rel = normalize(path.slice(base.length) || "index.html").replace(/^(\.\.[/\\])+/, "");
  let file = join(dist, rel);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": TYPES[".html"] });
    res.end(await readFile(join(dist, "404.html")).catch(() => "404"));
  }
}).listen(port, () => console.log(`GitHub-Pages-Vorschau: http://localhost:${port}${base}`));
