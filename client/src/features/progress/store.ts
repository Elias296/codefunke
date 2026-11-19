/**
 * Fortschritts-Speicher im Browser.
 *
 * - Ohne Konto: wird nur im localStorage gespeichert.
 * - Mit Konto: wird zusätzlich (verzögert) an den Server geschickt. Der Server
 *   führt die Daten zusammen und schickt das Ergebnis zurück.
 * - Nach jeder Änderung werden Abzeichen und Level-Aufstiege geprüft.
 */
import { create } from "zustand";
import {
  emptyProgress, evaluateBadges, levelInfo, localDay, mergeProgress, sanitizeProgress, totalXp,
  type Completion, type ProgressData, type ProgressStats,
} from "@shared/progress.ts";
import { badges } from "../../content/loader";
import { readJson, writeJson } from "../../lib/storage";
import { api } from "../../lib/api";
import { toast } from "../../stores/toasts";
import { useAuth } from "../../stores/auth";

const STORAGE_KEY = "codefunke-progress";

interface CompleteResult {
  isNew: boolean;
  xpGained: number;
}

interface ProgressState {
  data: ProgressData;
  syncing: boolean;
  /** Markiert einen Eintrag als geschafft. Bessere Ergebnisse ersetzen schlechtere. */
  complete: (key: string, c: Omit<Completion, "at">) => CompleteResult;
  useHint: (key: string, level: number) => void;
  recordActivity: () => void;
  bumpStat: (stat: keyof ProgressStats) => void;
  setLastVisited: (path: string, title: string) => void;
  replace: (data: ProgressData) => void;
  reset: () => void;
  /** Beim Anmelden: Server-Fortschritt holen und mit dem lokalen zusammenführen */
  pullFromServer: () => Promise<void>;
}

function load(): ProgressData {
  return sanitizeProgress(readJson(STORAGE_KEY, null)) ?? emptyProgress();
}

export const useProgress = create<ProgressState>()((set, get) => {
  /** Speichert, prüft Abzeichen/Level und meldet Neues */
  const commit = (next: ProgressData, opts: { silent?: boolean } = {}) => {
    const prev = get().data;
    const newBadges = evaluateBadges(next, badges);
    if (newBadges.length) {
      const now = new Date().toISOString();
      next = { ...next, badges: { ...next.badges } };
      for (const id of newBadges) next.badges[id] = now;
    }
    next.updatedAt = new Date().toISOString();
    set({ data: next });
    writeJson(STORAGE_KEY, next);
    scheduleSync();

    if (opts.silent) return;
    for (const id of newBadges) {
      const def = badges.find((b) => b.id === id);
      if (def) toast({ kind: "badge", title: `Neues Abzeichen: ${def.title}`, text: def.description, icon: def.icon });
    }
    const before = levelInfo(totalXp(prev)).level;
    const after = levelInfo(totalXp(next));
    if (after.level > before) {
      toast({ kind: "level", title: `Level ${after.level} erreicht!`, text: `Du bist jetzt „${after.title}“. Weiter so!` });
    }
  };

  const withActivity = (d: ProgressData): ProgressData => {
    const today = localDay();
    return d.activityDays.includes(today) ? d : { ...d, activityDays: [...d.activityDays, today].slice(-400) };
  };

  return {
    data: load(),
    syncing: false,

    complete: (key, c) => {
      const data = get().data;
      const old = data.completions[key];
      // Der beste Versuch zählt: höchste XP/Punkte, wenigste Hilfe.
      const entry: Completion = { xp: c.xp, at: old?.at ?? new Date().toISOString() };
      const score = Math.max(old?.score ?? -1, c.score ?? -1);
      if (score >= 0) entry.score = score;
      if (old?.passed || c.passed) entry.passed = true;
      const usedSolution = old ? Boolean(old.usedSolution && c.usedSolution) : Boolean(c.usedSolution);
      if (usedSolution) entry.usedSolution = true;
      const hints = old ? Math.min(old.hintsUsed ?? 0, c.hintsUsed ?? 0) : (c.hintsUsed ?? 0);
      if (hints > 0) entry.hintsUsed = hints;
      if (old) entry.xp = Math.max(old.xp, c.xp);
      const xpGained = Math.max(0, entry.xp - (old?.xp ?? 0));
      commit(withActivity({ ...data, completions: { ...data.completions, [key]: entry } }));
      return { isNew: !old, xpGained };
    },

    useHint: (key, level) => {
      const data = get().data;
      if ((data.hints[key] ?? 0) >= level) return;
      commit({ ...data, hints: { ...data.hints, [key]: level } }, { silent: true });
    },

    recordActivity: () => commit(withActivity(get().data)),

    bumpStat: (stat) => {
      const data = get().data;
      commit(withActivity({ ...data, stats: { ...data.stats, [stat]: data.stats[stat] + 1 } }));
    },

    setLastVisited: (path, title) => {
      const data = get().data;
      if (data.lastVisited?.path === path) return;
      const next = { ...data, lastVisited: { path, title, at: new Date().toISOString() } };
      set({ data: next });
      writeJson(STORAGE_KEY, next);
      scheduleSync();
    },

    replace: (data) => {
      set({ data });
      writeJson(STORAGE_KEY, data);
    },

    reset: () => {
      const data = emptyProgress();
      set({ data });
      writeJson(STORAGE_KEY, data);
    },

    pullFromServer: async () => {
      if (useAuth.getState().status !== "user") return;
      set({ syncing: true });
      try {
        const res = await api<{ data: ProgressData | null }>("/progress");
        const server = res.data ? sanitizeProgress(res.data) : null;
        const merged = server ? mergeProgress(server, get().data) : get().data;
        commit(merged, { silent: true });
        await pushNow();
      } finally {
        set({ syncing: false });
      }
    },
  };
});

// ------------------------------------------------------------- Server-Sync

let syncTimer: number | undefined;

function scheduleSync() {
  if (useAuth.getState().status !== "user") return;
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => void pushNow(), 1500);
}

async function pushNow() {
  if (useAuth.getState().status !== "user") return;
  const local = useProgress.getState().data;
  try {
    const res = await api<{ data: ProgressData }>("/progress", { method: "PUT", body: { data: local } });
    const merged = sanitizeProgress(res.data);
    // Nur übernehmen, wenn der Server etwas Neues kennt (z. B. von einem anderen Gerät)
    if (merged && JSON.stringify(merged.completions) !== JSON.stringify(useProgress.getState().data.completions)) {
      useProgress.getState().replace(mergeProgress(useProgress.getState().data, merged));
    }
  } catch {
    /* offline – beim nächsten Mal erneut versuchen */
  }
}
