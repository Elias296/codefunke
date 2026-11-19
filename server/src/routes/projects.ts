import { Router, type Request } from "express";
import { randomBytes } from "node:crypto";
import type { Db } from "../db.ts";
import { now } from "../db.ts";
import { requireUser } from "../auth.ts";
import { containsBlockedWord } from "../moderation.ts";
import { rateLimit } from "../security.ts";

const LANGUAGES = ["blocks", "python", "web", "lua", "java"];
const MAX_CODE = 300_000;
const REPORTS_TO_HIDE = 3;

interface ProjectRow {
  id: string;
  user_id: number;
  title: string;
  description: string;
  language: string;
  code?: string;
  is_public: number;
  hidden: number;
  remix_of: string | null;
  created_at: string;
  updated_at: string;
  author: string;
  likes: number;
  liked_by_me: number;
}

function toJson(row: ProjectRow, userId: number | undefined, withCode: boolean) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    language: row.language,
    isPublic: Boolean(row.is_public),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: row.author,
    likes: row.likes,
    likedByMe: Boolean(row.liked_by_me),
    remixOf: row.remix_of,
    isMine: row.user_id === userId,
    ...(withCode ? { code: row.code } : {}),
  };
}

const SELECT = (withCode: boolean) => `
  SELECT p.id, p.user_id, p.title, p.description, p.language, ${withCode ? "p.code," : ""} p.is_public, p.hidden, p.remix_of,
         p.created_at, p.updated_at, u.username AS author,
         (SELECT COUNT(*) FROM project_likes l WHERE l.project_id = p.id) AS likes,
         EXISTS (SELECT 1 FROM project_likes l WHERE l.project_id = p.id AND l.user_id = $me) AS liked_by_me
  FROM projects p JOIN users u ON u.id = p.user_id`;

function newId(): string {
  return randomBytes(8).toString("base64url").replace(/[-_]/g, "x").slice(0, 10);
}

interface Input {
  title: string;
  description: string;
  language: string;
  code: string;
  isPublic: boolean;
  remixOf: string | null;
}

function validate(body: unknown): { ok: true; value: Input } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const title = String(b.title ?? "").trim();
  const description = String(b.description ?? "").trim();
  const language = String(b.language ?? "");
  const code = String(b.code ?? "");
  if (title.length < 1 || title.length > 60) return { ok: false, error: "Der Titel muss 1–60 Zeichen lang sein." };
  if (description.length > 500) return { ok: false, error: "Die Beschreibung darf höchstens 500 Zeichen haben." };
  if (!LANGUAGES.includes(language)) return { ok: false, error: "Unbekannte Sprache." };
  if (code.length > MAX_CODE) return { ok: false, error: "Das Projekt ist zu groß." };
  const remixOf = typeof b.remixOf === "string" && /^[\w-]{1,20}$/.test(b.remixOf) ? b.remixOf : null;
  return { ok: true, value: { title, description, language, code, isPublic: b.isPublic === true, remixOf } };
}

