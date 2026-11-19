/**
 * Automatische Prüfung von Block-Aufgaben.
 *
 * 1. Struktur-Prüfungen: Gibt es einen Startblock? Hängen alle Blöcke dran?
 *    Wurde z. B. eine Schleife benutzt?
 * 2. Verhalten: Das Programm wird ohne Bildschirm simuliert (siehe runtime.ts)
 *    und danach wird geprüft, wo Funki steht, was er gesagt hat usw.
 */
import type { BlockCheck, RunConfig, StageSetup } from "../../content/types";
import { BLOCK_BY_TYPE, type SBlock, type SWorkspace } from "./blockSpecs";
import { Runtime, formatValue, type WorldState } from "./runtime";

export interface CheckResult {
  ok: boolean;
  /** Freundliche Rückmeldung (Fehler) */
  message?: string;
  world?: WorldState;
}

/** Alle Blöcke (inkl. verschachtelter) durchlaufen */
export function walkBlocks(ws: SWorkspace, visit: (b: SBlock, top: boolean) => void) {
  const walk = (b: SBlock | undefined, top: boolean) => {
    for (let cur = b, first = top; cur; cur = cur.next?.block, first = false) {
      visit(cur, first);
      for (const input of Object.values(cur.inputs ?? {})) walk(input.block, false);
    }
  };
  for (const top of ws.blocks?.blocks ?? []) walk(top, true);
}

export function countBlocks(ws: SWorkspace, type?: string): number {
  let n = 0;
  walkBlocks(ws, (b) => {
    if (type ? b.type === type : isStatement(b.type)) n++;
  });
  return n;
}

function isStatement(type: string): boolean {
  const shape = BLOCK_BY_TYPE[type]?.shape;
  return shape === "statement" || shape === "cap";
}

/** Lässt ein Programm ohne Bildschirm laufen und gibt den Endzustand zurück */
export async function simulate(ws: SWorkspace, setup: StageSetup = {}, run: RunConfig = {}): Promise<WorldState> {
  const rt = new Runtime(ws, setup, { seed: run.seed ?? 42 });
  const maxTicks = run.maxTicks ?? 2400;
  const steps = run.steps ?? [{ flag: true }];
  for (const step of steps) {
    if (step.flag) rt.start();
    if (step.click) rt.click();
    if (step.key) rt.pressKey(step.key);
    const ticks = step.ticks ?? (step.key ? 1 : 0);
    for (let i = 0; i < ticks && rt.world.tick < maxTicks; i++) await rt.tick();
    if (step.key) rt.releaseKey(step.key);
  }
  while (rt.isRunning && rt.world.tick < maxTicks) await rt.tick();
  rt.stop();
  return rt.world;
}

/** Struktur-Vorprüfung: typische Anfängerfehler finden */
export function precheck(ws: SWorkspace): string | undefined {
  const tops = ws.blocks?.blocks ?? [];
  const hats = tops.filter((b) => BLOCK_BY_TYPE[b.type]?.shape === "hat");
  if (tops.length === 0) return "Deine Programmierfläche ist noch leer. Zieh Blöcke aus der Werkzeugkiste links herein!";
  if (hats.length === 0) {
    return "Es fehlt ein Startblock! Hol dir „Wenn ▶ angeklickt“ aus „Ereignisse“ und häng deine Blöcke darunter.";
  }
  const loose = tops.filter((b) => BLOCK_BY_TYPE[b.type]?.shape !== "hat" && BLOCK_BY_TYPE[b.type]?.shape !== "reporter" && BLOCK_BY_TYPE[b.type]?.shape !== "boolean");
  if (loose.length > 0) {
    return "Ein paar Blöcke liegen lose herum. Sie laufen nur, wenn sie an einem Startblock hängen – schieb sie zusammen, bis es „klick“ macht!";
  }
  let emptyCondition = false;
  walkBlocks(ws, (b) => {
    if (["control_if", "control_if_else", "control_repeat_until"].includes(b.type) && !b.inputs?.COND?.block) emptyCondition = true;
  });
  if (emptyCondition) return "In einem „falls“- oder „wiederhole bis“-Block fehlt die Bedingung (das sechseckige Feld).";
  return undefined;
}

