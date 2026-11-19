/**
 * Freischalt- und Fortschritts-Berechnungen für Stufen und Kapitel.
 */
import { itemKey, type ProgressData } from "@shared/progress.ts";
import type { Chapter, Stage } from "../../content/types";

/** Schritte eines Kapitels: Erklärung, Aufgaben, Quiz, Projekt */
export type StepId = "lernen" | `aufgabe-${number}` | "quiz" | "projekt";

export interface ChapterStep {
  id: StepId;
  label: string;
  /** Schlüssel im Fortschritt (für "lernen" gibt es keinen) */
  key?: string;
}

export function chapterSteps(chapter: Chapter): ChapterStep[] {
  return [
    { id: "lernen", label: "Erklärung" },
    ...chapter.tasks.map((t, i) => ({
      id: `aufgabe-${i + 1}` as StepId,
      label: `Aufgabe ${i + 1}`,
      key: itemKey("task", chapter.stageId, chapter.id, t.id),
    })),
    { id: "quiz", label: "Quiz", key: itemKey("quiz", chapter.stageId, chapter.id) },
    { id: "projekt", label: "Projekt", key: itemKey("project", chapter.stageId, chapter.id) },
  ];
}

export interface ChapterProgress {
  done: number;
  total: number;
  fraction: number;
  complete: boolean;
}

export function chapterProgress(chapter: Chapter, p: ProgressData): ChapterProgress {
  const keys = chapterSteps(chapter).filter((s) => s.key).map((s) => s.key as string);
  const done = keys.filter((k) => p.completions[k]).length;
  return { done, total: keys.length, fraction: keys.length ? done / keys.length : 0, complete: done === keys.length };
}

export function stageProgress(stage: Stage, p: ProgressData): ChapterProgress & { passed: boolean } {
  let done = 0;
  let total = 0;
  for (const c of stage.chapters) {
    const cp = chapterProgress(c, p);
    done += cp.done;
    total += cp.total;
  }
  const passed = isStagePassed(stage, p);
  return { done, total, fraction: total ? done / total : 0, complete: done === total && total > 0, passed };
}

export function isStagePassed(stage: Stage, p: ProgressData): boolean {
  return Boolean(p.completions[itemKey("final", stage.id)]?.passed);
}

/**
 * Eine Stufe ist frei, wenn sie verfügbar ist und der Abschlusstest der
 * vorherigen *verfügbaren* Stufe bestanden wurde. Stufen, die noch "bald"
 * kommen, werden übersprungen – so blockieren sie den Weg nicht.
 */
export function isStageUnlocked(stage: Stage, all: Stage[], p: ProgressData): boolean {
  if (stage.status !== "verfuegbar") return false;
  const previous = all.filter((s) => s.order < stage.order && s.status === "verfuegbar").sort((a, b) => b.order - a.order)[0];
  return !previous || isStagePassed(previous, p);
}

/** Welche Stufe muss man vorher schaffen? */
export function requiredStage(stage: Stage, all: Stage[]): Stage | undefined {
  return all.filter((s) => s.order < stage.order && s.status === "verfuegbar").sort((a, b) => b.order - a.order)[0];
}

export interface NextStep {
  stage: Stage;
  chapter?: Chapter;
  step?: ChapterStep;
  /** "final" = als Nächstes kommt der Abschlusstest */
  kind: "step" | "final" | "done";
}

/** Was ist die nächste sinnvolle Lektion? */
export function nextStep(all: Stage[], p: ProgressData): NextStep | undefined {
  for (const stage of all) {
    if (!isStageUnlocked(stage, all, p) || isStagePassed(stage, p)) continue;
    for (const chapter of stage.chapters) {
      const steps = chapterSteps(chapter);
      const open = steps.find((s) => s.key && !p.completions[s.key]);
      if (open) {
        // Wer ein Kapitel noch gar nicht begonnen hat, startet mit der Erklärung.
        const started = steps.some((s) => s.key && p.completions[s.key]);
        return { stage, chapter, step: started ? open : steps[0], kind: "step" };
      }
    }
    return { stage, kind: "final" };
  }
  const last = [...all].reverse().find((s) => s.status === "verfuegbar");
  return last ? { stage: last, kind: "done" } : undefined;
}

export function chapterPath(chapter: Chapter, step?: StepId): string {
  return `/lernpfad/${chapter.stageId}/${chapter.id}${step && step !== "lernen" ? `/${step}` : ""}`;
}
