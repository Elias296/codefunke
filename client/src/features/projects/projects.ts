/**
 * Eigene Projekte speichern und teilen.
 * - Angemeldet: auf dem Server (können öffentlich geteilt werden).
 * - Ohne Konto: lokal im Browser (nur auf diesem Gerät, nicht teilbar).
 */
import { api } from "../../lib/api";
import { readJson, writeJson } from "../../lib/storage";
import { useAuth } from "../../stores/auth";
import { useProgress } from "../progress/store";

export type ProjectLanguage = "blocks" | "python" | "web" | "lua" | "java";

export interface ProjectSummary {
  id: string;
  title: string;
  description: string;
  language: ProjectLanguage;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  author?: string;
  likes?: number;
  likedByMe?: boolean;
  /** true = nur lokal im Browser gespeichert */
  local?: boolean;
  remixOf?: string | null;
}

export interface ProjectFull extends ProjectSummary {
  code: string;
  isMine?: boolean;
}

export const LANGUAGE_LABELS: Record<ProjectLanguage, string> = {
  blocks: "Blöcke",
  python: "Python",
  web: "HTML/CSS/JS",
  lua: "Lua",
  java: "Java",
};

export const LANGUAGE_COLORS: Record<ProjectLanguage, string> = {
  blocks: "var(--color-stage-scratch)",
  python: "var(--color-stage-python)",
  web: "var(--color-stage-web)",
  lua: "var(--color-stage-lua)",
  java: "var(--color-stage-java)",
};

const LOCAL_KEY = "codefunke-projects";

function localAll(): ProjectFull[] {
  return readJson<ProjectFull[]>(LOCAL_KEY, []);
}

function localSave(list: ProjectFull[]) {
  writeJson(LOCAL_KEY, list);
}

function loggedIn(): boolean {
  return useAuth.getState().status === "user";
}

export interface SaveInput {
  id?: string;
  title: string;
  description?: string;
  language: ProjectLanguage;
  code: string;
  isPublic?: boolean;
  remixOf?: string | null;
}

/** Speichert (neu oder Update) und gibt das Projekt zurück */
export async function saveProject(input: SaveInput): Promise<ProjectFull> {
  const isNew = !input.id;
  let result: ProjectFull;
  if (loggedIn() && !input.id?.startsWith("local-")) {
    const body = { title: input.title, description: input.description ?? "", language: input.language, code: input.code, isPublic: Boolean(input.isPublic), remixOf: input.remixOf ?? null };
    const res = input.id
      ? await api<{ project: ProjectFull }>(`/projects/${input.id}`, { method: "PUT", body })
      : await api<{ project: ProjectFull }>("/projects", { method: "POST", body });
    result = res.project;
  } else {
    const list = localAll();
    const now = new Date().toISOString();
    const existing = input.id ? list.find((p) => p.id === input.id) : undefined;
    result = {
      id: existing?.id ?? `local-${crypto.randomUUID().slice(0, 8)}`,
      title: input.title,
      description: input.description ?? "",
      language: input.language,
      code: input.code,
      isPublic: false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      local: true,
      isMine: true,
      remixOf: input.remixOf ?? null,
    };
    localSave([result, ...list.filter((p) => p.id !== result.id)].slice(0, 100));
  }
  if (isNew) useProgress.getState().bumpStat("projectsSaved");
  return result;
}

export async function listMyProjects(): Promise<ProjectSummary[]> {
  const local = localAll().map(({ code: _code, ...rest }) => rest);
  if (!loggedIn()) return local;
  const res = await api<{ projects: ProjectSummary[] }>("/projects?scope=mine");
  return [...res.projects, ...local];
}

export async function listPublicProjects(params: { q?: string; language?: string; sort?: "neu" | "beliebt" } = {}): Promise<ProjectSummary[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.language) qs.set("language", params.language);
  if (params.sort) qs.set("sort", params.sort);
  const res = await api<{ projects: ProjectSummary[] }>(`/projects?scope=public&${qs}`);
  return res.projects;
}

export async function getProject(id: string): Promise<ProjectFull> {
  if (id.startsWith("local-")) {
    const p = localAll().find((x) => x.id === id);
    if (!p) throw new Error("Dieses Projekt gibt es auf diesem Gerät nicht.");
    return p;
  }
  const res = await api<{ project: ProjectFull }>(`/projects/${encodeURIComponent(id)}`);
  return res.project;
}

export async function deleteProject(id: string): Promise<void> {
  if (id.startsWith("local-")) {
    localSave(localAll().filter((p) => p.id !== id));
    return;
  }
  await api(`/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Öffentlich teilen oder wieder privat machen (nur mit Konto) */
export async function setShared(id: string, isPublic: boolean): Promise<ProjectFull> {
  const res = await api<{ project: ProjectFull }>(`/projects/${encodeURIComponent(id)}/share`, { method: "POST", body: { isPublic } });
  if (isPublic) useProgress.getState().bumpStat("projectsShared");
  return res.project;
}

export async function toggleLike(id: string): Promise<{ likes: number; likedByMe: boolean }> {
  return api(`/projects/${encodeURIComponent(id)}/like`, { method: "POST" });
}

export async function reportProject(id: string, reason: string): Promise<void> {
  await api(`/projects/${encodeURIComponent(id)}/report`, { method: "POST", body: { reason } });
}