function fmt(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? formatValue(vars[k]) : `{${k}}`));
}

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

function angleDiff(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return Math.min(d, 360 - d);
}

/** Prüft eine Aufgabe. Gibt die erste nicht erfüllte Bedingung zurück. */
export async function checkBlocksTask(ws: SWorkspace, checks: BlockCheck[], setup: StageSetup = {}, run: RunConfig = {}): Promise<CheckResult> {
  const pre = precheck(ws);
  if (pre) return { ok: false, message: pre };

  let world: WorldState | undefined;
  const getWorld = async () => (world ??= await simulate(ws, setup, run));
  const start = { x: setup.x ?? 0, y: setup.y ?? 0 };

  for (const check of checks) {
    switch (check.type) {
      case "hasBlock": {
        const n = countBlocks(ws, check.block);
        if (n < (check.min ?? 1)) return { ok: false, message: check.message };
        break;
      }
      case "blockCount": {
        const n = countBlocks(ws, check.block);
        if ((check.min !== undefined && n < check.min) || (check.max !== undefined && n > check.max)) {
          return { ok: false, message: fmt(check.message, { actual: n, min: check.min, max: check.max }) };
        }
        break;
      }
      case "position": {
        const w = await getWorld();
        const tol = check.tolerance ?? 3;
        const { x, y } = w.sprite;
        if ((check.x !== undefined && Math.abs(x - check.x) > tol) || (check.y !== undefined && Math.abs(y - check.y) > tol)) {
          return { ok: false, message: fmt(check.message, { x: Math.round(x), y: Math.round(y) }), world: w };
        }
        break;
      }
      case "direction": {
        const w = await getWorld();
        if (angleDiff(w.sprite.direction, check.value) > 1) return { ok: false, message: fmt(check.message, { actual: w.sprite.direction }), world: w };
        break;
      }
      case "said": {
        const w = await getWorld();
        const wanted = check.text.toLowerCase().trim();
        if (!w.said.some((s) => s.toLowerCase().includes(wanted))) {
          return { ok: false, message: fmt(check.message, { said: w.said[w.said.length - 1] ?? "nichts" }), world: w };
        }
        break;
      }
      case "variable": {
        const w = await getWorld();
        const value = w.variables[check.name];
        if (value === undefined) {
          return { ok: false, message: `Es gibt noch keine Variable „${check.name}“. Erstelle sie unter „Variablen“.`, world: w };
        }
        const bad =
          (check.equals !== undefined && String(value).toLowerCase() !== String(check.equals).toLowerCase()) ||
          (check.min !== undefined && Number(value) < check.min);
        if (bad) return { ok: false, message: fmt(check.message, { actual: value }), world: w };
        break;
      }
      case "penSegments": {
        const w = await getWorld();
        const lines = w.segments.filter((s) => s.x1 !== s.x2 || s.y1 !== s.y2).length;
        if (lines < check.min || (check.max !== undefined && lines > check.max)) return { ok: false, message: fmt(check.message, { actual: lines }), world: w };
        break;
      }
      case "closedShape": {
        const w = await getWorld();
        const lines = w.segments.filter((s) => s.x1 !== s.x2 || s.y1 !== s.y2);
        const closed = lines.length >= 3 && Math.hypot(lines[0].x1 - lines[lines.length - 1].x2, lines[0].y1 - lines[lines.length - 1].y2) < 3;
        if (!closed) return { ok: false, message: check.message, world: w };
        break;
      }
      case "moved": {
        const w = await getWorld();
        if (Math.hypot(w.sprite.x - start.x, w.sprite.y - start.y) < 1) return { ok: false, message: check.message, world: w };
        break;
      }
      case "state": {
        const w = await getWorld();
        const v = getPath(w, check.path);
        const bad =
          (check.equals !== undefined && v !== check.equals) ||
          (check.min !== undefined && Number(v) < check.min) ||
          (check.max !== undefined && Number(v) > check.max);
        if (bad) return { ok: false, message: fmt(check.message, { actual: v }), world: w };
        break;
      }
    }
  }
  return { ok: true, world };
}
