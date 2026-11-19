/**
 * Kleiner Wrapper für Aufrufe an das Backend (/api/...).
 * Der Header "X-Codefunke" schützt zusammen mit SameSite-Cookies vor CSRF:
 * Fremde Webseiten können diesen Header nicht ohne CORS-Freigabe setzen.
 */
import { STATIC_MODE } from "./env";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  if (STATIC_MODE) throw new ApiError(0, "Diese Version von Codefunke läuft ohne Server – alles wird in deinem Browser gespeichert.");
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: options.method ?? "GET",
      headers: { "Content-Type": "application/json", "X-Codefunke": "1" },
      credentials: "same-origin",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch {
    throw new ApiError(0, "Der Server ist gerade nicht erreichbar. Dein Fortschritt wird lokal gespeichert.");
  }
  // Statisches Hosting ohne Backend liefert unter /api oft HTML (oder 404 als HTML) – dann gilt: kein Server
  if (!(res.headers.get("content-type") ?? "").includes("application/json")) {
    throw new ApiError(0, "Der Server ist gerade nicht erreichbar. Dein Fortschritt wird lokal gespeichert.");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Da ist etwas schiefgelaufen.");
  return data as T;
}
