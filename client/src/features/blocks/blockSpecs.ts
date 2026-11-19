/**
 * Alle Blöcke des Block-Editors an einer Stelle.
 *
 * Aus diesen Beschreibungen entstehen:
 *  - die Blockly-Definitionen (Aussehen im Editor),
 *  - die Werkzeugkiste (Toolbox),
 *  - die Block-Schreibweise für Inhalte (DSL, siehe dsl.ts),
 *  - die Python-Übersetzung (pythonGen.ts).
 *
 * Diese Datei hängt NICHT von Blockly ab und kann daher auch in Tests laufen.
 */

export type CategoryId = "events" | "motion" | "looks" | "pen" | "control" | "sensing" | "star" | "operators" | "variables";

export interface Category {
  id: CategoryId;
  name: string;
  colour: string;
}

export const CATEGORIES: Category[] = [
  { id: "events", name: "Ereignisse", colour: "#ffc93c" },
  { id: "motion", name: "Bewegung", colour: "#5b9bff" },
  { id: "looks", name: "Aussehen", colour: "#a98bff" },
  { id: "control", name: "Steuerung", colour: "#ffa630" },
  { id: "sensing", name: "Fühlen", colour: "#4cc3ea" },
  { id: "operators", name: "Operatoren", colour: "#5ccf6b" },
  { id: "variables", name: "Variablen", colour: "#ff7d4d" },
  { id: "pen", name: "Malstift", colour: "#34d1c2" },
  { id: "star", name: "Stern", colour: "#f76b92" },
];

export type ArgSpec =
  | { kind: "number"; name: string; default: number }
  | { kind: "text"; name: string; default: string }
  | { kind: "boolean"; name: string }
  | { kind: "dropdown"; name: string; options: [string, string][] }
  | { kind: "variable"; name: string }
  | { kind: "statement"; name: string };

/** statement = normaler Block, hat = Startblock, cap = nichts darf folgen, reporter/boolean = Wert-Blöcke */
export type Shape = "statement" | "hat" | "cap" | "reporter" | "boolean";

export interface BlockSpec {
  type: string;
  category: CategoryId;
  /** Schlüsselwort in der Block-Schreibweise (DSL) */
  dsl: string;
  /** Beschriftung: Wörter und Eingaben in Reihenfolge */
  parts: (string | ArgSpec)[];
  shape: Shape;
  tooltip: string;
}

// Kurzschreibweisen für Eingaben
const N = (name: string, def = 0): ArgSpec => ({ kind: "number", name, default: def });
const T = (name: string, def = ""): ArgSpec => ({ kind: "text", name, default: def });
const B = (name: string): ArgSpec => ({ kind: "boolean", name });
const D = (name: string, options: [string, string][]): ArgSpec => ({ kind: "dropdown", name, options });
const V = (name: string): ArgSpec => ({ kind: "variable", name });
const S = (name: string): ArgSpec => ({ kind: "statement", name });

/** Farben für Funki, den Malstift und den Hintergrund */
export const COLORS: [string, string][] = [
  ["🟠 orange", "orange"], ["🔴 rot", "rot"], ["🔵 blau", "blau"], ["🟢 grün", "grün"], ["🟡 gelb", "gelb"],
  ["🟣 lila", "lila"], ["🩷 pink", "pink"], ["⚫ schwarz", "schwarz"], ["⚪ weiß", "weiß"], ["🩵 türkis", "türkis"],
];

export const COLOR_VALUES: Record<string, string> = {
  orange: "#ff6b35", rot: "#e5383b", blau: "#3a7bff", grün: "#2fb344", gelb: "#ffc93c", lila: "#8b5cf6",
  pink: "#ff5fa2", schwarz: "#1d1b3a", weiß: "#ffffff", türkis: "#14b8a6",
};

/** Hintergründe der Bühne (eigene, hellere Töne) */
export const BACKGROUND_VALUES: Record<string, string> = {
  orange: "#ffe3cc", rot: "#ffd6d6", blau: "#d8e6ff", grün: "#d7f5dc", gelb: "#fff3c4", lila: "#e8ddff",
  pink: "#ffdcec", schwarz: "#1d1b3a", weiß: "#ffffff", türkis: "#cdf5ef",
};

