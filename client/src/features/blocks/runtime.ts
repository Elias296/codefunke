/**
 * Interpreter für Block-Programme.
 *
 * - Arbeitet direkt auf dem Blockly-JSON (kein eval, kein generierter Code).
 * - Jedes Startblock-Programm läuft als eigener "Faden" (async-Funktion).
 * - Die Zeit läuft in Ticks (60 pro Sekunde). Schleifen machen nach jedem
 *   Durchlauf eine Pause bis zum nächsten Tick – wie in Scratch. Dadurch kann
 *   ein Programm nie den Browser einfrieren.
 * - Ohne Bildschirm (headless) laufen die Ticks so schnell wie möglich:
 *   so prüfen wir Aufgaben automatisch in wenigen Millisekunden.
 */
import { BLOCK_BY_TYPE, COLOR_VALUES, BACKGROUND_VALUES, type SBlock, type SWorkspace } from "./blockSpecs";
import type { StageSetup } from "../../content/types";

export const STAGE_W = 480;
export const STAGE_H = 360;
export const TICKS_PER_SECOND = 60;
const SPRITE_RADIUS = 30;
const STAR_RADIUS = 18;

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  size: number;
}

export interface WorldState {
  sprite: { x: number; y: number; direction: number; size: number; visible: boolean; color: string; say: string | null };
  star: { x: number; y: number; visible: boolean };
  background: string;
  pen: { down: boolean; color: string; size: number };
  segments: Segment[];
  variables: Record<string, number | string>;
  /** Alles, was Funki gesagt hat (für Prüfungen) */
  said: string[];
  tick: number;
}

export interface RuntimeOptions {
  seed?: number;
  /** Wird vor jedem ausgeführten Befehls-Block aufgerufen (zum Hervorheben) */
  onBlock?: (id: string | undefined) => void;
  /** Langsam-Modus: Pause in Ticks nach jedem Befehl */
  slowTicks?: number;
}

class StopSignal extends Error {}

/** Kleiner, wiederholbarer Zufallsgenerator (mulberry32) */
function makeRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const macrotask: () => Promise<void> =
  typeof setImmediate === "function"
    ? () => new Promise((r) => setImmediate(r))
    : (() => {
        const channel = new MessageChannel();
        const queue: (() => void)[] = [];
        channel.port1.onmessage = () => queue.shift()?.();
        return () => new Promise<void>((r) => { queue.push(r); channel.port2.postMessage(0); });
      })();

export function initialWorld(setup: StageSetup = {}, variableNames: string[] = []): WorldState {
  const star = setup.star === false || setup.star === undefined ? { x: 150, y: 80, visible: false } : { x: setup.star.x, y: setup.star.y, visible: setup.star.visible ?? true };
  return {
    sprite: { x: setup.x ?? 0, y: setup.y ?? 0, direction: setup.direction ?? 90, size: 100, visible: true, color: "orange", say: null },
    star,
    background: setup.background ?? "weiß",
    pen: { down: false, color: "blau", size: 4 },
    segments: [],
    variables: Object.fromEntries(variableNames.map((n) => [n, 0])),
    said: [],
    tick: 0,
  };
}

