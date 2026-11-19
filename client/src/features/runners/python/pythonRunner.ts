/**
 * Steuert den Python-Worker von der Webseite aus:
 * Laden, Ausführen, Eingaben weiterreichen, Stoppen und Aufgaben prüfen.
 * Es gibt einen gemeinsamen Worker für die ganze Seite (`python`).
 */
import type { CheckGroup, CheckGroupResult } from "./pySetup";
import type { PyErrorInfo } from "./errorHelp";

export interface TurtleCmd {
  op: string;
  [key: string]: unknown;
}

export interface RunHandlers {
  output: (text: string, stream: "stdout" | "stderr" | "stdin") => void;
  /** Python wartet auf eine Eingabe – die Oberfläche ruft dann python.provideInput() auf */
  inputRequest?: (prompt: string) => void;
  /** Ohne Cross-Origin-Isolation und ohne vorab eingetragene Eingaben */
  inputMissing?: (prompt: string) => void;
  turtle?: (cmds: TurtleCmd[]) => void;
}

export interface LiveResult {
  ok: boolean;
  error: PyErrorInfo | null;
}

type Status = "idle" | "loading" | "ready" | "running" | "error";

interface Pending {
  kind: "run" | "check";
  resolve: (v: never) => void;
  handlers?: RunHandlers;
}

const DATA_BYTES = 64 * 1024;

export class PythonRunner {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private sab: { control: SharedArrayBuffer; data: SharedArrayBuffer; interrupt: SharedArrayBuffer } | null = null;
  private listeners = new Set<(s: Status) => void>();
  status: Status = "idle";
  /** true = input() wartet wirklich auf Eingaben (SharedArrayBuffer verfügbar) */
  interactive = false;
  private currentRun: number | null = null;

