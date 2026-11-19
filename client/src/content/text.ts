import type { Text } from "./types";

/** Wandelt Text (String oder Zeilen-Array) in einen String um */
export function text(t: Text | undefined): string {
  if (t === undefined) return "";
  return Array.isArray(t) ? t.join("\n") : t;
}
