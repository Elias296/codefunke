/**
 * Datenmodell der Lerninhalte.
 *
 * Alle Inhalte liegen in /content als JSON + Markdown:
 *   content/<stufe>/stage.json            – Stufe mit Kapitel-Reihenfolge und Abschlusstest
 *   content/<stufe>/<kapitel>/chapter.json – Aufgaben, Quiz, Projekt
 *   content/<stufe>/<kapitel>/lesson.md    – Erklärung mit Beispielen
 *
 * Felder vom Typ `Text` dürfen ein String oder ein Array von Zeilen sein –
 * Arrays werden mit Zeilenumbrüchen verbunden (praktisch für Code in JSON).
 * Eine ausführliche Anleitung steht in docs/INHALTE-ERWEITERN.md.
 */

export type Text = string | string[];

/** Sprachen/Umgebungen, in denen programmiert wird */
export type LanguageId = "blocks" | "python" | "web" | "lua" | "java";

// ----------------------------------------------------------- Block-Aufgaben

/** Startzustand der Bühne */
export interface StageSetup {
  x?: number;
  y?: number;
  /** Richtung in Grad: 90 = rechts, 0 = oben */
  direction?: number;
  /** Stern (Sammel-Objekt) – false = kein Stern */
  star?: { x: number; y: number; visible?: boolean } | false;
  background?: string;
  /** Koordinatengitter anzeigen */
  grid?: boolean;
}

/** Ein Schritt der automatischen Simulation beim Prüfen */
export interface RunStep {
  /** Grüne Flagge / Start drücken */
  flag?: boolean;
  /** Taste drücken (z. B. "ArrowRight", " " oder "a") – optional für `ticks` Ticks gedrückt halten */
  key?: string;
  /** Auf Funki klicken */
  click?: boolean;
  /** So viele Ticks (1/60 s) warten bzw. die Taste halten */
  ticks?: number;
}

export interface RunConfig {
  steps?: RunStep[];
  /** Maximale Laufzeit in Ticks (Standard 2400 = 40 s simulierte Zeit) */
  maxTicks?: number;
  /** Startwert für Zufallszahlen (macht Prüfungen wiederholbar) */
  seed?: number;
}

export type BlockCheck =
  | { type: "hasBlock"; block: string; min?: number; message: string }
  | { type: "blockCount"; block?: string; min?: number; max?: number; message: string }
  | { type: "position"; x?: number; y?: number; tolerance?: number; message: string }
  | { type: "direction"; value: number; message: string }
  | { type: "said"; text: string; message: string }
  | { type: "variable"; name: string; equals?: number | string; min?: number; message: string }
  | { type: "penSegments"; min: number; max?: number; message: string }
  | { type: "closedShape"; message: string }
  | { type: "moved"; message: string }
  | { type: "state"; path: string; equals?: number | string | boolean; min?: number; max?: number; message: string };

// ------------------------------------------------------------ Code-Aufgaben

export type CodeCheck =
  /** Vergleicht die Ausgabe des Programms */
  | {
      type: "output";
      expected: Text;
      inputs?: string[];
      match?: "exact" | "contains" | "regex";
      ignoreCase?: boolean;
      message?: string;
    }
  /** Führt Python-Code nach dem Programm aus (gleicher Namensraum). `__output__` enthält die Ausgabe. */
  | { type: "assert"; code: Text; inputs?: string[]; message: string }
  /** Sucht ein Muster (regulärer Ausdruck) im Quelltext – Kommentare werden ignoriert */
  | { type: "code"; pattern: string; flags?: string; negate?: boolean; message: string }
  /** Das Programm muss ohne Fehler durchlaufen */
  | { type: "noError"; inputs?: string[]; message?: string };

// ---------------------------------------------------------------- Aufgaben

interface TaskBase {
  id: string;
  title: string;
  /** 1 = leicht, 2 = mittel, 3 = knifflig */
  difficulty: 1 | 2 | 3;
  instructions: Text;
  /** Tipp und größerer Tipp – die dritte Stufe ist die Lösung */
  hints: [string, string];
  solution: Text;
  xp?: number;
  /** Eigene Lob-Nachricht bei Erfolg */
  success?: string;
}

export interface BlocksTask extends TaskBase {
  kind: "blocks";
  /** Startprogramm in der Block-Schreibweise (siehe docs/INHALTE-ERWEITERN.md) */
  starter?: Text;
  /** Erlaubte Blöcke (Block-Typen). Leer = alle */
  toolbox?: string[];
  stage?: StageSetup;
  run?: RunConfig;
  checks: BlockCheck[];
  /** Python-Übersetzung der Blöcke neben dem Editor zeigen */
  showPython?: boolean;
}

export interface CodeTask extends TaskBase {
  kind: "code";
  language: Exclude<LanguageId, "blocks">;
  starter?: Text;
  checks: CodeCheck[];
}

export type Task = BlocksTask | CodeTask;

// -------------------------------------------------------------------- Quiz

interface QuestionBase {
  question: string;
  /** Optionales Code-Beispiel zur Frage */
  code?: Text;
  codeLanguage?: LanguageId;
  /** Optionales Block-Programm zur Frage (Block-Schreibweise) */
  blocks?: Text;
  /** Erklärung, die nach dem Antworten erscheint */
  explanation?: string;
}

export type Question =
  | (QuestionBase & { type: "single"; options: string[]; answer: number })
  | (QuestionBase & { type: "multiple"; options: string[]; answer: number[] })
  | (QuestionBase & { type: "text"; answer: string[]; placeholder?: string; caseSensitive?: boolean })
  /** Zeilen in die richtige Reihenfolge bringen – `lines` ist die richtige Reihenfolge */
  | (QuestionBase & { type: "order"; lines: string[] });

export interface Quiz {
  questions: Question[];
}

// ------------------------------------------------------------------ Projekt

export interface Project {
  title: string;
  description: Text;
  kind: "blocks" | "code";
  language?: Exclude<LanguageId, "blocks">;
  starter?: Text;
  toolbox?: string[];
  stage?: StageSetup;
  run?: RunConfig;
  /** Checkliste für die Lernenden */
  requirements: string[];
  /** Optionale automatische Prüfungen */
  checks?: (BlockCheck | CodeCheck)[];
  /** Ideen zum Weitermachen */
  ideas?: string[];
  xp?: number;
  /** Beispiellösung (wird nicht angezeigt, aber automatisch gegen die Prüfungen getestet) */
  example?: Text;
}

// ----------------------------------------------------------------- Kapitel

export interface Chapter {
  id: string;
  stageId: string;
  title: string;
  summary: string;
  /** Icon-Name (siehe components/ui/Icon.tsx) */
  icon: string;
  /** Erklärung als Markdown (aus lesson.md) */
  lesson: string;
  tasks: Task[];
  quiz: Quiz;
  project: Project;
}

export interface FinalTest {
  title: string;
  intro: string;
  /** Anteil richtiger Antworten zum Bestehen (0..1) */
  passScore: number;
  questions: Question[];
}

export interface Stage {
  id: string;
  order: number;
  title: string;
  /** Kurzname, z. B. "Scratch" */
  short: string;
  subtitle: string;
  description: string;
  language: LanguageId;
  /** CSS-Farbe der Stufe */
  color: string;
  icon: string;
  /** "bald" = wird im Lernpfad angezeigt, ist aber noch nicht spielbar */
  status: "verfuegbar" | "bald";
  chapters: Chapter[];
  /** Geplante Kapitel für Stufen, die noch kommen */
  planned?: { title: string; summary: string }[];
  finalTest?: FinalTest;
}
