import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeStorage } from "../lib/storage";

export type ThemeMode = "system" | "light" | "dark";
export type FontScale = "klein" | "normal" | "gross" | "riesig";

interface SettingsState {
  theme: ThemeMode;
  fontScale: FontScale;
  readableFont: boolean;
  reduceMotion: boolean;
  setTheme: (t: ThemeMode) => void;
  setFontScale: (f: FontScale) => void;
  setReadableFont: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;
}

/** Barrierefreiheits- und Darstellungs-Einstellungen (nur lokal im Browser). */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      fontScale: "normal",
      readableFont: false,
      reduceMotion: false,
      setTheme: (theme) => set({ theme }),
      setFontScale: (fontScale) => set({ fontScale }),
      setReadableFont: (readableFont) => set({ readableFont }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
    }),
    { name: "codefunke-settings", storage: createJSONStorage(() => safeStorage) },
  ),
);

export function resolveDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

/** Überträgt die Einstellungen auf <html data-…> */
export function applySettings(s: Pick<SettingsState, "theme" | "fontScale" | "readableFont" | "reduceMotion">): void {
  const el = document.documentElement;
  const dark = resolveDark(s.theme);
  el.dataset.theme = dark ? "dark" : "light";
  el.dataset.font = s.fontScale;
  if (s.readableFont) el.dataset.readable = "true";
  else delete el.dataset.readable;
  if (s.reduceMotion) el.dataset.motion = "reduce";
  else delete el.dataset.motion;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#13122a" : "#fff8ec");
}
