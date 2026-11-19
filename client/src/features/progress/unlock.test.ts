import { describe, expect, it } from "vitest";
import { emptyProgress, itemKey } from "@shared/progress.ts";
import { stages } from "../../content/loader";
import { chapterSteps, isStageUnlocked, nextStep, requiredStage } from "./unlock";

const scratch = stages.find((s) => s.id === "1-scratch")!;
const python = stages.find((s) => s.id === "3-python")!;

describe("Freischalten", () => {
  it("Stufe 1 ist frei, Python erst nach dem Abschlusstest", () => {
    const p = emptyProgress();
    expect(isStageUnlocked(scratch, stages, p)).toBe(true);
    expect(isStageUnlocked(python, stages, p)).toBe(false);
    p.completions[itemKey("final", "1-scratch")] = { xp: 100, at: new Date().toISOString(), passed: true };
    expect(isStageUnlocked(python, stages, p)).toBe(true);
  });
  it("Stufen, die noch kommen, werden übersprungen", () => {
    expect(requiredStage(python, stages)?.id).toBe("1-scratch");
    expect(isStageUnlocked(stages.find((s) => s.status === "bald")!, stages, emptyProgress())).toBe(false);
  });
});

describe("Nächster Schritt", () => {
  it("beginnt mit der ersten Erklärung", () => {
    const n = nextStep(stages, emptyProgress())!;
    expect(n.chapter?.id).toBe("01-bewegung");
    expect(n.step?.id).toBe("lernen");
  });
  it("macht in einem begonnenen Kapitel beim ersten offenen Schritt weiter", () => {
    const p = emptyProgress();
    const ch = scratch.chapters[0];
    p.completions[itemKey("task", scratch.id, ch.id, ch.tasks[0].id)] = { xp: 10, at: new Date().toISOString() };
    expect(nextStep(stages, p)?.step?.id).toBe("aufgabe-2");
  });
  it("schlägt den Abschlusstest vor, wenn alle Kapitel fertig sind", () => {
    const p = emptyProgress();
    for (const ch of scratch.chapters) for (const s of chapterSteps(ch)) if (s.key) p.completions[s.key] = { xp: 1, at: new Date().toISOString() };
    expect(nextStep(stages, p)).toMatchObject({ kind: "final" });
  });
});