/** Wandelt einen Wert wie Scratch in eine Zahl um ("5" → 5, "abc" → 0) */
export function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : v > 0 ? Infinity : v < 0 ? -Infinity : 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  const s = String(v ?? "").trim();
  if (s === "") return 0;
  const n = Number(s.replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

function isNumeric(v: unknown): boolean {
  if (typeof v === "number") return true;
  const s = String(v ?? "").trim();
  return s !== "" && !Number.isNaN(Number(s.replace(",", ".")));
}

/** Vergleicht wie Scratch: Zahlen als Zahlen, sonst Texte ohne Groß/Klein */
export function compare(a: unknown, b: unknown): number {
  if (isNumeric(a) && isNumeric(b)) return toNumber(a) - toNumber(b);
  const sa = String(a).toLowerCase();
  const sb = String(b).toLowerCase();
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function normalizeDirection(d: number): number {
  let r = ((d + 180) % 360 + 360) % 360 - 180;
  if (r === -180) r = 180;
  return r;
}

/** Zahl hübsch formatieren (keine 0.30000000000000004) */
export function formatValue(v: unknown): string {
  if (typeof v === "number") return String(Math.round(v * 1e6) / 1e6);
  return String(v);
}

export class Runtime {
  world: WorldState;
  private program: SWorkspace;
  private varNames: Map<string, string>;
  private waiters: (() => void)[] = [];
  private running = new Map<SBlock, Promise<void>>();
  private keysDown = new Set<string>();
  private stopped = false;
  private random: () => number;
  private opts: RuntimeOptions;
  /** Warnungen, z. B. unbekannte Blöcke */
  warnings: string[] = [];

  constructor(program: SWorkspace, setup: StageSetup = {}, opts: RuntimeOptions = {}) {
    this.program = program;
    this.opts = opts;
    this.varNames = new Map((program.variables ?? []).map((v) => [v.id, v.name]));
    this.world = initialWorld(setup, [...this.varNames.values()]);
    this.random = makeRandom(opts.seed ?? Math.floor(Math.random() * 2 ** 31));
  }

  get isRunning(): boolean {
    return this.running.size > 0 && !this.stopped;
  }

  private hats(type: string, filter?: (b: SBlock) => boolean): SBlock[] {
    return (this.program.blocks?.blocks ?? []).filter((b) => b.type === type && (!filter || filter(b)));
  }

  private launch(hat: SBlock) {
    if (this.running.has(hat) || this.stopped) return;
    const p = this.execChain(hat.next?.block)
      .catch((e) => { if (!(e instanceof StopSignal)) this.warnings.push(String(e)); })
      .finally(() => this.running.delete(hat));
    this.running.set(hat, p);
  }

  /** Grüne Flagge: alle "Wenn ▶ angeklickt"-Programme starten */
  start() {
    for (const hat of this.hats("event_flag")) this.launch(hat);
  }

  pressKey(key: string) {
    this.keysDown.add(key);
    for (const hat of this.hats("event_key", (b) => b.fields?.KEY === key)) this.launch(hat);
  }

  releaseKey(key: string) {
    this.keysDown.delete(key);
  }

  /** Klick auf die Bühne an Position (x, y) in Bühnen-Koordinaten */
  click(x?: number, y?: number) {
    const s = this.world.sprite;
    const r = SPRITE_RADIUS * (s.size / 100) + 6;
    if (x !== undefined && y !== undefined && (!s.visible || Math.hypot(x - s.x, y - s.y) > r)) return;
    for (const hat of this.hats("event_click")) this.launch(hat);
  }

  stop() {
    this.stopped = true;
    const ws = this.waiters;
    this.waiters = [];
    ws.forEach((r) => r());
  }

  /** Ein Zeitschritt: alle wartenden Fäden laufen bis zur nächsten Pause weiter. */
  async tick(): Promise<void> {
    this.world.tick++;
    const ws = this.waiters;
    this.waiters = [];
    ws.forEach((r) => r());
    await macrotask();
  }

  private frame(): Promise<void> {
    if (this.stopped) return Promise.reject(new StopSignal());
    return new Promise<void>((resolve, reject) => {
      this.waiters.push(() => (this.stopped ? reject(new StopSignal()) : resolve()));
    });
  }

  private async waitTicks(n: number) {
    const count = Math.max(1, Math.round(n));
    for (let i = 0; i < count; i++) await this.frame();
  }

  // ------------------------------------------------------------ Ausführung

  private async execChain(block: SBlock | undefined): Promise<void> {
    for (let b = block; b; b = b.next?.block) {
      if (this.stopped) throw new StopSignal();
      this.opts.onBlock?.(b.id);
      await this.exec(b);
      if (this.opts.slowTicks) await this.waitTicks(this.opts.slowTicks);
    }
  }

  private input(b: SBlock, name: string): unknown {
    const inp = b.inputs?.[name];
    const target = inp?.block ?? inp?.shadow;
    return target ? this.evaluate(target) : undefined;
  }

  private num(b: SBlock, name: string): number {
    return toNumber(this.input(b, name));
  }

  private bool(b: SBlock, name: string): boolean {
    return Boolean(this.input(b, name));
  }

  private varName(b: SBlock): string {
    const f = b.fields?.VAR;
    if (f && typeof f === "object" && "id" in f) {
      const id = (f as { id: string }).id;
      return this.varNames.get(id) ?? (f as { name?: string }).name ?? id;
    }
    return String(f ?? "");
  }

  private moveTo(x: number, y: number) {
    const s = this.world.sprite;
    // Funki bleibt immer ein Stück auf der Bühne sichtbar
    const nx = Math.max(-STAGE_W / 2 - 15, Math.min(STAGE_W / 2 + 15, x));
    const ny = Math.max(-STAGE_H / 2 - 15, Math.min(STAGE_H / 2 + 15, y));
    if (this.world.pen.down && (nx !== s.x || ny !== s.y)) {
      this.world.segments.push({ x1: s.x, y1: s.y, x2: nx, y2: ny, color: this.world.pen.color, size: this.world.pen.size });
    }
    s.x = nx;
    s.y = ny;
  }

  private radius(): number {
    return SPRITE_RADIUS * (this.world.sprite.size / 100);
  }

  private touchingEdge(): boolean {
    const { x, y } = this.world.sprite;
    const r = this.radius();
    return x + r >= STAGE_W / 2 || x - r <= -STAGE_W / 2 || y + r >= STAGE_H / 2 || y - r <= -STAGE_H / 2;
  }

  private randomPosition(margin: number): [number, number] {
    const x = Math.round((this.random() - 0.5) * (STAGE_W - 2 * margin));
    const y = Math.round((this.random() - 0.5) * (STAGE_H - 2 * margin));
    return [x, y];
  }

  private say(text: unknown) {
    const t = text === undefined || text === null ? "" : formatValue(text);
    this.world.sprite.say = t === "" ? null : t;
    if (t !== "") this.world.said.push(t);
  }

  private async exec(b: SBlock): Promise<void> {
    const w = this.world;
    const s = w.sprite;
    switch (b.type) {
      case "motion_move": {
        const steps = this.num(b, "STEPS");
        const rad = (s.direction * Math.PI) / 180;
        this.moveTo(s.x + steps * Math.sin(rad), s.y + steps * Math.cos(rad));
        return;
      }
      case "motion_turn_right": s.direction = normalizeDirection(s.direction + this.num(b, "DEGREES")); return;
      case "motion_turn_left": s.direction = normalizeDirection(s.direction - this.num(b, "DEGREES")); return;
      case "motion_goto": this.moveTo(this.num(b, "X"), this.num(b, "Y")); return;
      case "motion_goto_random": this.moveTo(...this.randomPosition(40)); return;
      case "motion_glide": {
        const secs = this.num(b, "SECS");
        const tx = this.num(b, "X");
        const ty = this.num(b, "Y");
        const sx = s.x;
        const sy = s.y;
        const total = Math.max(1, Math.round(secs * TICKS_PER_SECOND));
        for (let i = 1; i <= total; i++) {
          this.moveTo(sx + ((tx - sx) * i) / total, sy + ((ty - sy) * i) / total);
          await this.frame();
        }
        return;
      }
      case "motion_point": s.direction = normalizeDirection(this.num(b, "DIR")); return;
      case "motion_change_x": this.moveTo(s.x + this.num(b, "DX"), s.y); return;
      case "motion_set_x": this.moveTo(this.num(b, "X"), s.y); return;
      case "motion_change_y": this.moveTo(s.x, s.y + this.num(b, "DY")); return;
      case "motion_set_y": this.moveTo(s.x, this.num(b, "Y")); return;
      case "motion_bounce": {
        const r = this.radius();
        if (s.x + r > STAGE_W / 2) { s.direction = normalizeDirection(-s.direction); s.x = STAGE_W / 2 - r; }
        else if (s.x - r < -STAGE_W / 2) { s.direction = normalizeDirection(-s.direction); s.x = -STAGE_W / 2 + r; }
        if (s.y + r > STAGE_H / 2) { s.direction = normalizeDirection(180 - s.direction); s.y = STAGE_H / 2 - r; }
        else if (s.y - r < -STAGE_H / 2) { s.direction = normalizeDirection(180 - s.direction); s.y = -STAGE_H / 2 + r; }
        return;
      }

      case "looks_say_secs": {
        const text = this.input(b, "TEXT");
        this.say(text);
        const mine = s.say;
        await this.waitTicks(this.num(b, "SECS") * TICKS_PER_SECOND);
        if (s.say === mine) s.say = null;
        return;
      }
      case "looks_say": this.say(this.input(b, "TEXT")); return;
      case "looks_set_size": s.size = Math.max(10, Math.min(400, this.num(b, "SIZE"))); return;
      case "looks_change_size": s.size = Math.max(10, Math.min(400, s.size + this.num(b, "CHANGE"))); return;
      case "looks_color": s.color = String(b.fields?.COLOR ?? "orange"); return;
      case "looks_background": w.background = String(b.fields?.COLOR ?? "weiß"); return;
      case "looks_show": s.visible = true; return;
      case "looks_hide": s.visible = false; return;

      case "control_wait": await this.waitTicks(this.num(b, "SECS") * TICKS_PER_SECOND); return;
      case "control_repeat": {
        const times = Math.round(this.num(b, "TIMES"));
        for (let i = 0; i < times; i++) {
          await this.execChain(b.inputs?.DO?.block);
          await this.frame();
        }
        return;
      }
      case "control_forever":
        for (;;) {
          await this.execChain(b.inputs?.DO?.block);
          await this.frame();
        }
      case "control_if":
        if (this.bool(b, "COND")) await this.execChain(b.inputs?.DO?.block);
        return;
      case "control_if_else":
        await this.execChain(this.bool(b, "COND") ? b.inputs?.DO?.block : b.inputs?.ELSE?.block);
        return;
      case "control_repeat_until":
        while (!this.bool(b, "COND")) {
          await this.execChain(b.inputs?.DO?.block);
          await this.frame();
        }
        return;
      case "control_stop":
        this.stop();
        throw new StopSignal();

      case "star_random": {
        const [x, y] = this.randomPosition(50);
        w.star.x = x;
        w.star.y = y;
        return;
      }
      case "star_goto": w.star.x = this.num(b, "X"); w.star.y = this.num(b, "Y"); return;
      case "star_show": w.star.visible = true; return;
      case "star_hide": w.star.visible = false; return;

      case "data_set": {
        const v = this.input(b, "VALUE");
        w.variables[this.varName(b)] = isNumeric(v) ? toNumber(v) : String(v ?? "");
        return;
      }
      case "data_change": {
        const name = this.varName(b);
        w.variables[name] = toNumber(w.variables[name]) + this.num(b, "VALUE");
        return;
      }

      case "pen_down":
        w.pen.down = true;
        w.segments.push({ x1: s.x, y1: s.y, x2: s.x, y2: s.y, color: w.pen.color, size: w.pen.size });
        return;
      case "pen_up": w.pen.down = false; return;
      case "pen_color": w.pen.color = String(b.fields?.COLOR ?? "blau"); return;
      case "pen_size": w.pen.size = Math.max(1, Math.min(60, this.num(b, "SIZE"))); return;
      case "pen_clear": w.segments = []; return;

      default:
        if (!BLOCK_BY_TYPE[b.type]) this.warnings.push(`Unbekannter Block: ${b.type}`);
    }
  }

  /** Berechnet Wert-Blöcke (Zahlen, Texte, Bedingungen) */
  evaluate(b: SBlock): unknown {
    const s = this.world.sprite;
    switch (b.type) {
      case "math_number": return toNumber(b.fields?.NUM);
      case "text": return String(b.fields?.TEXT ?? "");
      case "motion_x": return Math.round(s.x * 100) / 100;
      case "motion_y": return Math.round(s.y * 100) / 100;
      case "motion_direction": return s.direction;
      case "sensing_touching_edge": return this.touchingEdge();
      case "sensing_touching_star": {
        const st = this.world.star;
        return st.visible && s.visible && Math.hypot(st.x - s.x, st.y - s.y) <= this.radius() + STAR_RADIUS;
      }
      case "sensing_key": return this.keysDown.has(String(b.fields?.KEY));
      case "sensing_timer": return Math.round((this.world.tick / TICKS_PER_SECOND) * 10) / 10;
      case "op_add": return this.num(b, "A") + this.num(b, "B");
      case "op_sub": return this.num(b, "A") - this.num(b, "B");
      case "op_mul": return this.num(b, "A") * this.num(b, "B");
      case "op_div": return this.num(b, "A") / this.num(b, "B");
      case "op_mod": {
        const a = this.num(b, "A");
        const m = this.num(b, "B");
        return m === 0 ? 0 : ((a % m) + m) % m;
      }
      case "op_random": {
        const from = this.num(b, "FROM");
        const to = this.num(b, "TO");
        const lo = Math.min(from, to);
        const hi = Math.max(from, to);
        if (Number.isInteger(lo) && Number.isInteger(hi)) return lo + Math.floor(this.random() * (hi - lo + 1));
        return lo + this.random() * (hi - lo);
      }
      case "op_lt": return compare(this.input(b, "A"), this.input(b, "B")) < 0;
      case "op_gt": return compare(this.input(b, "A"), this.input(b, "B")) > 0;
      case "op_eq": return compare(this.input(b, "A"), this.input(b, "B")) === 0;
      case "op_and": return this.bool(b, "A") && this.bool(b, "B");
      case "op_or": return this.bool(b, "A") || this.bool(b, "B");
      case "op_not": return !this.bool(b, "A");
      case "op_join": return formatValue(this.input(b, "A") ?? "") + formatValue(this.input(b, "B") ?? "");
      case "data_get": return this.world.variables[this.varName(b)] ?? 0;
      default: return 0;
    }
  }
}

export function colorValue(name: string): string {
  return COLOR_VALUES[name] ?? name;
}

export function backgroundValue(name: string): string {
  return BACKGROUND_VALUES[name] ?? name;
}
