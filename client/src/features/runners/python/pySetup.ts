/**
 * Richtet eine Pyodide-Instanz für Codefunke ein (gleich im Browser-Worker
 * und in den automatischen Tests unter Node).
 */
import { HARNESS_PY, TURTLE_PY } from "./harness";

/** Minimal-Typ der Pyodide-API, die wir benutzen */
export interface PyodideLike {
  registerJsModule(name: string, module: object): void;
  runPython(code: string): unknown;
  FS: { mkdirTree(path: string): void; writeFile(path: string, data: string): void };
  globals: { get(name: string): ((...args: unknown[]) => unknown) & { destroy?: () => void } };
}

export interface Bridge {
  /** Liefert die nächste Eingabezeile (null = keine Eingabe mehr) */
  read_line: (prompt: string) => string | null;
  /** Bekommt Turtle-Befehle als JSON */
  turtle: (json: string) => void;
  /** Schläft (time.sleep) – optional, sonst wartet Python selbst */
  sleep?: (seconds: number) => void;
}

export function installHarness(py: PyodideLike, bridge: Bridge): void {
  py.registerJsModule("_cf_bridge", bridge);
  py.FS.mkdirTree("/cf_modules");
  py.FS.writeFile("/cf_modules/turtle.py", TURTLE_PY);
  py.runPython(`
import sys
if "/cf_modules" not in sys.path:
    sys.path.insert(0, "/cf_modules")
`);
  py.runPython(HARNESS_PY);
  if (bridge.sleep) {
    // time.sleep soll die Ausgabe vorher anzeigen und den Prozessor nicht belasten
    py.runPython(`
import time as _time, sys as _sys
def _cf_sleep(seconds):
    _sys.stdout.flush()
    if "turtle" in _sys.modules:
        _sys.modules["turtle"]._flush()
    _cf_bridge.sleep(float(seconds))
_time.sleep = _cf_sleep
`);
  }
}

export interface CheckGroup {
  inputs?: string[];
  tests?: string[];
}

export interface CheckGroupResult {
  output: string;
  error: import("./errorHelp").PyErrorInfo | null;
  tests: { ok: boolean; error?: import("./errorHelp").PyErrorInfo }[];
  unusedInputs: number;
}

export function runChecksSync(py: PyodideLike, code: string, groups: CheckGroup[]): CheckGroupResult[] {
  const fn = py.globals.get("_cf_run_checks");
  try {
    return JSON.parse(String(fn(code, JSON.stringify(groups)))) as CheckGroupResult[];
  } finally {
    fn.destroy?.();
  }
}

export function runLiveSync(py: PyodideLike, code: string): { ok: boolean; error: import("./errorHelp").PyErrorInfo | null } {
  const fn = py.globals.get("_cf_run_live");
  try {
    return JSON.parse(String(fn(code)));
  } finally {
    fn.destroy?.();
  }
}