export function projectRoutes(db: Db) {
  const r = Router();
  const createLimit = rateLimit({ windowMs: 60 * 60_000, max: 60, key: (req: Request) => `create:${req.user?.id}`, message: "Du hast gerade sehr viele Projekte gespeichert. Mach kurz Pause!" });
  const reportLimit = rateLimit({ windowMs: 24 * 60 * 60_000, max: 20, key: (req: Request) => `report:${req.user?.id}` });

  const load = (id: string, me: number | undefined, withCode = true): ProjectRow | undefined =>
    db.prepare(`${SELECT(withCode)} WHERE p.id = $id`).get({ $id: id, $me: me ?? -1 }) as ProjectRow | undefined;

  r.get("/", (req, res) => {
    const me = req.user?.id;
    const scope = req.query.scope === "mine" ? "mine" : "public";
    if (scope === "mine") {
      if (!me) {
        res.status(401).json({ error: "Bitte melde dich zuerst an." });
        return;
      }
      const rows = db.prepare(`${SELECT(false)} WHERE p.user_id = $me ORDER BY p.updated_at DESC LIMIT 200`).all({ $me: me }) as unknown as ProjectRow[];
      res.json({ projects: rows.map((row) => toJson(row, me, false)) });
      return;
    }
    const q = String(req.query.q ?? "").trim().slice(0, 50);
    const language = String(req.query.language ?? "");
    const sort = req.query.sort === "beliebt" ? "likes DESC, p.created_at DESC" : "p.created_at DESC";
    const where = ["p.is_public = 1", "p.hidden = 0"];
    const params: Record<string, string | number> = { $me: me ?? -1 };
    if (q) {
      where.push("(p.title LIKE $q ESCAPE '\\' OR u.username LIKE $q ESCAPE '\\')");
      params.$q = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    }
    if (LANGUAGES.includes(language)) {
      where.push("p.language = $lang");
      params.$lang = language;
    }
    const rows = db.prepare(`${SELECT(false)} WHERE ${where.join(" AND ")} ORDER BY ${sort} LIMIT 60`).all(params) as unknown as ProjectRow[];
    res.json({ projects: rows.map((row) => toJson(row, me, false)) });
  });

  r.get("/:id", (req, res) => {
    const row = load(String(req.params.id), req.user?.id);
    const mine = row && row.user_id === req.user?.id;
    if (!row || (!mine && (!row.is_public || row.hidden))) {
      res.status(404).json({ error: "Dieses Projekt gibt es nicht (oder es ist privat)." });
      return;
    }
    res.json({ project: toJson(row, req.user?.id, true) });
  });

  r.post("/", requireUser, createLimit, (req, res) => {
    const v = validate(req.body);
    if (!v.ok) {
      res.status(400).json({ error: v.error });
      return;
    }
    if (v.value.isPublic && containsBlockedWord(`${v.value.title} ${v.value.description}`)) {
      res.status(400).json({ error: "Bitte wähle freundlichere Worte für Titel und Beschreibung." });
      return;
    }
    const id = newId();
    const t = now();
    db.prepare(
      "INSERT INTO projects (id, user_id, title, description, language, code, is_public, remix_of, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(id, req.user!.id, v.value.title, v.value.description, v.value.language, v.value.code, v.value.isPublic ? 1 : 0, v.value.remixOf, t, t);
    res.status(201).json({ project: toJson(load(id, req.user!.id)!, req.user!.id, true) });
  });

  r.put("/:id", requireUser, (req, res) => {
    const row = load(String(req.params.id), req.user!.id, false);
    if (!row || row.user_id !== req.user!.id) {
      res.status(404).json({ error: "Projekt nicht gefunden." });
      return;
    }
    const v = validate(req.body);
    if (!v.ok) {
      res.status(400).json({ error: v.error });
      return;
    }
    if (row.is_public && containsBlockedWord(`${v.value.title} ${v.value.description}`)) {
      res.status(400).json({ error: "Bitte wähle freundlichere Worte für Titel und Beschreibung." });
      return;
    }
    db.prepare("UPDATE projects SET title = ?, description = ?, language = ?, code = ?, updated_at = ? WHERE id = ?")
      .run(v.value.title, v.value.description, v.value.language, v.value.code, now(), row.id);
    res.json({ project: toJson(load(row.id, req.user!.id)!, req.user!.id, true) });
  });

  r.post("/:id/share", requireUser, (req, res) => {
    const row = load(String(req.params.id), req.user!.id, false);
    if (!row || row.user_id !== req.user!.id) {
      res.status(404).json({ error: "Projekt nicht gefunden." });
      return;
    }
    const isPublic = req.body?.isPublic === true;
    if (isPublic && containsBlockedWord(`${row.title} ${row.description}`)) {
      res.status(400).json({ error: "Bitte wähle freundlichere Worte, bevor du das Projekt teilst." });
      return;
    }
    if (isPublic && row.hidden) {
      res.status(403).json({ error: "Dieses Projekt wurde gemeldet und kann gerade nicht geteilt werden." });
      return;
    }
    db.prepare("UPDATE projects SET is_public = ?, updated_at = ? WHERE id = ?").run(isPublic ? 1 : 0, now(), row.id);
    res.json({ project: toJson(load(row.id, req.user!.id)!, req.user!.id, true) });
  });

  r.delete("/:id", requireUser, (req, res) => {
    const info = db.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").run(String(req.params.id), req.user!.id);
    if (!info.changes) {
      res.status(404).json({ error: "Projekt nicht gefunden." });
      return;
    }
    res.json({ ok: true });
  });

  r.post("/:id/like", requireUser, (req, res) => {
    const row = load(String(req.params.id), req.user!.id, false);
    if (!row || !row.is_public || row.hidden) {
      res.status(404).json({ error: "Projekt nicht gefunden." });
      return;
    }
    if (row.user_id === req.user!.id) {
      res.status(400).json({ error: "Eigene Projekte kann man nicht liken – aber sie sind bestimmt toll!" });
      return;
    }
    if (row.liked_by_me) db.prepare("DELETE FROM project_likes WHERE project_id = ? AND user_id = ?").run(row.id, req.user!.id);
    else db.prepare("INSERT OR IGNORE INTO project_likes (project_id, user_id, created_at) VALUES (?, ?, ?)").run(row.id, req.user!.id, now());
    const updated = load(row.id, req.user!.id, false)!;
    res.json({ likes: updated.likes, likedByMe: Boolean(updated.liked_by_me) });
  });

  r.post("/:id/report", requireUser, reportLimit, (req, res) => {
    const row = load(String(req.params.id), req.user!.id, false);
    if (!row || !row.is_public) {
      res.status(404).json({ error: "Projekt nicht gefunden." });
      return;
    }
    const reason = String(req.body?.reason ?? "").trim().slice(0, 300) || "ohne Angabe";
    db.prepare("INSERT OR IGNORE INTO project_reports (project_id, user_id, reason, created_at) VALUES (?, ?, ?, ?)").run(row.id, req.user!.id, reason, now());
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM project_reports WHERE project_id = ?").get(row.id) as { n: number };
    if (n >= REPORTS_TO_HIDE) db.prepare("UPDATE projects SET hidden = 1 WHERE id = ?").run(row.id);
    res.json({ ok: true });
  });

  return r;
}
