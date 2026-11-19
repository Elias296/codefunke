/**
 * API-Tests: starten die echte Express-App mit einer In-Memory-Datenbank.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { openDb } from "../src/db.ts";
import { createApp } from "../src/app.ts";

let server: Server;
let base = "";

beforeAll(async () => {
  const app = createApp({ db: openDb(":memory:") });
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
afterAll(() => server.close());

/** Kleiner Client, der Cookies wie ein Browser mitschickt */
function client() {
  let cookie = "";
  return async (path: string, opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) => {
    const res = await fetch(base + path, {
      method: opts.method ?? "GET",
      headers: { "Content-Type": "application/json", "X-Codefunke": "1", ...(cookie ? { Cookie: cookie } : {}), ...opts.headers },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0].endsWith("=") ? "" : set.split(";")[0];
    return { status: res.status, body: (await res.json()) as Record<string, any> };
  };
}

describe("Konten", () => {
  it("registrieren, anmelden, abmelden", async () => {
    const c = client();
    expect((await c("/auth/me")).body.user).toBeNull();
    const reg = await c("/auth/register", { method: "POST", body: { username: "FunkenFlo", password: "geheim123!" } });
    expect(reg.status).toBe(201);
    expect(reg.body.user.username).toBe("FunkenFlo");
    expect((await c("/auth/me")).body.user.username).toBe("FunkenFlo");
    await c("/auth/logout", { method: "POST" });
    expect((await c("/auth/me")).body.user).toBeNull();
    expect((await c("/auth/login", { method: "POST", body: { username: "funkenflo", password: "falsch!!!" } })).status).toBe(401);
    expect((await c("/auth/login", { method: "POST", body: { username: "funkenflo", password: "geheim123!" } })).status).toBe(200);
  });

  it("prüft Eingaben und doppelte Namen", async () => {
    const c = client();
    expect((await c("/auth/register", { method: "POST", body: { username: "ab", password: "geheim123!" } })).status).toBe(400);
    expect((await c("/auth/register", { method: "POST", body: { username: "Kurzpass", password: "123" } })).status).toBe(400);
    expect((await c("/auth/register", { method: "POST", body: { username: "funkenflo", password: "geheim123!" } })).status).toBe(409);
  });

  it("blockiert Anfragen ohne CSRF-Header oder von fremden Seiten", async () => {
    const c = client();
    expect((await c("/auth/register", { method: "POST", body: { username: "Hacker1", password: "geheim123!" }, headers: { "X-Codefunke": "0" } })).status).toBe(403);
    expect((await c("/auth/register", { method: "POST", body: { username: "Hacker2", password: "geheim123!" }, headers: { Origin: "https://boese.example" } })).status).toBe(403);
  });
});

describe("Fortschritt", () => {
  it("wird gespeichert und zusammengeführt", async () => {
    const c = client();
    await c("/auth/register", { method: "POST", body: { username: "Lernfuchs", password: "geheim123!" } });
    const a = { version: 1, completions: { "task:1-scratch/01/a": { xp: 10, at: "2026-01-01T00:00:00.000Z" } }, hints: {}, activityDays: ["2026-01-01"], badges: {}, stats: { codeRuns: 3, errorsFixed: 0, projectsSaved: 0, projectsShared: 0 }, updatedAt: "2026-01-01T00:00:00.000Z" };
    const b = { ...a, completions: { "task:1-scratch/01/b": { xp: 20, at: "2026-01-02T00:00:00.000Z" } }, activityDays: ["2026-01-02"], stats: { ...a.stats, codeRuns: 1 } };
    await c("/progress", { method: "PUT", body: { data: a } });
    const merged = await c("/progress", { method: "PUT", body: { data: b } });
    expect(Object.keys(merged.body.data.completions)).toHaveLength(2);
    expect(merged.body.data.activityDays).toEqual(["2026-01-01", "2026-01-02"]);
    expect(merged.body.data.stats.codeRuns).toBe(3);
    expect((await c("/progress")).body.data.completions["task:1-scratch/01/b"].xp).toBe(20);
  });

  it("verwirft kaputte Daten und begrenzt XP", async () => {
    const c = client();
    await c("/auth/register", { method: "POST", body: { username: "Schummler", password: "geheim123!" } });
    const res = await c("/progress", { method: "PUT", body: { data: { completions: { "task:x/y/z": { xp: 99999, at: "nope" }, "<script>": { xp: 5 } } } } });
    expect(res.body.data.completions["task:x/y/z"].xp).toBe(500);
    expect(res.body.data.completions["<script>"]).toBeUndefined();
  });

  it("braucht ein Konto", async () => {
    expect((await client()("/progress")).status).toBe(401);
  });
});

describe("Projekte", () => {
  it("speichern, teilen, liken, melden", async () => {
    const ada = client();
    const bob = client();
    await ada("/auth/register", { method: "POST", body: { username: "Ada", password: "geheim123!" } });
    await bob("/auth/register", { method: "POST", body: { username: "Bob", password: "geheim123!" } });

    const created = await ada("/projects", { method: "POST", body: { title: "Mein Spiel", language: "python", code: "print('hi')" } });
    expect(created.status).toBe(201);
    const id = created.body.project.id;

    // privat: Bob sieht es nicht
    expect((await bob(`/projects/${id}`)).status).toBe(404);
    expect((await ada(`/projects/${id}`)).body.project.code).toBe("print('hi')");

    // teilen
    expect((await ada(`/projects/${id}/share`, { method: "POST", body: { isPublic: true } })).body.project.isPublic).toBe(true);
    const gallery = await bob("/projects?scope=public");
    expect(gallery.body.projects.map((p: { id: string }) => p.id)).toContain(id);
    expect(gallery.body.projects[0].code).toBeUndefined();

    // liken (nicht das eigene)
    expect((await ada(`/projects/${id}/like`, { method: "POST" })).status).toBe(400);
    expect((await bob(`/projects/${id}/like`, { method: "POST" })).body).toEqual({ likes: 1, likedByMe: true });

    // Bob darf Adas Projekt nicht ändern oder löschen
    expect((await bob(`/projects/${id}`, { method: "PUT", body: { title: "Gehackt", language: "python", code: "" } })).status).toBe(404);
    expect((await bob(`/projects/${id}`, { method: "DELETE" })).status).toBe(404);

    // Suche
    expect((await bob("/projects?scope=public&q=Spiel")).body.projects).toHaveLength(1);
    expect((await bob("/projects?scope=public&q=xyz")).body.projects).toHaveLength(0);

    // Meldung
    expect((await bob(`/projects/${id}/report`, { method: "POST", body: { reason: "Test" } })).status).toBe(200);

    // löschen
    expect((await ada(`/projects/${id}`, { method: "DELETE" })).status).toBe(200);
    expect((await bob(`/projects/${id}`)).status).toBe(404);
  });

  it("blockiert unfreundliche Titel beim Teilen", async () => {
    const c = client();
    await c("/auth/register", { method: "POST", body: { username: "Tester7", password: "geheim123!" } });
    const res = await c("/projects", { method: "POST", body: { title: "Sch1ss Fuck", language: "python", code: "", isPublic: true } });
    expect(res.status).toBe(400);
  });

  it("Konto löschen entfernt Projekte", async () => {
    const c = client();
    await c("/auth/register", { method: "POST", body: { username: "Tschuess", password: "geheim123!" } });
    const p = await c("/projects", { method: "POST", body: { title: "Weg", language: "lua", code: "print(1)", isPublic: true } });
    expect((await c("/auth/me", { method: "DELETE", body: { password: "falsch" } })).status).toBe(401);
    expect((await c("/auth/me", { method: "DELETE", body: { password: "geheim123!" } })).status).toBe(200);
    expect((await client()(`/projects/${p.body.project.id}`)).status).toBe(404);
  });
});
