/**
 * Übersetzt Block-Programme in Python-Text.
 *
 * Wird im Block-Editor neben den Blöcken angezeigt ("So sieht das als Python
 * aus") und ist die Grundlage für Stufe 2 (Übergang Blöcke → Text).
 * Die Funktionsnamen entsprechen den deutschen Blöcken, damit man jede
 * Zeile einem Block zuordnen kann.
 */
import { BLOCK_BY_TYPE, type SBlock, type SWorkspace } from "./blockSpecs";

const IND = "    ";

interface Ctx {
  vars: Map<string, string>;
  loopDepth: number;
  usesRandom: boolean;
}

/** Variablen-Namen in gültige Python-Namen umwandeln */
export function pyName(name: string): string {
  let n = name.trim().replace(/\s+/g, "_").replace(/[^\p{L}\p{N}_]/gu, "");
  if (!n || /^\d/.test(n)) n = `v_${n}`;
  const keywords = ["and", "or", "not", "if", "else", "for", "while", "in", "def", "return", "True", "False", "None", "class", "import", "from", "pass", "break", "continue"];
  return keywords.includes(n) ? `${n}_` : n;
}

function str(s: unknown): string {
  return JSON.stringify(String(s ?? ""));
}

function value(b: SBlock | undefined, ctx: Ctx, numeric = false): string {
  if (!b) return numeric ? "0" : '""';
  const v = (name: string, num = true) => value(b.inputs?.[name]?.block ?? b.inputs?.[name]?.shadow, ctx, num);
  switch (b.type) {
    case "math_number": return String(b.fields?.NUM ?? 0);
    case "text": {
      const t = String(b.fields?.TEXT ?? "");
      return numeric && t.trim() !== "" && !Number.isNaN(Number(t)) ? t : str(t);
    }
    case "motion_x": return "x_position()";
    case "motion_y": return "y_position()";
    case "motion_direction": return "richtung()";
    case "sensing_touching_edge": return "berührt_rand()";
    case "sensing_touching_star": return "berührt_stern()";
    case "sensing_key": return `taste_gedrückt(${str(b.fields?.KEY)})`;
    case "sensing_timer": return "stoppuhr()";
    case "op_add": return `${v("A")} + ${v("B")}`;
    case "op_sub": return `${v("A")} - ${v("B")}`;
    case "op_mul": return `${wrap(v("A"))} * ${wrap(v("B"))}`;
    case "op_div": return `${wrap(v("A"))} / ${wrap(v("B"))}`;
    case "op_mod": return `${wrap(v("A"))} % ${wrap(v("B"))}`;
    case "op_random": ctx.usesRandom = true; return `random.randint(${v("FROM")}, ${v("TO")})`;
    case "op_lt": return `${v("A")} < ${v("B")}`;
    case "op_gt": return `${v("A")} > ${v("B")}`;
    case "op_eq": return `${v("A")} == ${v("B")}`;
    case "op_and": return `${wrap(v("A"))} and ${wrap(v("B"))}`;
    case "op_or": return `${wrap(v("A"))} or ${wrap(v("B"))}`;
    case "op_not": return `not ${wrap(v("A"))}`;
    case "op_join": return `str(${v("A", false)}) + str(${v("B", false)})`;
    case "data_get": return varOf(b, ctx);
    default: return "None";
  }
}