  onStatus(fn: (s: Status) => void): () => void {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  private setStatus(s: Status) {
    this.status = s;
    this.listeners.forEach((fn) => fn(s));
  }

  /** Lädt Pyodide (beim ersten Aufruf). Kann früh aufgerufen werden, um Wartezeit zu sparen. */
  ensure(): Promise<void> {
    if (this.ready) return this.ready;
    this.setStatus("loading");
    const isolated = typeof crossOriginIsolated !== "undefined" && crossOriginIsolated && typeof SharedArrayBuffer !== "undefined";
    this.sab = isolated
      ? { control: new SharedArrayBuffer(8), data: new SharedArrayBuffer(DATA_BYTES), interrupt: new SharedArrayBuffer(1) }
      : null;
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "python" });
    this.worker = worker;
    this.ready = new Promise<void>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent) => {
        const m = e.data;
        if (m.type === "status" && m.status === "ready") {
          this.interactive = Boolean(m.interactive);
          this.setStatus("ready");
          resolve();
          return;
        }
        this.handle(m);
      };
      worker.onerror = (e) => {
        this.setStatus("error");
        reject(new Error(e.message || "Python konnte nicht geladen werden"));
      };
    });
    worker.postMessage({ type: "init", indexURL: new URL(`${import.meta.env.BASE_URL}pyodide/`, location.origin).href, sab: this.sab ?? undefined });
    this.ready.catch(() => {
      this.ready = null;
      this.worker?.terminate();
      this.worker = null;
    });
    return this.ready;
  }

  private handle(m: { type: string; id: number; [k: string]: unknown }) {
    const p = this.pending.get(m.id);
    switch (m.type) {
      case "output": p?.handlers?.output(String(m.text), m.stream as "stdout"); break;
      case "input-request": p?.handlers?.inputRequest?.(String(m.prompt)); break;
      case "input-missing": p?.handlers?.inputMissing?.(String(m.prompt)); break;
      case "turtle": p?.handlers?.turtle?.(m.cmds as TurtleCmd[]); break;
      case "done":
        this.finish(m.id, m.result);
        break;
      case "check-done":
        this.finish(m.id, m.results);
        break;
      case "fatal":
        if (p) this.finish(m.id, p.kind === "run" ? { ok: false, error: { type: "Fehler", message: String(m.message) } } : []);
        break;
    }
  }

  private finish(id: number, value: unknown) {
    const p = this.pending.get(id);
    if (!p) return;
    this.pending.delete(id);
    if (this.currentRun === id) this.currentRun = null;
    if (this.pending.size === 0 && this.status === "running") this.setStatus("ready");
    (p.resolve as (v: unknown) => void)(value);
  }

  /** Führt ein Programm aus. Ausgaben kommen live über die handlers. */
  async run(code: string, handlers: RunHandlers, inputs?: string[]): Promise<LiveResult> {
    await this.ensure();
    if (this.currentRun !== null) this.stop();
    const id = this.nextId++;
    this.currentRun = id;
    if (this.sab) new Uint8Array(this.sab.interrupt)[0] = 0;
    this.setStatus("running");
    return new Promise<LiveResult>((resolve) => {
      this.pending.set(id, { kind: "run", resolve: resolve as (v: never) => void, handlers });
      this.worker!.postMessage({ type: "run", id, code, inputs });
    });
  }

  /** Gibt eine Eingabe an Python weiter (null = abbrechen) */
  provideInput(value: string | null) {
    if (!this.sab) return;
    const control = new Int32Array(this.sab.control);
    if (value === null) {
      control[1] = -1;
    } else {
      const bytes = new TextEncoder().encode(value).slice(0, DATA_BYTES);
      new Uint8Array(this.sab.data).set(bytes);
      control[1] = bytes.length;
    }
    Atomics.store(control, 0, 1);
    Atomics.notify(control, 0);
  }

  /** Prüft Code in Gruppen (gleiche Eingaben = ein Lauf). Bricht nach timeoutMs ab. */
  async check(code: string, groups: CheckGroup[], timeoutMs = 8000): Promise<CheckGroupResult[]> {
    await this.ensure();
    if (this.currentRun !== null) this.stop();
    const id = this.nextId++;
    this.setStatus("running");
    const result = new Promise<CheckGroupResult[]>((resolve) => {
      this.pending.set(id, { kind: "check", resolve: resolve as (v: never) => void });
      this.worker!.postMessage({ type: "check", id, code, groups });
    });
    let timer: number | undefined;
    const timeout = new Promise<CheckGroupResult[]>((resolve) => {
      timer = window.setTimeout(() => {
        // Zuerst das Zeitlimit melden, dann den hängenden Worker ersetzen
        resolve(groups.map(() => ({ output: "", error: { type: "Timeout", message: "" }, tests: [], unusedInputs: 0 })));
        this.restart();
      }, timeoutMs);
    });
    const res = await Promise.race([result, timeout]);
    window.clearTimeout(timer);
    return res;
  }

  /** Stoppt das laufende Programm (KeyboardInterrupt oder Neustart des Workers) */
  stop() {
    const id = this.currentRun;
    if (id === null) return;
    if (this.sab) {
      new Uint8Array(this.sab.interrupt)[0] = 2; // SIGINT
      this.provideInput(null); // falls Python gerade auf eine Eingabe wartet
      // Falls Python nicht reagiert (z. B. in einer C-Funktion): nach 1,5 s neu starten
      window.setTimeout(() => {
        if (this.pending.has(id)) {
          this.restart();
        }
      }, 1500);
    } else {
      this.restart();
    }
  }

  /** Worker beenden und neu laden – laufende Aufträge werden als gestoppt beendet */
  private restart() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    for (const [id, p] of [...this.pending]) {
      this.finish(id, p.kind === "run" ? { ok: false, error: { type: "KeyboardInterrupt", message: "" } } : []);
    }
    this.currentRun = null;
    this.setStatus("idle");
    void this.ensure().catch(() => undefined);
  }
}

export const python = new PythonRunner();
