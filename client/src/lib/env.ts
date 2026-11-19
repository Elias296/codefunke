/**
 * STATIC_MODE = die Seite läuft ohne eigenen Server (z. B. auf GitHub Pages).
 * Dann gibt es keine Konten und keine gemeinsame Galerie – Fortschritt und
 * Projekte werden im Browser gespeichert. Gesetzt beim Bauen mit
 * `npm run build:pages` (Umgebungsvariable VITE_STATIC=1).
 */
export const STATIC_MODE = import.meta.env.VITE_STATIC === "1";

/** Basis-Pfad der Seite, z. B. "/codefunke/" auf GitHub Pages */
export const BASE = import.meta.env.BASE_URL;