function wrap(expr: string): string {
  return /^[\w."()[\]äöüÄÖÜß-]+$/.test(expr) && !expr.includes(" ") ? expr : `(${expr})`;
}

function varOf(b: SBlock, ctx: Ctx): string {
  const f = b.fields?.VAR;
  const id = f && typeof f === "object" && "id" in f ? (f as { id: string }).id : String(f);
  return pyName(ctx.vars.get(id) ?? id);
}

function statements(b: SBlock | undefined, ctx: Ctx, depth: number): string[] {
  const lines: string[] = [];
  const pad = IND.repeat(depth);
  for (let cur = b; cur; cur = cur.next?.block) {
    const v = (name: string, num = true) => value(cur!.inputs?.[name]?.block ?? cur!.inputs?.[name]?.shadow, ctx, num);
    const body = (name: string) => {
      const inner = statements(cur!.inputs?.[name]?.block, ctx, depth + 1);
      return inner.length ? inner : [`${pad}${IND}pass`];
    };
    const loopVar = () => ["i", "j", "k", "n", "m"][ctx.loopDepth] ?? `i${ctx.loopDepth}`;
    switch (cur.type) {
      case "motion_move": lines.push(`${pad}gehe(${v("STEPS")})`); break;
      case "motion_turn_right": lines.push(`${pad}drehe_rechts(${v("DEGREES")})`); break;
      case "motion_turn_left": lines.push(`${pad}drehe_links(${v("DEGREES")})`); break;
      case "motion_goto": lines.push(`${pad}gehe_zu(${v("X")}, ${v("Y")})`); break;
      case "motion_goto_random": lines.push(`${pad}gehe_zu_zufall()`); break;
      case "motion_glide": lines.push(`${pad}gleite(${v("SECS")}, ${v("X")}, ${v("Y")})`); break;
      case "motion_point": lines.push(`${pad}setze_richtung(${v("DIR")})`); break;
      case "motion_change_x": lines.push(`${pad}ändere_x(${v("DX")})`); break;
      case "motion_set_x": lines.push(`${pad}setze_x(${v("X")})`); break;
      case "motion_change_y": lines.push(`${pad}ändere_y(${v("DY")})`); break;
      case "motion_set_y": lines.push(`${pad}setze_y(${v("Y")})`); break;
      case "motion_bounce": lines.push(`${pad}pralle_vom_rand_ab()`); break;
      case "looks_say_secs": lines.push(`${pad}sage(${v("TEXT", false)}, ${v("SECS")})`); break;
      case "looks_say": lines.push(`${pad}sage(${v("TEXT", false)})`); break;
      case "looks_set_size": lines.push(`${pad}setze_größe(${v("SIZE")})`); break;
      case "looks_change_size": lines.push(`${pad}ändere_größe(${v("CHANGE")})`); break;
      case "looks_color": lines.push(`${pad}setze_farbe(${str(cur.fields?.COLOR)})`); break;
      case "looks_background": lines.push(`${pad}setze_hintergrund(${str(cur.fields?.COLOR)})`); break;
      case "looks_show": lines.push(`${pad}zeige_dich()`); break;
      case "looks_hide": lines.push(`${pad}verstecke_dich()`); break;
      case "control_wait": lines.push(`${pad}warte(${v("SECS")})`); break;
      case "control_repeat": {
        const lv = loopVar();
        ctx.loopDepth++;
        lines.push(`${pad}for ${lv} in range(${v("TIMES")}):`, ...body("DO"));
        ctx.loopDepth--;
        break;
      }
      case "control_forever": lines.push(`${pad}while True:`, ...body("DO")); break;
      case "control_if": lines.push(`${pad}if ${v("COND")}:`, ...body("DO")); break;
      case "control_if_else": lines.push(`${pad}if ${v("COND")}:`, ...body("DO"), `${pad}else:`, ...body("ELSE")); break;
      case "control_repeat_until": lines.push(`${pad}while not (${v("COND")}):`, ...body("DO")); break;
      case "control_stop": lines.push(`${pad}stoppe_alles()`); break;
      case "star_random": lines.push(`${pad}stern_zufällig()`); break;
      case "star_goto": lines.push(`${pad}stern_gehe_zu(${v("X")}, ${v("Y")})`); break;
      case "star_show": lines.push(`${pad}zeige_stern()`); break;
      case "star_hide": lines.push(`${pad}verstecke_stern()`); break;
      case "data_set": lines.push(`${pad}${varOf(cur, ctx)} = ${v("VALUE")}`); break;
      case "data_change": lines.push(`${pad}${varOf(cur, ctx)} += ${v("VALUE")}`); break;
      case "pen_down": lines.push(`${pad}stift_runter()`); break;
      case "pen_up": lines.push(`${pad}stift_hoch()`); break;
      case "pen_color": lines.push(`${pad}setze_stiftfarbe(${str(cur.fields?.COLOR)})`); break;
      case "pen_size": lines.push(`${pad}setze_stiftdicke(${v("SIZE")})`); break;
      case "pen_clear": lines.push(`${pad}lösche_alles()`); break;
      default: lines.push(`${pad}# (Block ${cur.type})`);
    }
  }
  return lines;
}

/** Wandelt das ganze Block-Programm in Python-Text um */
export function toPython(ws: SWorkspace): string {
  const ctx: Ctx = { vars: new Map((ws.variables ?? []).map((v) => [v.id, v.name])), loopDepth: 0, usesRandom: false };
  const out: string[] = [];
  const handlers: string[] = [];

  for (const top of ws.blocks?.blocks ?? []) {
    const shape = BLOCK_BY_TYPE[top.type]?.shape;
    if (top.type === "event_flag") {
      out.push("# Wenn ▶ angeklickt:", ...statements(top.next?.block, ctx, 0), "");
    } else if (top.type === "event_key") {
      const key = String(top.fields?.KEY ?? "leertaste");
      const inner = statements(top.next?.block, ctx, 1);
      handlers.push(`# Wenn Taste „${key}“ gedrückt:`, `def bei_taste_${pyName(key)}():`, ...(inner.length ? inner : [`${IND}pass`]), "");
    } else if (top.type === "event_click") {
      const inner = statements(top.next?.block, ctx, 1);
      handlers.push("# Wenn Funki angeklickt:", "def bei_klick():", ...(inner.length ? inner : [`${IND}pass`]), "");
    } else if (shape !== "reporter" && shape !== "boolean") {
      out.push("# (Diese Blöcke hängen an keinem Startblock)", ...statements(top, ctx, 0).map((l) => `# ${l}`), "");
    }
  }
  const header = ["from funki import *", ...(ctx.usesRandom ? ["import random"] : []), ""];
  const body = [...handlers, ...out];
  if (body.length === 0) body.push("# Zieh Blöcke auf die Fläche – hier erscheint dann Python!");
  return [...header, ...body].join("\n").trimEnd() + "\n";
}
