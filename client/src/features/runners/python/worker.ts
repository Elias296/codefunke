/**
 * Web Worker: führt Python-Code mit Pyodide aus – getrennt von der Webseite.
 *
 * Sicherheit: Nach dem Laden von Pyodide entfernen wir alle Netzwerk-
 * Funktionen (fetch, XMLHttpRequest, WebSocket …) aus dem Worker. Python-Code
 * kann also weder Daten senden noch fremde Skripte laden.
 *
 * Eingaben: Mit SharedArrayBuffer (Cross-Origin-Isolation) wartet der Worker
 * blockierend auf die Eingabe aus der Webseite – so funktioniert input() wie
 * im echten Python. Ohne SAB werden vorab eingetragene Eingaben verwendet.
 */
import { installHarness, runChecksSync, runLiveSync, type CheckGroup, type PyodideLike } from "./pySetup";
import { lockDown } from "../lockdown";

interface SabSet {
  control: SharedArrayBuffer;
  data: SharedArrayBuffer;
  interrupt: SharedArrayBuffer;
}

type InMsg =
  | { type: "init"; indexURL: string; sab?: SabSet }
  | { type: "run"; id: number; code: string; inputs?: string[] }
  | { type: "check"; id: number; code: string; groups: CheckGroup[] };

interface FullPyodide extends PyodideLike {
  setStdout(o: object): void;
  setStderr(o: object): void;
  setInterruptBuffer(b: Uint8Array): void;
  checkInterrupt(): void;
}

const ctx = self as unknown as { postMessage(m: unknown): void; onmessage: ((e: MessageEvent<InMsg>) => void) | null };

let py: FullPyodide | null = null;
let control: Int32Array | null = null;
let data: Uint8Array | null = null;
let currentId = 0;
let live = false;
let queued: string[] = [];
let outputChars = 0;
const sleepCell = new Int32Array(typeof SharedArrayBuffer !== "undefined" ? new SharedArrayBuffer(4) : new ArrayBuffer(4));
const decoder = new TextDecoder();
const MAX_LIVE_OUTPUT = 1_000_000;

function post(m: unknown) {
  ctx.postMessage(m);
}

function writer(stream: "stdout" | "stderr") {
  return {
    write: (buf: Uint8Array) => {
      if (live) {
        outputChars += buf.length;
        if (outputChars > MAX_LIVE_OUTPUT) throw new Error("zu viel Ausgabe");
        post({ type: "output", id: currentId, stream, text: decoder.decode(buf) });
      }
      return buf.length;
    },
  };
}

function readLine(prompt: string): string | null {
  if (!live) return null;
  if (control && data) {
    Atomics.store(control, 0, 0);
    post({ type: "input-request", id: currentId, prompt });
    Atomics.wait(control, 0, 0);
    const len = control[1];
    if (len < 0) return null;
    const copy = new Uint8Array(len);
    copy.set(data.subarray(0, len));
    return decoder.decode(copy);
  }
  const next = queued.shift();
  if (next === undefined) {
    post({ type: "input-missing", id: currentId, prompt });
    return null;
  }
  post({ type: "output", id: currentId, stream: "stdin", text: `${next}\n` });
  return next;
}

function sleep(seconds: number) {
  let ms = Math.max(0, Math.min(seconds, 30) * 1000);
  const canWait = typeof SharedArrayBuffer !== "undefined" && sleepCell.buffer instanceof SharedArrayBuffer;
  while (ms > 0) {
    const chunk = Math.min(ms, 50);
    if (canWait) Atomics.wait(sleepCell, 0, 0, chunk);
    else {
      const end = Date.now() + chunk;
      while (Date.now() < end) { /* warten */ }
    }
    ms -= chunk;
    py?.checkInterrupt();
  }
}

async function init(msg: Extract<InMsg, { type: "init" }>) {
  post({ type: "status", status: "loading" });
  const { loadPyodide } = (await import(/* @vite-ignore */ `${msg.indexURL}pyodide.mjs`)) as { loadPyodide: (o: object) => Promise<FullPyodide> };
  py = await loadPyodide({ indexURL: msg.indexURL });
  if (msg.sab) {
    control = new Int32Array(msg.sab.control);
    data = new Uint8Array(msg.sab.data);
    py.setInterruptBuffer(new Uint8Array(msg.sab.interrupt));
  }
  py.setStdout(writer("stdout"));
  py.setStderr(writer("stderr"));
  installHarness(py, {
    read_line: readLine,
    turtle: (json: string) => { if (live) post({ type: "turtle", id: currentId, cmds: JSON.parse(json) }); },
    sleep,
  });
  // Standardmodule vorladen, damit "import random" sofort klappt
  py.runPython("import random, math, time, json");
  lockDown();
  post({ type: "status", status: "ready", interactive: Boolean(msg.sab) });
}

ctx.onmessage = async (e) => {
  const msg = e.data;
  try {
    if (msg.type === "init") {
      await init(msg);
    } else if (msg.type === "run") {
      if (!py) throw new Error("Python ist noch nicht geladen");
      currentId = msg.id;
      live = true;
      outputChars = 0;
      queued = [...(msg.inputs ?? [])];
      const result = runLiveSync(py, msg.code);
      live = false;
      post({ type: "done", id: msg.id, result });
    } else if (msg.type === "check") {
      if (!py) throw new Error("Python ist noch nicht geladen");
      currentId = msg.id;
      live = false;
      const results = runChecksSync(py, msg.code, msg.groups);
      post({ type: "check-done", id: msg.id, results });
    }
  } catch (err) {
    live = false;
    post({ type: "fatal", id: "id" in msg ? msg.id : 0, message: String(err) });
  }
};
