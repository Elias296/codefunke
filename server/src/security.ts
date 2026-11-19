/**
 * Sicherheits-Middleware: HTTP-Header, CSRF-Schutz und einfache Rate-Limits.
 */
import type { NextFunction, Request, Response } from "express";

/** Erlaubt SharedArrayBuffer (Python-Eingaben & Stopp-Knopf) */
export const ISOLATION_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
};

/** Content-Security-Policy für die App */
export const APP_CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/**
 * CSP für die HTML-Vorschau (läuft im sandbox-iframe ohne eigene Origin):
 * Inline-Skripte der Lernenden sind erlaubt, Netzwerkzugriffe nicht.
 */
export const PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src * data: blob:",
  "media-src * data: blob:",
  "font-src * data:",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'self'",
].join("; ");

export function baseHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  res.removeHeader("X-Powered-By");
  next();
}

/**
 * CSRF-Schutz für alle ändernden API-Aufrufe:
 * - eigener Header "X-Codefunke" (fremde Seiten können ihn ohne CORS nicht setzen)
 * - falls ein Origin-Header mitkommt, muss er zur eigenen Seite passen
 */
export function csrfProtection(allowedOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    if (req.get("x-codefunke") !== "1") {
      res.status(403).json({ error: "Anfrage abgelehnt." });
      return;
    }
    const origin = req.get("origin");
    if (origin) {
      let host = "";
      try { host = new URL(origin).host; } catch { /* ungültig */ }
      if (host !== req.get("host") && !allowedOrigins.includes(origin)) {
        res.status(403).json({ error: "Anfrage von fremder Seite abgelehnt." });
        return;
      }
    }
    next();
  };
}

/** Einfaches Rate-Limit im Speicher (feste Zeitfenster) */
export function rateLimit(opts: { windowMs: number; max: number; key?: (req: Request) => string; message?: string }) {
  const hits = new Map<string, { count: number; reset: number }>();
  setInterval(() => {
    const t = Date.now();
    for (const [k, v] of hits) if (v.reset < t) hits.delete(k);
  }, opts.windowMs).unref();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = opts.key ? opts.key(req) : req.ip ?? "?";
    const t = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset < t) {
      hits.set(key, { count: 1, reset: t + opts.windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > opts.max) {
      res.setHeader("Retry-After", String(Math.ceil((entry.reset - t) / 1000)));
      res.status(429).json({ error: opts.message ?? "Langsam! Zu viele Anfragen – warte kurz und versuch es dann nochmal." });
      return;
    }
    next();
  };
}
