/**
 * Die Express-App: API unter /api, im Produktivbetrieb zusätzlich die
 * gebaute Webseite (client/dist) mit passenden Sicherheits-Headern.
 */
import express, { type NextFunction, type Request, type Response } from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "./db.ts";
import { cleanupSessions, sessionMiddleware } from "./auth.ts";
import { authRoutes } from "./routes/auth.ts";
import { progressRoutes } from "./routes/progress.ts";
import { projectRoutes } from "./routes/projects.ts";
import { APP_CSP, baseHeaders, csrfProtection, ISOLATION_HEADERS, PREVIEW_CSP, rateLimit } from "./security.ts";

export interface AppOptions {
  db: Db;
  /** Ordner mit der gebauten Webseite – wenn vorhanden, wird sie ausgeliefert */
  clientDist?: string;
  secureCookies?: boolean;
  allowedOrigins?: string[];
  trustProxy?: boolean | number | string;
}

export function createApp({ db, clientDist, secureCookies = false, allowedOrigins = [], trustProxy = false }: AppOptions) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", trustProxy);
  app.use(baseHeaders);

  // ------------------------------------------------------------------ API
  const apiRouter = express.Router();
  apiRouter.use(rateLimit({ windowMs: 60_000, max: 300 }));
  apiRouter.use(express.json({ limit: "1mb" }));
  apiRouter.use(csrfProtection(allowedOrigins));
  apiRouter.use(sessionMiddleware(db));
  apiRouter.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  apiRouter.get("/health", (_req, res) => res.json({ ok: true }));
  apiRouter.use("/auth", authRoutes(db, { secureCookies }));
  apiRouter.use("/progress", progressRoutes(db));
  apiRouter.use("/projects", projectRoutes(db));
  apiRouter.use((_req, res) => res.status(404).json({ error: "Diese Schnittstelle gibt es nicht." }));
  app.use("/api", apiRouter);

  // ------------------------------------------------------ Webseite (Build)
  if (clientDist && existsSync(join(clientDist, "index.html"))) {
    app.use((req, res, next) => {
      for (const [k, v] of Object.entries(ISOLATION_HEADERS)) res.setHeader(k, v);
      res.setHeader("Content-Security-Policy", req.path === "/preview.html" ? PREVIEW_CSP : APP_CSP);
      next();
    });
    app.use(
      express.static(clientDist, {
        index: false,
        setHeaders: (res, path) => {
          if (path.includes(`${join("dist", "assets")}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          else if (path.includes("pyodide") || path.includes("blockly-media") || path.endsWith(".wasm")) res.setHeader("Cache-Control", "public, max-age=86400");
          else res.setHeader("Cache-Control", "no-cache");
        },
      }),
    );
    // Single-Page-App: alle anderen Seiten bekommen index.html
    app.get(/^(?!\/api\/).*/, (req, res, next) => {
      if (req.path.includes(".")) return next();
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(join(clientDist, "index.html"));
    });
  }

  // Fehler freundlich beantworten (ohne interne Details)
  app.use((err: Error & { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    if (err.type === "entity.too.large") {
      res.status(413).json({ error: "Das ist zu groß zum Speichern." });
      return;
    }
    if (err.type === "entity.parse.failed") {
      res.status(400).json({ error: "Ungültige Daten." });
      return;
    }
    console.error(err);
    res.status(err.status ?? 500).json({ error: "Auf dem Server ist etwas schiefgelaufen." });
  });

  // Abgelaufene Sitzungen regelmäßig aufräumen
  const timer = setInterval(() => cleanupSessions(db), 60 * 60_000);
  timer.unref();

  return app;
}
