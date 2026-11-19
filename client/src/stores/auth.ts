import { create } from "zustand";
import { api, ApiError } from "../lib/api";

export interface User {
  id: number;
  username: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  /** unknown = wird geprüft, guest = ohne Konto, user = angemeldet, offline = kein Server */
  status: "unknown" | "guest" | "user" | "offline";
  init: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

export const useAuth = create<AuthState>()((set) => ({
  user: null,
  status: "unknown",
  init: async () => {
    try {
      const { user } = await api<{ user: User | null }>("/auth/me");
      set({ user, status: user ? "user" : "guest" });
    } catch (e) {
      set({ user: null, status: e instanceof ApiError && e.status === 0 ? "offline" : "guest" });
    }
  },
  login: async (username, password) => {
    const { user } = await api<{ user: User }>("/auth/login", { method: "POST", body: { username, password } });
    set({ user, status: "user" });
  },
  register: async (username, password) => {
    const { user } = await api<{ user: User }>("/auth/register", { method: "POST", body: { username, password } });
    set({ user, status: "user" });
  },
  logout: async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    set({ user: null, status: "guest" });
  },
  deleteAccount: async (password) => {
    await api("/auth/me", { method: "DELETE", body: { password } });
    set({ user: null, status: "guest" });
  },
}));