const LETTERS: [string, string][] = "abcdefghijklmnopqrstuvwxyz".split("").map((c) => [c, c]);
export const KEYS: [string, string][] = [
  ["Leertaste", "leertaste"], ["Pfeil nach oben", "oben"], ["Pfeil nach unten", "unten"],
  ["Pfeil nach links", "links"], ["Pfeil nach rechts", "rechts"], ...LETTERS,
];

/** Übersetzt KeyboardEvent.key in den Wert aus KEYS */
export function keyFromEvent(key: string): string | null {
  const map: Record<string, string> = { " ": "leertaste", ArrowUp: "oben", ArrowDown: "unten", ArrowLeft: "links", ArrowRight: "rechts" };
  if (map[key]) return map[key];
  if (/^[a-zA-Z]$/.test(key)) return key.toLowerCase();
  return null;
}

export const BLOCKS: BlockSpec[] = [
  // ---------------------------------------------------------- Ereignisse
  { type: "event_flag", category: "events", dsl: "wenn_start", parts: ["Wenn ▶ angeklickt"], shape: "hat",
    tooltip: "Startet das Programm darunter, wenn du auf ▶ Start klickst." },
  { type: "event_key", category: "events", dsl: "wenn_taste", parts: ["Wenn Taste", D("KEY", KEYS), "gedrückt"], shape: "hat",
    tooltip: "Startet das Programm darunter, wenn die Taste gedrückt wird." },
  { type: "event_click", category: "events", dsl: "wenn_angeklickt", parts: ["Wenn Funki angeklickt"], shape: "hat",
    tooltip: "Startet das Programm darunter, wenn jemand auf Funki klickt." },

  // ------------------------------------------------------------ Bewegung
  { type: "motion_move", category: "motion", dsl: "gehe", parts: ["gehe", N("STEPS", 10), "Schritte"], shape: "statement",
    tooltip: "Funki geht in die Richtung, in die er schaut." },
  { type: "motion_turn_right", category: "motion", dsl: "drehe_rechts", parts: ["drehe dich ↻ um", N("DEGREES", 15), "Grad"], shape: "statement",
    tooltip: "Dreht Funki im Uhrzeigersinn." },
  { type: "motion_turn_left", category: "motion", dsl: "drehe_links", parts: ["drehe dich ↺ um", N("DEGREES", 15), "Grad"], shape: "statement",
    tooltip: "Dreht Funki gegen den Uhrzeigersinn." },
  { type: "motion_goto", category: "motion", dsl: "gehe_zu", parts: ["gehe zu x:", N("X", 0), "y:", N("Y", 0)], shape: "statement",
    tooltip: "Setzt Funki an eine Stelle. Die Mitte der Bühne ist x: 0 y: 0." },
  { type: "motion_goto_random", category: "motion", dsl: "gehe_zufall", parts: ["gehe zu zufälliger Position"], shape: "statement",
    tooltip: "Funki springt an eine zufällige Stelle." },
  { type: "motion_glide", category: "motion", dsl: "gleite", parts: ["gleite in", N("SECS", 1), "Sek. zu x:", N("X", 0), "y:", N("Y", 0)], shape: "statement",
    tooltip: "Funki gleitet langsam zu einer Stelle." },
  { type: "motion_point", category: "motion", dsl: "richtung", parts: ["setze Richtung auf", N("DIR", 90), "Grad"], shape: "statement",
    tooltip: "90 = rechts, 0 = oben, -90 = links, 180 = unten" },
  { type: "motion_change_x", category: "motion", dsl: "ändere_x", parts: ["ändere x um", N("DX", 10)], shape: "statement",
    tooltip: "Bewegt Funki nach rechts (oder mit minus nach links)." },
  { type: "motion_set_x", category: "motion", dsl: "setze_x", parts: ["setze x auf", N("X", 0)], shape: "statement", tooltip: "Setzt die x-Position." },
  { type: "motion_change_y", category: "motion", dsl: "ändere_y", parts: ["ändere y um", N("DY", 10)], shape: "statement",
    tooltip: "Bewegt Funki nach oben (oder mit minus nach unten)." },
  { type: "motion_set_y", category: "motion", dsl: "setze_y", parts: ["setze y auf", N("Y", 0)], shape: "statement", tooltip: "Setzt die y-Position." },
  { type: "motion_bounce", category: "motion", dsl: "pralle_ab", parts: ["pralle vom Rand ab"], shape: "statement",
    tooltip: "Wenn Funki den Rand berührt, dreht er um." },
  { type: "motion_x", category: "motion", dsl: "x", parts: ["x-Position"], shape: "reporter", tooltip: "Wo Funki gerade waagerecht steht." },
  { type: "motion_y", category: "motion", dsl: "y", parts: ["y-Position"], shape: "reporter", tooltip: "Wo Funki gerade senkrecht steht." },
  { type: "motion_direction", category: "motion", dsl: "richtung?", parts: ["Richtung"], shape: "reporter", tooltip: "In welche Richtung Funki schaut." },

  // ------------------------------------------------------------ Aussehen
  { type: "looks_say_secs", category: "looks", dsl: "sage_für", parts: ["sage", T("TEXT", "Hallo!"), "für", N("SECS", 2), "Sekunden"], shape: "statement",
    tooltip: "Zeigt eine Sprechblase und wartet." },
  { type: "looks_say", category: "looks", dsl: "sage", parts: ["sage", T("TEXT", "Hallo!")], shape: "statement",
    tooltip: "Zeigt eine Sprechblase (bis Funki etwas anderes sagt)." },
  { type: "looks_set_size", category: "looks", dsl: "größe", parts: ["setze Größe auf", N("SIZE", 100), "%"], shape: "statement",
    tooltip: "100 % ist die normale Größe." },
  { type: "looks_change_size", category: "looks", dsl: "ändere_größe", parts: ["ändere Größe um", N("CHANGE", 10)], shape: "statement",
    tooltip: "Macht Funki größer (oder mit minus kleiner)." },
  { type: "looks_color", category: "looks", dsl: "farbe", parts: ["setze Farbe auf", D("COLOR", COLORS)], shape: "statement",
    tooltip: "Ändert Funkis Farbe." },
  { type: "looks_background", category: "looks", dsl: "hintergrund", parts: ["setze Hintergrund auf", D("COLOR", COLORS)], shape: "statement",
    tooltip: "Ändert die Farbe der Bühne." },
  { type: "looks_show", category: "looks", dsl: "zeige_dich", parts: ["zeige dich"], shape: "statement", tooltip: "Macht Funki sichtbar." },
  { type: "looks_hide", category: "looks", dsl: "verstecke_dich", parts: ["verstecke dich"], shape: "statement", tooltip: "Macht Funki unsichtbar." },

  // ----------------------------------------------------------- Steuerung
  { type: "control_wait", category: "control", dsl: "warte", parts: ["warte", N("SECS", 1), "Sekunden"], shape: "statement",
    tooltip: "Macht eine Pause." },
  { type: "control_repeat", category: "control", dsl: "wiederhole", parts: ["wiederhole", N("TIMES", 10), "mal", S("DO")], shape: "statement",
    tooltip: "Führt die Blöcke darin mehrmals aus." },
  { type: "control_forever", category: "control", dsl: "wiederhole_immer", parts: ["wiederhole fortlaufend", S("DO")], shape: "cap",
    tooltip: "Führt die Blöcke darin immer wieder aus – bis du Stopp drückst." },
  { type: "control_if", category: "control", dsl: "falls", parts: ["falls", B("COND"), "dann", S("DO")], shape: "statement",
    tooltip: "Führt die Blöcke nur aus, wenn die Bedingung stimmt." },
  { type: "control_if_else", category: "control", dsl: "falls_sonst", parts: ["falls", B("COND"), "dann", S("DO"), "sonst", S("ELSE")], shape: "statement",
    tooltip: "Wenn die Bedingung stimmt, die oberen Blöcke – sonst die unteren." },
  { type: "control_repeat_until", category: "control", dsl: "wiederhole_bis", parts: ["wiederhole bis", B("COND"), S("DO")], shape: "statement",
    tooltip: "Wiederholt die Blöcke, bis die Bedingung stimmt." },
  { type: "control_stop", category: "control", dsl: "stoppe", parts: ["stoppe alles"], shape: "cap", tooltip: "Beendet das ganze Programm." },

  // --------------------------------------------------------------- Fühlen
  { type: "sensing_touching_edge", category: "sensing", dsl: "berührt_rand", parts: ["wird Rand berührt?"], shape: "boolean",
    tooltip: "Stimmt, wenn Funki den Rand der Bühne berührt." },
  { type: "sensing_touching_star", category: "sensing", dsl: "berührt_stern", parts: ["wird Stern berührt?"], shape: "boolean",
    tooltip: "Stimmt, wenn Funki den Stern berührt." },
  { type: "sensing_key", category: "sensing", dsl: "taste", parts: ["Taste", D("KEY", KEYS), "gedrückt?"], shape: "boolean",
    tooltip: "Stimmt, solange die Taste gedrückt ist." },
  { type: "sensing_timer", category: "sensing", dsl: "stoppuhr", parts: ["Stoppuhr"], shape: "reporter",
    tooltip: "Sekunden seit dem Start." },

  // ---------------------------------------------------------------- Stern
  { type: "star_random", category: "star", dsl: "stern_zufall", parts: ["setze Stern an zufällige Position"], shape: "statement",
    tooltip: "Der Stern springt an eine neue, zufällige Stelle." },
  { type: "star_goto", category: "star", dsl: "stern_zu", parts: ["setze Stern auf x:", N("X", 100), "y:", N("Y", 0)], shape: "statement",
    tooltip: "Setzt den Stern an eine Stelle." },
  { type: "star_show", category: "star", dsl: "stern_zeigen", parts: ["zeige Stern"], shape: "statement", tooltip: "Macht den Stern sichtbar." },
  { type: "star_hide", category: "star", dsl: "stern_verstecken", parts: ["verstecke Stern"], shape: "statement", tooltip: "Versteckt den Stern." },

  // ----------------------------------------------------------- Operatoren
  { type: "op_add", category: "operators", dsl: "+", parts: [N("A", 0), "+", N("B", 0)], shape: "reporter", tooltip: "Addieren" },
  { type: "op_sub", category: "operators", dsl: "-", parts: [N("A", 0), "−", N("B", 0)], shape: "reporter", tooltip: "Subtrahieren" },
  { type: "op_mul", category: "operators", dsl: "*", parts: [N("A", 0), "×", N("B", 0)], shape: "reporter", tooltip: "Multiplizieren" },
  { type: "op_div", category: "operators", dsl: "/", parts: [N("A", 0), "÷", N("B", 1)], shape: "reporter", tooltip: "Dividieren" },
  { type: "op_random", category: "operators", dsl: "zufall", parts: ["Zufallszahl von", N("FROM", 1), "bis", N("TO", 10)], shape: "reporter",
    tooltip: "Eine zufällige Zahl zwischen den beiden Werten." },
  { type: "op_lt", category: "operators", dsl: "<", parts: [N("A", 0), "<", N("B", 50)], shape: "boolean", tooltip: "Ist der linke Wert kleiner?" },
  { type: "op_eq", category: "operators", dsl: "=", parts: [N("A", 0), "=", N("B", 50)], shape: "boolean", tooltip: "Sind beide Werte gleich?" },
  { type: "op_gt", category: "operators", dsl: ">", parts: [N("A", 0), ">", N("B", 50)], shape: "boolean", tooltip: "Ist der linke Wert größer?" },
  { type: "op_and", category: "operators", dsl: "und", parts: [B("A"), "und", B("B")], shape: "boolean", tooltip: "Stimmt, wenn beide stimmen." },
  { type: "op_or", category: "operators", dsl: "oder", parts: [B("A"), "oder", B("B")], shape: "boolean", tooltip: "Stimmt, wenn mindestens eins stimmt." },
  { type: "op_not", category: "operators", dsl: "nicht", parts: ["nicht", B("A")], shape: "boolean", tooltip: "Dreht wahr und falsch um." },
  { type: "op_join", category: "operators", dsl: "verbinde", parts: ["verbinde", T("A", "Hallo "), "und", T("B", "Welt")], shape: "reporter",
    tooltip: "Hängt zwei Texte aneinander." },
  { type: "op_mod", category: "operators", dsl: "rest", parts: [N("A", 10), "Rest von ÷", N("B", 3)], shape: "reporter",
    tooltip: "Der Rest beim Teilen (z. B. 10 Rest von ÷ 3 = 1)." },

  // ------------------------------------------------------------ Variablen
  { type: "data_set", category: "variables", dsl: "setze", parts: ["setze", V("VAR"), "auf", T("VALUE", "0")], shape: "statement",
    tooltip: "Speichert einen Wert in der Variable." },
  { type: "data_change", category: "variables", dsl: "ändere", parts: ["ändere", V("VAR"), "um", N("VALUE", 1)], shape: "statement",
    tooltip: "Erhöht die Variable (oder verringert sie mit minus)." },
  { type: "data_get", category: "variables", dsl: "var", parts: [V("VAR")], shape: "reporter", tooltip: "Der Wert der Variable." },

  // ------------------------------------------------------------ Malstift
  { type: "pen_down", category: "pen", dsl: "stift_runter", parts: ["Stift runter"], shape: "statement", tooltip: "Ab jetzt malt Funki, wenn er sich bewegt." },
  { type: "pen_up", category: "pen", dsl: "stift_hoch", parts: ["Stift hoch"], shape: "statement", tooltip: "Funki hört auf zu malen." },
  { type: "pen_color", category: "pen", dsl: "stiftfarbe", parts: ["setze Stiftfarbe auf", D("COLOR", COLORS)], shape: "statement", tooltip: "Ändert die Stiftfarbe." },
  { type: "pen_size", category: "pen", dsl: "stiftdicke", parts: ["setze Stiftdicke auf", N("SIZE", 4)], shape: "statement", tooltip: "Wie dick der Stift malt." },
  { type: "pen_clear", category: "pen", dsl: "lösche_alles", parts: ["lösche alles"], shape: "statement", tooltip: "Wischt alle Zeichnungen weg." },
];

