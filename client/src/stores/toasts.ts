import { create } from "zustand";

export interface Toast {
  id: number;
  title: string;
  text?: string;
  kind: "badge" | "level" | "info" | "success" | "error";
  icon?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

/** Kleine Benachrichtigungen (neues Abzeichen, Level-Up, Fehler …) */
export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { ...t, id }].slice(-4) });
    window.setTimeout(() => get().dismiss(id), t.kind === "error" ? 7000 : 5000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (t: Omit<Toast, "id">) => useToasts.getState().push(t);
