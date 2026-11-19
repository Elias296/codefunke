/**
 * Gemeinsame Fortschritts-Logik für Browser und Server.
 *
 * Der Fortschritt ist so aufgebaut, dass er sich verlustfrei zusammenführen lässt
 * (z. B. Gast-Fortschritt + Konto, oder zwei Geräte): Er besteht fast nur aus
 * Mengen von erledigten Dingen. XP werden nie als Zähler gespeichert, sondern
 * immer aus den einzelnen Abschlüssen berechnet.
 *
 * Wichtig: Diese Datei läuft direkt in Node (Type-Stripping) – daher nur
 * "löschbare" TypeScript-Syntax (keine enums, keine namespaces).
 */

export const PROGRESS_VERSION = 1;

export type ItemKind = "task" | "quiz" | "project" | "final";

export interface Completion {
  /** Verdiente XP für diesen Eintrag */
  xp: number;
  /** ISO-Zeitpunkt des (ersten) Abschlusses */
  at: string;
  /** Für Quiz/Test: bester Anteil richtiger Antworten (0..1) */
  score?: number;
  /** Für Abschlusstests: bestanden? */
  passed?: boolean;
  /** Wurde die Lösung angezeigt? */
  usedSolution?: boolean;
  /** Höchste benutzte Hinweis-Stufe (0 = keine) */
  hintsUsed?: number;
}

export interface ProgressStats {
  codeRuns: number;
  errorsFixed: number;
  projectsSaved: number;
  projectsShared: number;
}

export interface ProgressData {
  version: number;
  completions: Record<string, Completion>;
  /** Benutzte Hinweis-Stufe pro Aufgabe (1 = Tipp, 2 = großer Tipp, 3 = Lösung) */
  hints: Record<string, number>;
  /** Tage mit Lern-Aktivität im Format YYYY-MM-DD (lokale Zeit) */
  activityDays: string[];
  /** Abzeichen-ID -> Datum, an dem es verdient wurde */
  badges: Record<string, string>;
  stats: ProgressStats;
  lastVisited?: { path: string; title: string; at: string };
  updatedAt: string;
}

/** Schlüssel für einen Eintrag, z. B. "task:1-scratch/01-bewegung/a1" */
export function itemKey(kind: ItemKind, stageId: string, chapterId?: string, itemId?: string): string {
  if (kind === "final") return `final:${stageId}`;
  if (kind === "quiz") return `quiz:${stageId}/${chapterId}`;
  if (kind === "project") return `project:${stageId}/${chapterId}`;
  return `task:${stageId}/${chapterId}/${itemId}`;
}

export function emptyProgress(): ProgressData {
  return {
    version: PROGRESS_VERSION,
    completions: {},
    hints: {},
    activityDays: [],
    badges: {},
    stats: { codeRuns: 0, errorsFixed: 0, projectsSaved: 0, projectsShared: 0 },
    updatedAt: new Date(0).toISOString(),
  };
}

export function totalXp(p: ProgressData): number {
  let sum = 0;
  for (const c of Object.values(p.completions)) sum += c.xp;
  return sum;
}

// ---------------------------------------------------------------- Level ----

/** Level-Titel wachsen mit Funki mit: vom Drachen-Ei bis zur Legende. */
export const LEVEL_TITLES = [
  "Drachen-Ei",
  "Schlüpfling",
  "Funkenpuster",
  "Flügelschläger",
  "Wolkenflitzer",
  "Feueratem",
  "Sternenflieger",
  "Code-Drache",
  "Drachen-Legende",
  "Großmeister-Drache",
];

/** XP, die man insgesamt braucht, um ein Level zu erreichen (Level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  const n = Math.max(0, level - 1);
  // Schritt von Level k nach k+1 kostet 100 + (k-1)*50 XP
  return n * 100 + (50 * n * (n - 1)) / 2;
}

export interface LevelInfo {
  level: number;
  title: string;
  xp: number;
  /** XP seit Beginn des aktuellen Levels */
  xpIntoLevel: number;
  /** XP, die dieses Level insgesamt umfasst */
  xpForNext: number;
  /** Fortschritt im Level 0..1 */
  progress: number;
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    title: LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1],
    xp,
    xpIntoLevel: xp - start,
    xpForNext: next - start,
    progress: (xp - start) / (next - start),
  };
}

// --------------------------------------------------------------- Serien ----

