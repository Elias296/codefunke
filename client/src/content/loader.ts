/**
 * Lädt alle Lerninhalte aus /content (zur Build-Zeit über import.meta.glob).
 * Neue Stufen/Kapitel werden automatisch gefunden – es reicht, die Dateien
 * anzulegen und das Kapitel in stage.json einzutragen.
 */
import type { BadgeDef } from "@shared/progress.ts";
import type { Chapter, FinalTest, Project, Question, Stage, Task } from "./types";
import { text } from "./text";
import badgesJson from "@content/badges.json";

const stageFiles = import.meta.glob("@content/*/stage.json", { eager: true, import: "default" }) as Record<string, unknown>;
const chapterFiles = import.meta.glob("@content/*/*/chapter.json", { eager: true, import: "default" }) as Record<string, unknown>;
const lessonFiles = import.meta.glob("@content/*/*/lesson.md", { eager: true, query: "?raw", import: "default" }) as Record<string, string>;

export { text };

export class ContentError extends Error {}

function fail(where: string, msg: string): never {
  throw new ContentError(`Inhalt fehlerhaft (${where}): ${msg}`);
}

function req<T>(obj: Record<string, unknown>, key: string, where: string): T {
  if (obj[key] === undefined || obj[key] === null) fail(where, `Feld "${key}" fehlt`);
  return obj[key] as T;
}

function lastSegments(path: string, n: number): string[] {
  return path.split("/").slice(-n - 1, -1);
}

function checkQuestions(questions: Question[], where: string): Question[] {
  if (!Array.isArray(questions)) fail(where, "questions muss eine Liste sein");
  questions.forEach((q, i) => {
    const w = `${where}, Frage ${i + 1}`;
    if (!q.question) fail(w, "Fragetext fehlt");
    if (q.type === "single") {
      if (!Array.isArray(q.options) || q.answer < 0 || q.answer >= q.options.length) fail(w, "answer passt nicht zu options");
    } else if (q.type === "multiple") {
      if (!Array.isArray(q.answer) || q.answer.some((a) => a < 0 || a >= q.options.length)) fail(w, "answer passt nicht zu options");
    } else if (q.type === "text") {
      if (!Array.isArray(q.answer) || q.answer.length === 0) fail(w, "answer muss eine Liste möglicher Antworten sein");
    } else if (q.type === "order") {
      if (!Array.isArray(q.lines) || q.lines.length < 2) fail(w, "lines braucht mindestens 2 Zeilen");
    } else {
      fail(w, `unbekannter Fragetyp "${(q as { type: string }).type}"`);
    }
  });
  return questions;
}

function normalizeTask(raw: Record<string, unknown>, where: string): Task {
  const id = req<string>(raw, "id", where);
  const w = `${where}, Aufgabe ${id}`;
  const kind = req<string>(raw, "kind", w);
  if (kind !== "blocks" && kind !== "code") fail(w, `kind muss "blocks" oder "code" sein`);
  req(raw, "title", w);
  req(raw, "instructions", w);
  req(raw, "solution", w);
  const hints = req<string[]>(raw, "hints", w);
  if (!Array.isArray(hints) || hints.length !== 2) fail(w, "hints braucht genau 2 Einträge (Tipp, größerer Tipp)");
  if (!Array.isArray(raw.checks) || raw.checks.length === 0) fail(w, "checks braucht mindestens eine Prüfung");
  const difficulty = (raw.difficulty as number) ?? 1;
  if (kind === "code" && !raw.language) fail(w, "language fehlt");
  return { difficulty, ...raw, xp: (raw.xp as number) ?? difficulty * 10 } as Task;
}

function buildChapter(stageId: string, chapterId: string): Chapter {
  const key = Object.keys(chapterFiles).find((k) => {
    const [s, c] = lastSegments(k, 2);
    return s === stageId && c === chapterId;
  });
  const where = `${stageId}/${chapterId}`;
  if (!key) fail(where, "chapter.json nicht gefunden");
  const raw = chapterFiles[key] as Record<string, unknown>;
  const lessonKey = key.replace(/chapter\.json$/, "lesson.md");
  const lesson = lessonFiles[lessonKey];
  if (!lesson) fail(where, "lesson.md fehlt");

  const tasks = req<Record<string, unknown>[]>(raw, "tasks", where).map((t) => normalizeTask(t, where));
  const ids = new Set<string>();
  for (const t of tasks) {
    if (ids.has(t.id)) fail(where, `Aufgaben-ID "${t.id}" doppelt`);
    ids.add(t.id);
  }
  const quiz = req<{ questions: Question[] }>(raw, "quiz", where);
  const project = req<Project>(raw, "project", where);
  if (!project.title || !project.requirements) fail(where, "project braucht title und requirements");

  return {
    id: chapterId,
    stageId,
    title: req<string>(raw, "title", where),
    summary: (raw.summary as string) ?? "",
    icon: (raw.icon as string) ?? "sparkles",
    lesson,
    tasks,
    quiz: { questions: checkQuestions(quiz.questions, `${where}, Quiz`) },
    project: { xp: 50, ...project },
  };
}

function buildStages(): Stage[] {
  const stages: Stage[] = [];
  for (const [path, value] of Object.entries(stageFiles)) {
    const [stageId] = lastSegments(path, 1);
    const raw = value as Record<string, unknown>;
    const status = (raw.status as Stage["status"]) ?? "verfuegbar";
    const chapterIds = (raw.chapters as string[]) ?? [];
    const finalTest = raw.finalTest as FinalTest | undefined;
    if (finalTest) checkQuestions(finalTest.questions, `${stageId}, Abschlusstest`);
    if (status === "verfuegbar" && !finalTest) fail(stageId, "verfügbare Stufen brauchen einen finalTest");
    stages.push({
      id: stageId,
      order: req<number>(raw, "order", stageId),
      title: req<string>(raw, "title", stageId),
      short: (raw.short as string) ?? (raw.title as string),
      subtitle: (raw.subtitle as string) ?? "",
      description: (raw.description as string) ?? "",
      language: req(raw, "language", stageId),
      color: (raw.color as string) ?? "var(--color-flame)",
      icon: (raw.icon as string) ?? "sparkles",
      status,
      chapters: status === "verfuegbar" ? chapterIds.map((c) => buildChapter(stageId, c)) : [],
      planned: raw.planned as Stage["planned"],
      finalTest: finalTest ? { ...finalTest, passScore: finalTest.passScore ?? 0.7 } : undefined,
    });
  }
  return stages.sort((a, b) => a.order - b.order);
}

export const stages: Stage[] = buildStages();
export const badges: BadgeDef[] = badgesJson as BadgeDef[];

export function getStage(id: string | undefined): Stage | undefined {
  return stages.find((s) => s.id === id);
}

export function getChapter(stageId: string | undefined, chapterId: string | undefined): Chapter | undefined {
  return getStage(stageId)?.chapters.find((c) => c.id === chapterId);
}
