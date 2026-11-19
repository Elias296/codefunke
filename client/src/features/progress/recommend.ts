/**
 * Empfehlungen für das Dashboard: Was wäre jetzt sinnvoll?
 */
import { itemKey, streakInfo, type ProgressData } from "@shared/progress.ts";
import type { Stage } from "../../content/types";
import { chapterPath, chapterProgress, isStagePassed, isStageUnlocked, stageProgress } from "./unlock";

export interface Recommendation {
  id: string;
  title: string;
  text: string;
  href: string;
  icon: string;
}

export function recommendations(stages: Stage[], p: ProgressData): Recommendation[] {
  const out: Recommendation[] = [];
  const streak = streakInfo(p.activityDays);
  if (streak.current > 0 && !streak.activeToday) {
    out.push({ id: "streak", title: "Halte deine Serie!", text: `Du hast ${streak.current} ${streak.current === 1 ? "Tag" : "Tage"} am Stück gelernt. Schon eine Aufgabe heute hält die Flamme am Leben.`, href: "/lernpfad", icon: "flame" });
  }
  for (const stage of stages) {
    if (!isStageUnlocked(stage, stages, p)) continue;
    const sp = stageProgress(stage, p);
    if (sp.complete && !isStagePassed(stage, p)) {
      out.push({ id: `final-${stage.id}`, title: "Bereit für den Abschlusstest!", text: `Du hast alle Kapitel von „${stage.short}“ geschafft. Zeig, was du kannst!`, href: `/lernpfad/${stage.id}/abschlusstest`, icon: "graduation" });
    }
    for (const chapter of stage.chapters) {
      const quiz = p.completions[itemKey("quiz", stage.id, chapter.id)];
      if (quiz && (quiz.score ?? 1) < 1) {
        out.push({ id: `quiz-${chapter.id}`, title: `Quiz „${chapter.title}“ verbessern`, text: `Du hattest ${Math.round((quiz.score ?? 0) * 100)} %. Schaffst du alle Fragen?`, href: chapterPath(chapter, "quiz"), icon: "brain" });
      }
      const cp = chapterProgress(chapter, p);
      const projectDone = p.completions[itemKey("project", stage.id, chapter.id)];
      if (!projectDone && cp.done >= cp.total - 1 && cp.done > 0) {
        out.push({ id: `project-${chapter.id}`, title: `Projekt: ${chapter.project.title}`, text: "Bau etwas Eigenes mit dem, was du gelernt hast!", href: chapterPath(chapter, "projekt"), icon: "puzzle" });
      }
      chapter.tasks.forEach((task, i) => {
        const c = p.completions[itemKey("task", stage.id, chapter.id, task.id)];
        if (c?.usedSolution) {
          out.push({ id: `redo-${task.id}-${chapter.id}`, title: `„${task.title}“ ohne Hilfe`, text: "Du hast hier die Lösung angeschaut. Schaffst du es jetzt alleine?", href: chapterPath(chapter, `aufgabe-${i + 1}`), icon: "target" });
        }
      });
    }
  }
  if (p.stats.projectsSaved === 0) {
    out.push({ id: "editor", title: "Bau dein eigenes Programm", text: "Im Editor kannst du frei loslegen – mit Blöcken, Python oder einer Webseite.", href: "/editor", icon: "wand" });
  }
  return out.slice(0, 4);
}
