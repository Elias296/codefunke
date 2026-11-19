/**
 * Prüft ALLE Lerninhalte automatisch:
 *  - Jede Musterlösung besteht ihre eigenen Prüfungen.
 *  - Kein Startprogramm ist schon von allein richtig.
 *  - Alle Block-Programme in Lektionen und Quizfragen sind gültig.
 *  - Icons existieren.
 * So fällt sofort auf, wenn eine neue Aufgabe einen Fehler hat.
 */
import { describe, expect, it } from "vitest";
import { badges, stages } from "./loader";
import { text } from "./text";
import type { BlockCheck, CodeCheck } from "./types";
import { parseDsl } from "../features/blocks/dsl";
import { checkBlocksTask } from "../features/blocks/checks";
import { BLOCK_BY_TYPE } from "../features/blocks/blockSpecs";
import { checkCodeTask } from "../features/runners/python/checkCode";
import { nodeRunGroups } from "../features/runners/python/testPyodide";
import { ICONS } from "../components/ui/Icon";

const available = stages.filter((s) => s.status === "verfuegbar");

function blockFences(md: string): string[] {
  return [...md.matchAll(/```blocks(?:-python)?\n([\s\S]*?)```/g)].map((m) => m[1]);
}

describe("Struktur", () => {
  it("es gibt die Stufen 1 bis 6", () => {
    expect(stages.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("Stufe 1 und 3 sind verfügbar", () => {
    expect(available.map((s) => s.id)).toEqual(expect.arrayContaining(["1-scratch", "3-python"]));
  });
  it("alle Icons existieren", () => {
    for (const s of stages) expect(ICONS[s.icon], s.id).toBeDefined();
    for (const b of badges) expect(ICONS[b.icon], b.id).toBeDefined();
    for (const s of available) for (const c of s.chapters) expect(ICONS[c.icon], c.id).toBeDefined();
  });
});

for (const stage of available) {
  describe(`Stufe ${stage.order}: ${stage.title}`, () => {
    it("Kapitel haben 3–5 Aufgaben, ein Quiz und ein Projekt", () => {
      expect(stage.chapters.length).toBeGreaterThanOrEqual(4);
      for (const c of stage.chapters) {
        expect(c.tasks.length, c.id).toBeGreaterThanOrEqual(3);
        expect(c.tasks.length, c.id).toBeLessThanOrEqual(5);
        expect(c.quiz.questions.length, c.id).toBeGreaterThanOrEqual(4);
        expect(c.project.requirements.length, c.id).toBeGreaterThan(0);
      }
      expect(stage.finalTest!.questions.length).toBeGreaterThanOrEqual(8);
    });

    it("Block-Programme in Lektionen und Quizfragen sind gültig", () => {
      const quizBlocks = (qs: { blocks?: string | string[] }[]) => qs.filter((q) => q.blocks).map((q) => text(q.blocks));
      for (const c of stage.chapters) {
        for (const src of [...blockFences(c.lesson), ...quizBlocks(c.quiz.questions)]) expect(() => parseDsl(src), `${c.id}: ${src}`).not.toThrow();
      }
      for (const src of quizBlocks(stage.finalTest!.questions)) expect(() => parseDsl(src)).not.toThrow();
    });

    for (const chapter of stage.chapters) {
      it(`${chapter.id}: Lösungen bestehen, Startprogramme nicht`, async () => {
        for (const task of chapter.tasks) {
          const where = `${chapter.id}/${task.id}`;
          if (task.kind === "blocks") {
            for (const type of task.toolbox ?? []) expect(BLOCK_BY_TYPE[type], `${where}: unbekannter Block ${type}`).toBeDefined();
            const solution = await checkBlocksTask(parseDsl(text(task.solution)), task.checks, task.stage, task.run);
            expect(solution.ok, `${where}: Lösung scheitert: ${solution.message}`).toBe(true);
            const start = await checkBlocksTask(parseDsl(text(task.starter) || "wenn_start"), task.checks, task.stage, task.run);
            expect(start.ok, `${where}: Startprogramm ist schon richtig`).toBe(false);
          } else {
            const solution = await checkCodeTask(text(task.solution), task.checks, nodeRunGroups);
            expect(solution.ok, `${where}: Lösung scheitert: ${solution.title} ${solution.message}`).toBe(true);
            const start = await checkCodeTask(text(task.starter), task.checks, nodeRunGroups);
            expect(start.ok, `${where}: Startprogramm ist schon richtig`).toBe(false);
          }
        }
        const p = chapter.project;
        if (p.example && p.checks?.length) {
          const res = p.kind === "blocks"
            ? await checkBlocksTask(parseDsl(text(p.example)), p.checks as BlockCheck[], p.stage, p.run)
            : await checkCodeTask(text(p.example), p.checks as CodeCheck[], nodeRunGroups);
          expect(res.ok, `${chapter.id}: Projekt-Beispiel scheitert: ${res.message}`).toBe(true);
        }
        if (p.kind === "blocks" && p.starter) expect(() => parseDsl(text(p.starter))).not.toThrow();
      });
    }
  });
}
