/**
 * Startet Lua-Programme in einem eigenen Worker. Zum Stoppen wird der Worker
 * einfach beendet (Lua-Programme sind klein, der Neustart ist schnell).
 */
export interface LuaHandlers {
  output: (text: string, stream?: "stdout" | "stdin") => void;
  inputRequest?: () => void;
}

export interface LuaResult {
  ok: boolean;
  error?: string;
  line?: number;
  stopped?: boolean;
}

/** Macht Lua-Fehlermeldungen etwas freundlicher */
export function explainLuaError(raw: string): { text: string; line?: number } {
  const m = raw.match(/\[string "[^"]*"\]:(\d+):\s*(.*)$/s) ?? raw.match(/:(\d+):\s*(.*)$/s);
  const line = m ? Number(m[1]) : undefined;
  const msg = (m ? m[2] : raw).trim();
  const where = line ? `In Zeile ${line}: ` : "";
  if (/'end' expected/.test(msg)) return { line, text: `${where}Es fehlt ein \`end\`. In Lua endet jeder Block (if, for, while, function) mit \`end\`.` };
  if (/'then' expected/.test(msg)) return { line, text: `${where}Nach der Bedingung von \`if\` fehlt \`then\`.` };
  if (/'do' expected/.test(msg)) return { line, text: `${where}Bei \`for\` und \`while\` fehlt \`do\`.` };
  if (/'=' expected/.test(msg)) return { line, text: `${where}Lua erwartet hier ein \`=\` – vielleicht ein Tippfehler?` };
  if (/unfinished string/.test(msg)) return { line, text: `${where}Ein Text ist nicht mit Anführungszeichen geschlossen.` };
  const nilCall = msg.match(/attempt to call a nil value \((?:global|field|method) '([^']+)'\)/);
  if (nilCall) return { line, text: `${where}\`${nilCall[1]}\` gibt es nicht. Tippfehler?` };
  if (/attempt to perform arithmetic on a nil value/.test(msg)) return { line, text: `${where}Du rechnest mit etwas, das keinen Wert hat (nil). Hast du die Variable vorher gesetzt?` };
  if (/attempt to concatenate/.test(msg)) return { line, text: `${where}Mit \`..\` kann man nur Texte und Zahlen verbinden – hier ist etwas \`nil\`.` };
  return { line, text: `${where}${msg}` };
}

const DATA_BYTES = 64 * 1024;

export class LuaRunner {
  private worker: Worker | null = null;
  private sab = typeof crossOriginIsolated !== "undefined" && crossOriginIsolated
    ? { control: new SharedArrayBuffer(8), data: new SharedArrayBuffer(DATA_BYTES) }
    : null;
  private finish: ((r: LuaResult) => void) | null = null;
  readonly interactive = this.sab !== null;

  run(code: string, handlers: LuaHandlers, inputs?: string[]): Promise<LuaResult> {
    this.stop();
    const worker = new Worker(new URL("./luaWorker.ts", import.meta.url), { type: "module", name: "lua" });
    this.worker = worker;
    return new Promise<LuaResult>((resolve) => {
      this.finish = resolve;
      worker.onmessage = (e) => {
        const m = e.data;
        if (m.type === "output") handlers.output(m.text, m.stream);
        if (m.type === "input-request") handlers.inputRequest?.();
        if (m.type === "done") {
          this.finish = null;
          worker.terminate();
          if (this.worker === worker) this.worker = null;
          if (m.ok) resolve({ ok: true });
          else {
            const f = explainLuaError(String(m.error));
            resolve({ ok: false, error: f.text, line: f.line });
          }
        }
      };
      worker.onerror = (e) => resolve({ ok: false, error: e.message || "Lua konnte nicht gestartet werden." });
      worker.postMessage({ type: "run", id: 1, code, wasmUrl: `${import.meta.env.BASE_URL}lua/glue.wasm`, sab: this.sab ?? undefined, inputs });
    });
  }

  provideInput(value: string | null) {
    if (!this.sab) return;
    const control = new Int32Array(this.sab.control);
    if (value === null) control[1] = -1;
    else {
      const bytes = new TextEncoder().encode(value).slice(0, DATA_BYTES);
      new Uint8Array(this.sab.data).set(bytes);
      control[1] = bytes.length;
    }
    Atomics.store(control, 0, 1);
    Atomics.notify(control, 0);
  }

  stop() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.finish) {
      const f = this.finish;
      this.finish = null;
      f({ ok: false, stopped: true });
    }
  }
}

export const luaRunner = new LuaRunner();
