/*
 * Codefunke – Service Worker für GitHub Pages & andere statische Hosts.
 *
 * Python braucht "Cross-Origin-Isolation" (SharedArrayBuffer), damit input()
 * auf Eingaben warten und der Stopp-Knopf Programme anhalten kann. Dafür
 * müssen zwei HTTP-Header gesetzt sein. GitHub Pages erlaubt keine eigenen
 * Header – also fügt dieser Service Worker sie zu allen Antworten der
 * eigenen Seite hinzu. (Auf dem eigenen Server wird er nicht benutzt.)
 */
const coep = new URL(self.location.href).searchParams.get("coep") === "require-corp" ? "require-corp" : "credentialless";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Nur Anfragen an die eigene Seite anfassen
  if (new URL(request.url).origin !== self.location.origin) return;
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;

  event.respondWith(
    fetch(request).then((response) => {
      if (response.status === 0) return response;
      const headers = new Headers(response.headers);
      headers.set("Cross-Origin-Embedder-Policy", coep);
      headers.set("Cross-Origin-Opener-Policy", "same-origin");
      headers.set("Cross-Origin-Resource-Policy", "same-origin");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }),
  );
});
