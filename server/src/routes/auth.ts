import { Router } from "express";
import type { Db } from "../db.ts";
import { now } from "../db.ts";
import { clearSessionCookie, createSession, deleteSession, DUMMY_HASH, hashPassword, requireUser, setSessionCookie, verifyPassword } from "../auth.ts";
import { containsBlockedWord } from "../moderation.ts";
import { rateLimit } from "../security.ts";

const USERNAME_RE = /^[A-Za-z0-9_.\-äöüÄÖÜß]{3,20}$/;

export function authRoutes(db: Db, opts: { secureCookies: boolean }) {
  const r = Router();
  const limiter = rateLimit({ windowMs: 15 * 60_000, max: 20, message: "Zu viele Versuche. Bitte warte ein paar Minuten." });

  // Gäste bekommen { user: null } (kein Fehler – Gast sein ist völlig in Ordnung)
  r.get("/me", (req, res) => {
    res.json({ user: req.user ?? null });
  });

  r.post("/register", limiter, async (req, res) => {
    const username = String(req.body?.username ?? "").trim();
    const password = String(req.body?.password ?? "");
    if (!USERNAME_RE.test(username)) {
      res.status(400).json({ error: "Der Benutzername muss 3–20 Zeichen lang sein (Buchstaben, Zahlen, _ - .)." });
      return;
    }
    if (containsBlockedWord(username)) {
      res.status(400).json({ error: "Bitte wähle einen freundlicheren Benutzernamen." });
      return;
    }
    if (password.length < 8 || password.length > 200) {
      res.status(400).json({ error: "Das Passwort muss mindestens 8 Zeichen lang sein." });
      return;
    }
    if (db.prepare("SELECT 1 FROM users WHERE username = ?").get(username)) {
      res.status(409).json({ error: "Dieser Benutzername ist leider schon vergeben." });
      return;
    }
    const hash = await hashPassword(password);
    const created = now();
    const info = db.prepare("INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)").run(username, hash, created);
    const id = Number(info.lastInsertRowid);
    setSessionCookie(res, createSession(db, id), opts.secureCookies);
    res.status(201).json({ user: { id, username, createdAt: created } });
  });

  r.post("/login", limiter, async (req, res) => {
    const username = String(req.body?.username ?? "").trim();
    const password = String(req.body?.password ?? "");
    const row = db.prepare("SELECT id, username, password_hash, created_at FROM users WHERE username = ?").get(username) as
      | { id: number; username: string; password_hash: string; created_at: string }
      | undefined;
    // Auch ohne Nutzer einen Hash prüfen, damit die Antwortzeit nichts verrät
    const ok = await verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
    if (!row || !ok) {
      res.status(401).json({ error: "Benutzername oder Passwort stimmt nicht." });
      return;
    }
    setSessionCookie(res, createSession(db, row.id), opts.secureCookies);
    res.json({ user: { id: row.id, username: row.username, createdAt: row.created_at } });
  });

  r.post("/logout", (req, res) => {
    if (req.sessionToken) deleteSession(db, req.sessionToken);
    clearSessionCookie(res, opts.secureCookies);
    res.json({ ok: true });
  });

  r.delete("/me", requireUser, limiter, async (req, res) => {
    const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(req.user!.id) as { password_hash: string };
    if (!(await verifyPassword(String(req.body?.password ?? ""), row.password_hash))) {
      res.status(401).json({ error: "Das Passwort stimmt nicht." });
      return;
    }
    db.prepare("DELETE FROM users WHERE id = ?").run(req.user!.id);
    clearSessionCookie(res, opts.secureCookies);
    res.json({ ok: true });
  });

  return r;
}
