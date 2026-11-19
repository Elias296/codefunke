/**
 * Entfernt Netzwerk- und Speicher-Zugriffe aus einem Worker, bevor
 * Code von Lernenden darin läuft (Schutz für geteilte Projekte).
 */
export function lockDown(): void {
  const names = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "Worker", "SharedWorker", "BroadcastChannel", "indexedDB", "caches", "WebTransport"];
  const g = self as unknown as Record<string, unknown>;
  for (const name of names) {
    let obj: object | null = g;
    while (obj) {
      if (Object.prototype.hasOwnProperty.call(obj, name)) {
        try { delete (obj as Record<string, unknown>)[name]; } catch { /* ignorieren */ }
      }
      obj = Object.getPrototypeOf(obj);
    }
    try {
      Object.defineProperty(g, name, { value: undefined, writable: false, configurable: false });
    } catch { /* ignorieren */ }
  }
}
