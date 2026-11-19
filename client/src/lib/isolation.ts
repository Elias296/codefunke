/**
 * Sorgt auf statischen Hosts (GitHub Pages) für Cross-Origin-Isolation,
 * indem einmalig der Service Worker coi-sw.js registriert und die Seite neu
 * geladen wird. Gibt true zurück, wenn gerade neu geladen wird.
 */
import { BASE } from "./env";

const RELOAD_FLAG = "codefunke-coi-reload";

export async function ensureIsolation(): Promise<boolean> {
  if (typeof window === "undefined" || window.crossOriginIsolated) {
    try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignorieren */ }
    return false;
  }
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return false;
  // Chrome & Firefox können "credentialless" (erlaubt Bilder anderer Seiten in der HTML-Vorschau),
  // Safari nur "require-corp".
  const w = window as unknown as { chrome?: unknown; netscape?: unknown };
  const coep = w.chrome || w.netscape ? "credentialless" : "require-corp";
  try {
    const reg = await navigator.serviceWorker.register(`${BASE}coi-sw.js?coep=${coep}`, { scope: BASE });
    let reloaded = false;
    try { reloaded = sessionStorage.getItem(RELOAD_FLAG) === "1"; } catch { /* ignorieren */ }
    // Nur einmal neu laden – falls der Browser es trotzdem nicht unterstützt, geht es ohne weiter
    if (reloaded) return false;
    const reload = () => {
      try { sessionStorage.setItem(RELOAD_FLAG, "1"); } catch { /* ignorieren */ }
      window.location.reload();
    };
    if (reg.active && navigator.serviceWorker.controller) {
      reload();
      return true;
    }
    await new Promise<void>((resolve) => {
      const worker = reg.installing ?? reg.waiting ?? reg.active;
      if (!worker || worker.state === "activated") return resolve();
      worker.addEventListener("statechange", () => { if (worker.state === "activated") resolve(); });
    });
    reload();
    return true;
  } catch (e) {
    console.warn("Service Worker konnte nicht registriert werden:", e);
    return false;
  }
}
