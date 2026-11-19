/**
 * Prüft Python-Aufgaben: führt das Programm (ggf. mit Eingaben) aus und
 * vergleicht Ausgabe, Tests und Quelltext mit den Vorgaben der Aufgabe.
 * Die eigentliche Ausführung wird übergeben (Worker im Browser, Pyodide in Tests).
 */
import type { CodeCheck } from "../../../content/types";
import { text } from "../../../content/text";
import { explainError } from "./errorHelp";
import type { CheckGroup, CheckGroupResult } from "./pySetup";

export interface CheckOutcome {
  ok: boolean;
  title: string;
  message: string;
  line?: number;
  /** Erwartete und tatsächliche Ausgabe zum Vergleichen */
  expected?: string;
  actual?: string;
  /** Lief das Programm mit einem Fehler? (für das Abzeichen "Fehlerjäger") */
  hadError?: boolean;
}

export type RunGroups = (code: string, groups: CheckGroup[]) => Promise<CheckGroupResult[]>;

/** Entfernt #-Kommentare (aber nicht # in Texten) */
export function stripPythonComments(code: string): string {
  let out = "";
  let quote: string | null = null;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (quote) {
      out += c;
      if (c === "\\") { out += code[++i] ?? ""; continue; }
      if (code.startsWith(quote, i)) { out += quote.slice(1); i += quote.length - 1; quote = null; }
      continue;
    }
    if (c === "#") {
      while (i < code.length && code[i] !== "\n") i++;
      out += "\n";
      continue;
    }
    if (c === '"' || c === "'") {
      quote = code.startsWith(c.repeat(3), i) ? c.repeat(3) : c;
      out += quote;
      i += quote.length - 1;
      continue;
    }
    out += c;
  }
  return out;
}

export function normalizeOutput(s: string): string {
  return s.replace(/\r\n/g, "\n").split("\n").map((l) => l.trimEnd()).join("\n").replace(/^\n+|\n+$/g, "");
}

/** Gibt einen Tipp, wenn die Ausgabe *fast* stimmt */
export function outputHint(actual: string, expected: string): string {
  const a = normalizeOutput(actual);
  const e = normalizeOutput(expected);
  if (!a) return "Dein Programm gibt noch nichts aus. Hast du `print()` benutzt?";
  if (a.toLowerCase() === e.toLowerCase() || a.toLowerCase().includes(e.toLowerCase())) return "Fast! Achte auf Groß- und Kleinschreibung.";
  const noSpace = (s: string) => s.replace(/\s+/g, "");
  if (noSpace(a) === noSpace(e) || noSpace(a).includes(noSpace(e))) return "Fast! Achte auf die Leerzeichen.";
  const noPunct = (s: string) => s.replace(/[!.,?:;"']/g, "").toLowerCase();
  if (noPunct(a) === noPunct(e) || noPunct(a).includes(noPunct(e))) return "Fast! Achte auf Satzzeichen wie ! . , oder ?";
  return "Die Ausgabe stimmt noch nicht. Vergleiche sie mit der erwarteten Ausgabe.";
}

function outputMatches(actual: string, expected: string, mode: "exact" | "contains" | "regex", ignoreCase?: boolean): boolean {
  // Regex arbeitet zeilenweise: ^ und $ passen auf Zeilenanfang/-ende
  if (mode === "regex") return new RegExp(expected, ignoreCase ? "mi" : "m").test(actual);
  let a = normalizeOutput(actual);
  let e = normalizeOutput(expected);
  if (ignoreCase) { a = a.toLowerCase(); e = e.toLowerCase(); }
  return mode === "contains" ? a.includes(e) : a === e;
}

const PRAISE = ["Super gemacht!", "Klasse!", "Stark – genau so!", "Richtig! Funki ist begeistert.", "Perfekt gelöst!", "Wow, das sitzt!"];

export function praise(): string {
  return PRAISE[Math.floor(Math.random() * PRAISE.length)];
}

export async function checkCodeTask(code: string, checks: CodeCheck[], runGroups: RunGroups): Promise<CheckOutcome> {
  if (!code.trim()) return { ok: false, title: "Noch leer", message: "Schreib zuerst ein bisschen Code in den Editor." };

  // Programmläufe nach Eingaben bündeln – jede Eingabe-Kombination wird nur einmal ausgeführt.
  const groups: CheckGroup[] = [];
  const groupIndex = new Map<string, number>();
  const groupFor = (inputs: string[] = []) => {
    const key = JSON.stringify(inputs);
    if (!groupIndex.has(key)) {
      groupIndex.set(key, groups.length);
      groups.push({ inputs, tests: [] });
    }
    return groupIndex.get(key)!;
  };
  groupFor([]);
  const testRef = new Map<CodeCheck, { group: number; test: number }>();
  for (const c of checks) {
    if (c.type === "output" || c.type === "noError") groupFor(c.inputs);
    if (c.type === "assert") {
      const g = groupFor(c.inputs);
      groups[g].tests!.push(text(c.code));
      testRef.set(c, { group: g, test: groups[g].tests!.length - 1 });
    }
  }
  // Die Standard-Gruppe ohne Eingaben nur behalten, wenn sie gebraucht wird oder es keine andere gibt
  const results = await runGroups(code, groups);
  if (results.length !== groups.length) {
    return { ok: false, title: "Hoppla", message: "Python konnte dein Programm gerade nicht prüfen. Versuch es gleich noch einmal." };
  }

  // 1) Fehler im Programm selbst haben Vorrang – sie sind am hilfreichsten.
  //    Die Gruppe ohne Eingaben ignorieren wir, wenn das Programm Eingaben braucht (EOF) und andere Gruppen existieren.
  for (let i = 0; i < results.length; i++) {
    const err = results[i].error;
    if (!err) continue;
    if (i === 0 && groups.length > 1 && err.type === "EOFError") continue;
    const f = explainError(err, { checking: true });
    return { ok: false, title: f.title, message: f.text, line: f.line, hadError: true };
  }

  // 2) Die Prüfungen der Reihe nach
  for (const c of checks) {
    switch (c.type) {
      case "code": {
        const re = new RegExp(c.pattern, c.flags ?? "m");
        const found = re.test(stripPythonComments(code));
        if (found === Boolean(c.negate)) return { ok: false, title: "Noch nicht ganz", message: c.message };
        break;
      }
      case "output": {
        const res = results[groupFor(c.inputs)];
        const expected = text(c.expected);
        if (!outputMatches(res.output, expected, c.match ?? "exact", c.ignoreCase)) {
          return {
            ok: false,
            title: "Noch nicht ganz",
            message: c.message ?? outputHint(res.output, expected),
            expected: c.match === "regex" ? undefined : expected,
            actual: res.output,
          };
        }
        break;
      }
      case "assert": {
        const ref = testRef.get(c)!;
        const t = results[ref.group].tests[ref.test];
        if (!t?.ok) {
          let extra = "";
          if (t?.error && t.error.type !== "AssertionError") extra = ` (${explainError(t.error).text})`;
          return { ok: false, title: "Noch nicht ganz", message: c.message + extra };
        }
        break;
      }
      case "noError":
        break;
    }
  }
  return { ok: true, title: praise(), message: "" };
}
