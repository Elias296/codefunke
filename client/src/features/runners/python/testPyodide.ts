/**
 * Pyodide für Tests unter Node laden (einmal pro Testlauf).
 * Eingaben kommen aus den Prüf-Gruppen, Turtle-Befehle werden ignoriert.
 */
import { installHarness, runChecksSync, type CheckGroup, type PyodideLike } from "./pySetup";

let instance: Promise<PyodideLike> | undefined;

export function nodePyodide(): Promise<PyodideLike> {
  instance ??= (async () => {
    const { loadPyodide } = await import("pyodide");
    const py = (await loadPyodide()) as unknown as PyodideLike & { setStdout(o: object): void };
    py.setStdout({ batched: () => undefined });
    installHarness(py, { read_line: () => null, turtle: () => undefined });
    return py;
  })();
  return instance;
}

export async function nodeRunGroups(code: string, groups: CheckGroup[]) {
  return runChecksSync(await nodePyodide(), code, groups);
}