/** Datum als YYYY-MM-DD in lokaler Zeit */
export function localDay(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayNumber(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export interface StreakInfo {
  /** Aktuelle Serie in Tagen (zählt auch, wenn heute noch nicht geübt wurde, aber gestern) */
  current: number;
  longest: number;
  activeToday: boolean;
}

export function streakInfo(days: string[], today: string = localDay()): StreakInfo {
  const nums = [...new Set(days.filter(isDay).map(dayNumber))].sort((a, b) => a - b);
  const set = new Set(nums);
  const t = dayNumber(today);
  const activeToday = set.has(t);

  let longest = 0;
  let run = 0;
  let prev = Number.NaN;
  for (const n of nums) {
    run = n === prev + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = n;
  }

  let current = 0;
  let cursor = activeToday ? t : t - 1;
  while (set.has(cursor)) {
    current++;
    cursor--;
  }
  return { current, longest, activeToday };
}

// ------------------------------------------------------- Zusammenführen ----

function laterIso(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function earlierIso(a: string, b: string): string {
  return a < b ? a : b;
}

function mergeCompletion(a: Completion, b: Completion): Completion {
  const merged: Completion = {
    xp: Math.max(a.xp, b.xp),
    at: earlierIso(a.at, b.at),
  };
  if (a.score !== undefined || b.score !== undefined) merged.score = Math.max(a.score ?? 0, b.score ?? 0);
  if (a.passed || b.passed) merged.passed = true;
  // "Lösung benutzt" nur, wenn beide Varianten sie benutzt haben (bester Versuch zählt)
  if (a.usedSolution && b.usedSolution) merged.usedSolution = true;
  const hints = Math.min(a.hintsUsed ?? 0, b.hintsUsed ?? 0);
  if (hints > 0) merged.hintsUsed = hints;
  return merged;
}

/** Führt zwei Fortschritte zusammen, ohne dass etwas verloren geht. */
export function mergeProgress(a: ProgressData, b: ProgressData): ProgressData {
  const completions: Record<string, Completion> = { ...a.completions };
  for (const [key, c] of Object.entries(b.completions)) {
    completions[key] = completions[key] ? mergeCompletion(completions[key], c) : c;
  }
  const hints: Record<string, number> = { ...a.hints };
  for (const [key, h] of Object.entries(b.hints)) hints[key] = Math.max(hints[key] ?? 0, h);

  const badges: Record<string, string> = { ...a.badges };
  for (const [id, at] of Object.entries(b.badges)) badges[id] = badges[id] ? earlierIso(badges[id], at) : at;

  const activityDays = [...new Set([...a.activityDays, ...b.activityDays])].sort().slice(-400);

  const stats: ProgressStats = {
    codeRuns: Math.max(a.stats.codeRuns, b.stats.codeRuns),
    errorsFixed: Math.max(a.stats.errorsFixed, b.stats.errorsFixed),
    projectsSaved: Math.max(a.stats.projectsSaved, b.stats.projectsSaved),
    projectsShared: Math.max(a.stats.projectsShared, b.stats.projectsShared),
  };

  let lastVisited = a.lastVisited;
  if (b.lastVisited && (!lastVisited || b.lastVisited.at > lastVisited.at)) lastVisited = b.lastVisited;

  const result: ProgressData = {
    version: PROGRESS_VERSION,
    completions,
    hints,
    activityDays,
    badges,
    stats,
    updatedAt: laterIso(a.updatedAt, b.updatedAt) ?? new Date().toISOString(),
  };
  if (lastVisited) result.lastVisited = lastVisited;
  return result;
}

// ------------------------------------------------------------ Prüfung ----

const KEY_RE = /^(task|quiz|project|final):[\w./-]{1,160}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isDay(v: unknown): v is string {
  return typeof v === "string" && DAY_RE.test(v);
}

function isIso(v: unknown): v is string {
  return typeof v === "string" && v.length <= 40 && !Number.isNaN(Date.parse(v));
}

function clampInt(v: unknown, min: number, max: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : 0;
  return Math.min(max, Math.max(min, n));
}

/**
 * Prüft und bereinigt Fortschritts-Daten (z. B. vom Browser an den Server).
 * Unbekannte Felder werden verworfen, Werte begrenzt. Gibt null zurück,
 * wenn die Daten gar nicht passen.
 */
export function sanitizeProgress(input: unknown): ProgressData | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const out = emptyProgress();

  if (raw.completions && typeof raw.completions === "object") {
    const entries = Object.entries(raw.completions as Record<string, unknown>).slice(0, 5000);
    for (const [key, value] of entries) {
      if (!KEY_RE.test(key) || !value || typeof value !== "object") continue;
      const v = value as Record<string, unknown>;
      const c: Completion = { xp: clampInt(v.xp, 0, 500), at: isIso(v.at) ? v.at : new Date().toISOString() };
      if (typeof v.score === "number" && Number.isFinite(v.score)) c.score = Math.min(1, Math.max(0, v.score));
      if (v.passed === true) c.passed = true;
      if (v.usedSolution === true) c.usedSolution = true;
      if (typeof v.hintsUsed === "number") c.hintsUsed = clampInt(v.hintsUsed, 0, 3);
      out.completions[key] = c;
    }
  }
  if (raw.hints && typeof raw.hints === "object") {
    for (const [key, value] of Object.entries(raw.hints as Record<string, unknown>).slice(0, 5000)) {
      if (KEY_RE.test(key)) out.hints[key] = clampInt(value, 0, 3);
    }
  }
  if (Array.isArray(raw.activityDays)) out.activityDays = [...new Set(raw.activityDays.filter(isDay))].sort().slice(-400);
  if (raw.badges && typeof raw.badges === "object") {
    for (const [id, at] of Object.entries(raw.badges as Record<string, unknown>).slice(0, 200)) {
      if (/^[\w-]{1,60}$/.test(id) && isIso(at)) out.badges[id] = at;
    }
  }
  if (raw.stats && typeof raw.stats === "object") {
    const s = raw.stats as Record<string, unknown>;
    out.stats = {
      codeRuns: clampInt(s.codeRuns, 0, 1_000_000),
      errorsFixed: clampInt(s.errorsFixed, 0, 1_000_000),
      projectsSaved: clampInt(s.projectsSaved, 0, 100_000),
      projectsShared: clampInt(s.projectsShared, 0, 100_000),
    };
  }
  if (raw.lastVisited && typeof raw.lastVisited === "object") {
    const lv = raw.lastVisited as Record<string, unknown>;
    if (typeof lv.path === "string" && lv.path.startsWith("/") && lv.path.length < 200 && typeof lv.title === "string" && isIso(lv.at)) {
      out.lastVisited = { path: lv.path, title: lv.title.slice(0, 120), at: lv.at };
    }
  }
  out.updatedAt = isIso(raw.updatedAt) ? raw.updatedAt : new Date().toISOString();
  return out;
}

// ----------------------------------------------------------- Abzeichen ----

export type BadgeCondition =
  | { type: "tasksCompleted"; count: number }
  | { type: "perfectQuizzes"; count: number }
  | { type: "noHintTasks"; count: number }
  | { type: "streak"; count: number }
  | { type: "projectsCompleted"; count: number }
  | { type: "projectsSaved"; count: number }
  | { type: "projectsShared"; count: number }
  | { type: "errorsFixed"; count: number }
  | { type: "codeRuns"; count: number }
  | { type: "xp"; count: number }
  | { type: "level"; count: number }
  | { type: "stagePassed"; stage: string }
  | { type: "itemsCompleted"; prefix: string; count: number };

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  /** Name eines Icons (siehe client/src/components/ui/Icon.tsx) */
  icon: string;
  color: string;
  condition: BadgeCondition;
}

/** Wie weit ist man bei einer Abzeichen-Bedingung? Liefert [aktuell, Ziel]. */
export function badgeProgress(p: ProgressData, cond: BadgeCondition): [number, number] {
  const entries = Object.entries(p.completions);
  switch (cond.type) {
    case "tasksCompleted":
      return [entries.filter(([k]) => k.startsWith("task:")).length, cond.count];
    case "perfectQuizzes":
      return [entries.filter(([k, c]) => k.startsWith("quiz:") && (c.score ?? 0) >= 1).length, cond.count];
    case "noHintTasks":
      return [entries.filter(([k, c]) => k.startsWith("task:") && !c.hintsUsed && !c.usedSolution).length, cond.count];
    case "streak":
      return [streakInfo(p.activityDays).longest, cond.count];
    case "projectsCompleted":
      return [entries.filter(([k]) => k.startsWith("project:")).length, cond.count];
    case "projectsSaved":
      return [p.stats.projectsSaved, cond.count];
    case "projectsShared":
      return [p.stats.projectsShared, cond.count];
    case "errorsFixed":
      return [p.stats.errorsFixed, cond.count];
    case "codeRuns":
      return [p.stats.codeRuns, cond.count];
    case "xp":
      return [totalXp(p), cond.count];
    case "level":
      return [levelInfo(totalXp(p)).level, cond.count];
    case "stagePassed":
      return [p.completions[itemKey("final", cond.stage)]?.passed ? 1 : 0, 1];
    case "itemsCompleted":
      return [entries.filter(([k]) => k.includes(cond.prefix)).length, cond.count];
  }
}

/** Gibt die IDs der Abzeichen zurück, die jetzt neu verdient wurden. */
export function evaluateBadges(p: ProgressData, defs: BadgeDef[]): string[] {
  const earned: string[] = [];
  for (const def of defs) {
    if (p.badges[def.id]) continue;
    const [have, need] = badgeProgress(p, def.condition);
    if (have >= need) earned.push(def.id);
  }
  return earned;
}
