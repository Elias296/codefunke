import { describe, expect, it } from "vitest";
import { emptyProgress, evaluateBadges, itemKey, levelInfo, mergeProgress, sanitizeProgress, streakInfo, totalXp, xpForLevel, type BadgeDef } from "./progress.ts";

describe("Level", () => {
  it("startet bei Level 1 und steigt mit XP", () => {
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(99).level).toBe(1);
    expect(levelInfo(100).level).toBe(2);
    expect(levelInfo(250).level).toBe(3);
    expect(xpForLevel(4)).toBe(450);
    expect(levelInfo(120).progress).toBeCloseTo(20 / 150);
    expect(levelInfo(1_000_000).title).toBe("Großmeister-Drache");
  });
});

describe("Lernserie", () => {
  it("zählt aufeinanderfolgende Tage", () => {
    expect(streakInfo(["2026-11-15", "2026-11-16", "2026-11-17"], "2026-11-17")).toEqual({ current: 3, longest: 3, activeToday: true });
  });
  it("bleibt bestehen, wenn gestern gelernt wurde", () => {
    expect(streakInfo(["2026-11-15", "2026-11-16"], "2026-11-17").current).toBe(2);
  });
  it("bricht nach einem verpassten Tag ab, merkt sich aber den Rekord", () => {
    const s = streakInfo(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-15"], "2026-11-17");
    expect(s.current).toBe(0);
    expect(s.longest).toBe(3);
  });
  it("funktioniert über Monatsgrenzen", () => {
    expect(streakInfo(["2026-10-31", "2026-11-01"], "2026-11-01").current).toBe(2);
  });
});

describe("Zusammenführen", () => {
  it("verliert nichts und nimmt das beste Ergebnis", () => {
    const a = emptyProgress();
    a.completions["quiz:s/c"] = { xp: 10, at: "2026-01-02T00:00:00.000Z", score: 0.5 };
    a.completions["task:s/c/1"] = { xp: 5, at: "2026-01-01T00:00:00.000Z", usedSolution: true };
    const b = emptyProgress();
    b.completions["quiz:s/c"] = { xp: 20, at: "2026-01-03T00:00:00.000Z", score: 1 };
    b.completions["task:s/c/1"] = { xp: 10, at: "2026-01-05T00:00:00.000Z" };
    b.completions["task:s/c/2"] = { xp: 10, at: "2026-01-05T00:00:00.000Z" };
    const m = mergeProgress(a, b);
    expect(m.completions["quiz:s/c"]).toMatchObject({ xp: 20, score: 1, at: "2026-01-02T00:00:00.000Z" });
    expect(m.completions["task:s/c/1"].usedSolution).toBeUndefined();
    expect(totalXp(m)).toBe(40);
    expect(mergeProgress(b, a).completions).toEqual(m.completions);
  });
});

describe("Prüfen von Daten", () => {
  it("lehnt Unsinn ab und begrenzt Werte", () => {
    expect(sanitizeProgress("hallo")).toBeNull();
    const s = sanitizeProgress({ completions: { "task:a/b/c": { xp: 1e9, at: "kaputt" }, "evil<>": { xp: 1 } }, activityDays: ["2026-01-01", "gestern"] })!;
    expect(s.completions["task:a/b/c"].xp).toBe(500);
    expect(Object.keys(s.completions)).toEqual(["task:a/b/c"]);
    expect(s.activityDays).toEqual(["2026-01-01"]);
  });
});

describe("Abzeichen", () => {
  const defs: BadgeDef[] = [
    { id: "eins", title: "", description: "", icon: "star", color: "", condition: { type: "tasksCompleted", count: 1 } },
    { id: "stufe", title: "", description: "", icon: "star", color: "", condition: { type: "stagePassed", stage: "1-scratch" } },
  ];
  it("werden nur einmal vergeben", () => {
    const p = emptyProgress();
    expect(evaluateBadges(p, defs)).toEqual([]);
    p.completions[itemKey("task", "1-scratch", "k", "a")] = { xp: 10, at: new Date().toISOString() };
    p.completions[itemKey("final", "1-scratch")] = { xp: 100, at: new Date().toISOString(), passed: true };
    expect(evaluateBadges(p, defs)).toEqual(["eins", "stufe"]);
    p.badges.eins = new Date().toISOString();
    expect(evaluateBadges(p, defs)).toEqual(["stufe"]);
  });
});
