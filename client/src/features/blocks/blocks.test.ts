import { describe, expect, it } from "vitest";
import { parseDsl, toDsl, DslError } from "./dsl";
import { simulate, checkBlocksTask, precheck, countBlocks } from "./checks";
import { toPython } from "./pythonGen";

describe("Block-Schreibweise (DSL)", () => {
  it("baut verschachtelte Programme", () => {
    const ws = parseDsl(`
wenn_start
  stift_runter
  wiederhole 4
    gehe 100
    drehe_rechts 90
  falls (berührt_rand)
    sage "Au!"
  sonst
    gehe 10
  setze punkte 0
  ändere punkte (zufall 1 6)
`);
    expect(ws.blocks!.blocks).toHaveLength(1);
    expect(ws.variables).toEqual([{ name: "punkte", id: "v_punkte" }]);
    expect(countBlocks(ws, "control_if_else")).toBe(1);
    expect(countBlocks(ws, "motion_move")).toBe(2);
  });

  it("Rundreise Text → JSON → Text bleibt gleich", () => {
    const src = ["wenn_start", "  wiederhole 3", "    gehe 50", "    sage_für \"Hi\" 1", "  setze_x (+ (x-pos) 1)"].join("\n").replace("(x-pos)", "(x)");
    expect(toDsl(parseDsl(src))).toBe(src);
  });

  it("meldet Fehler mit Zeilennummer", () => {
    expect(() => parseDsl("wenn_start\n  hüpfe 3")).toThrow(DslError);
    expect(() => parseDsl("wenn_start\n  hüpfe 3")).toThrow(/Zeile 2/);
    expect(() => parseDsl("wenn_taste quer")).toThrow(/nicht erlaubt/);
  });
});

describe("Interpreter", () => {
  it("läuft ein Quadrat und kommt zurück", async () => {
    const w = await simulate(parseDsl("wenn_start\n  stift_runter\n  wiederhole 4\n    gehe 100\n    drehe_rechts 90"));
    expect(Math.round(w.sprite.x)).toBe(0);
    expect(Math.round(w.sprite.y)).toBe(0);
    expect(w.segments.filter((s) => s.x1 !== s.x2 || s.y1 !== s.y2)).toHaveLength(4);
    expect(w.sprite.direction).toBe(90);
  });

  it("wartet und stoppt endlose Schleifen nach maxTicks", async () => {
    const w = await simulate(parseDsl("wenn_start\n  wiederhole_immer\n    ändere_x 1\n    pralle_ab"), {}, { maxTicks: 100 });
    expect(w.tick).toBe(100);
  });

  it("Variablen, Rechnen und Bedingungen", async () => {
    const w = await simulate(parseDsl("wenn_start\n  setze punkte 0\n  wiederhole 5\n    ändere punkte 2\n  falls (> punkte 9)\n    sage \"Super\""));
    expect(w.variables.punkte).toBe(10);
    expect(w.said).toContain("Super");
  });

  it("Tasten-Ereignisse in der Simulation", async () => {
    const ws = parseDsl("wenn_taste rechts\n  ändere_x 10");
    const w = await simulate(ws, {}, { steps: [{ key: "rechts", ticks: 2 }, { key: "rechts", ticks: 2 }] });
    expect(w.sprite.x).toBe(20);
  });

  it("gleiten braucht Zeit", async () => {
    const w = await simulate(parseDsl("wenn_start\n  gleite 1 100 50"));
    expect(w.sprite.x).toBe(100);
    expect(w.tick).toBeGreaterThanOrEqual(60);
  });
});

describe("Prüfungen", () => {
  it("findet fehlenden Startblock und lose Blöcke", () => {
    expect(precheck(parseDsl("gehe 10"))).toMatch(/Startblock/);
    expect(precheck(parseDsl("wenn_start\n  gehe 10\ngehe 5\n"))).toMatch(/lose/);
    expect(precheck(parseDsl("wenn_start\n  gehe 10\n  gehe 5\n"))).toBeUndefined();
  });

  it("prüft Position mit Platzhaltern", async () => {
    const res = await checkBlocksTask(parseDsl("wenn_start\n  gehe 50"), [{ type: "position", x: 100, message: "Funki ist bei x={x}" }]);
    expect(res.ok).toBe(false);
    expect(res.message).toBe("Funki ist bei x=50");
  });

  it("blockCount max erzwingt Schleifen", async () => {
    const ws = parseDsl("wenn_start\n  gehe 10\n  gehe 10\n  gehe 10");
    const res = await checkBlocksTask(ws, [{ type: "blockCount", block: "motion_move", max: 1, message: "Zu viele ({actual})" }]);
    expect(res.message).toBe("Zu viele (3)");
  });
});

describe("Python-Übersetzung", () => {
  it("übersetzt Schleifen und Bedingungen", () => {
    const py = toPython(parseDsl("wenn_start\n  wiederhole 4\n    gehe 100\n    drehe_rechts 90\n  falls (berührt_rand)\n    sage \"Au!\"\n  setze punkte (zufall 1 6)"));
    expect(py).toContain("for i in range(4):\n    gehe(100)\n    drehe_rechts(90)");
    expect(py).toContain('if berührt_rand():\n    sage("Au!")');
    expect(py).toContain("punkte = random.randint(1, 6)");
    expect(py).toContain("import random");
  });
});
