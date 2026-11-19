/**
 * Passwörter (scrypt) und Sitzungen (zufälliges Token im httpOnly-Cookie,
 * in der Datenbank nur als SHA-256-Hash gespeichert).
 */
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import type { Db } from "./db.ts";
import { now } from "./db.ts";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1 };
const SESSION_DAYS = 30;
export const SESSION_COOKIE = "cf_session";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt") return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Hash zum Vergleichen, wenn es den Nutzer nicht gibt (gleiche Antwortzeit) */
export const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

export interface SessionUser {
  id: number;
  username: string;
  createdAt: string;
}

export function createSession(db: Db, userId: number): string {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  db.prepare("INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(sha256(token), userId, now(), expires);
  return token;
}

export function deleteSession(db: Db, token: string): void {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sha256(token));
}

export function userForToken(db: Db, token: string | undefined): SessionUser | null {
  if (!token || token.length > 100) return null;
  const row = db.prepare(
    "SELECT u.id, u.username, u.created_at AS createdAt FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ?",
  ).get(sha256(token), now()) as SessionUser | undefined;
  return row ?? null;
}

export function setSessionCookie(res: Response, token: string, secure: boolean) {
  res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: SESSION_DAYS * 86_400_000 });
}

export function clearSessionCookie(res: Response, secure: boolean) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure, path: "/" });
}

declare module "express-serve-static-core" {
  interface Request {
    user?: SessionUser | null;
    sessionToken?: string;
  }
}

/** Liest die Sitzung aus dem Cookie und setzt req.user */
export function sessionMiddleware(db: Db) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    req.sessionToken = token;
    req.user = userForToken(db, token);
    next();
  };
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Bitte melde dich zuerst an." });
    return;
  }
  next();
}

export function cleanupSessions(db: Db) {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now());
}
