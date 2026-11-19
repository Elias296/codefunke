/** Zwischenstände von Aufgaben im Browser merken (damit nichts verloren geht) */
import { readJson, writeJson, removeKey } from "../../lib/storage";

const PREFIX = "codefunke-draft:";

export function loadDraft<T>(key: string): T | undefined {
  return readJson<T | undefined>(PREFIX + key, undefined);
}

let timers: Record<string, number> = {};

export function saveDraft(key: string, value: unknown) {
  window.clearTimeout(timers[key]);
  timers[key] = window.setTimeout(() => writeJson(PREFIX + key, value), 400);
}

export function clearDraft(key: string) {
  window.clearTimeout(timers[key]);
  removeKey(PREFIX + key);
}

export function resetDraftTimers() {
  Object.values(timers).forEach((t) => window.clearTimeout(t));
  timers = {};
}
