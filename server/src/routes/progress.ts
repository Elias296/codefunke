import { Router } from "express";
import type { Db } from "../db.ts";
import { now } from "../db.ts";
import { requireUser } from "../auth.ts";
import { mergeProgress, sanitizeProgress } from "../../../shared/progress.ts";

/** Fortschritt speichern: Der Server führt immer zusammen, damit nichts verloren geht. */
export function progressRoutes(db: Db) {
  const r = Router();
  r.use(requireUser);

  r.get("/", (req, res) => {
    const row = db.prepare("SELECT data, updated_at FROM progress WHERE user_id = ?").get(req.user!.id) as { data: string; updated_at: string } | undefined;
    res.json({ data: row ? JSON.parse(row.data) : null, updatedAt: row?.updated_at ?? null });
  });

  r.put("/", (req, res) => {
    const incoming = sanitizeProgress(req.body?.data);
    if (!incoming) {
      res.status(400).json({ error: "Ungültige Fortschritts-Daten." });
      return;
    }
    const row = db.prepare("SELECT data FROM progress WHERE user_id = ?").get(req.user!.id) as { data: string } | undefined;
    const stored = row ? sanitizeProgress(JSON.parse(row.data)) : null;
    const merged = stored ? mergeProgress(stored, incoming) : incoming;
    const json = JSON.stringify(merged);
    if (json.length > 1_000_000) {
      res.status(413).json({ error: "Fortschritt zu groß." });
      return;
    }
    db.prepare(
      "INSERT INTO progress (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
    ).run(req.user!.id, json, now());
    res.json({ data: merged });
  });

  return r;
}
