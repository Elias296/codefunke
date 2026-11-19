/**
 * Sicherer Zugriff auf localStorage. In privaten Fenstern oder bei blockierten
 * Website-Daten kann localStorage fehlen oder Fehler werfen – die Seite soll
 * trotzdem funktionieren (dann eben ohne Speichern).
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Speicher voll oder gesperrt – ignorieren */
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignorieren */
  }
}

/** Speicher-Adapter für zustand/persist, der nie Fehler wirft */
export const safeStorage = {
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* ignorieren */
    }
  },
  removeItem: (name: string) => removeKey(name),
};