export const BLOCK_BY_TYPE: Record<string, BlockSpec> = Object.fromEntries(BLOCKS.map((b) => [b.type, b]));
export const BLOCK_BY_DSL: Record<string, BlockSpec> = Object.fromEntries(BLOCKS.map((b) => [b.dsl, b]));

export function argsOf(spec: BlockSpec): ArgSpec[] {
  return spec.parts.filter((p): p is ArgSpec => typeof p !== "string");
}

export function categoryOf(type: string): Category | undefined {
  const spec = BLOCK_BY_TYPE[type];
  return spec ? CATEGORIES.find((c) => c.id === spec.category) : undefined;
}

// ----------------------------------------------- Serialisierungs-Format ----
// Das ist das JSON-Format von Blockly (Blockly.serialization.workspaces.save).

export interface SBlock {
  type: string;
  id?: string;
  x?: number;
  y?: number;
  fields?: Record<string, unknown>;
  inputs?: Record<string, { block?: SBlock; shadow?: SBlock }>;
  next?: { block?: SBlock };
  /** Blockly speichert auch weitere Felder – die ignorieren wir */
  [key: string]: unknown;
}

export interface SWorkspace {
  blocks?: { languageVersion?: number; blocks: SBlock[] };
  variables?: { name: string; id: string }[];
}
