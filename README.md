# 🔥 Codefunke – Programmieren lernen mit Funki

Eine Lernwebsite für Kinder ab ca. 10 Jahren und alle Einsteiger:innen. Der Weg führt in sechs Stufen von **bunten Blöcken (wie in Scratch)** über **Python** bis zu **HTML/CSS/JavaScript, Lua und Java**. Maskottchen ist **Funki**, ein kleiner Drache.

| | |
|---|---|
| **Stufe 1 – Blöcke** ✅ | 6 Kapitel: Bewegung, Schleifen, Ereignisse, Bedingungen, Variablen, erstes Spiel |
| **Stufe 2 – Übergang** 🛠 | geplant (die Technik für „Blöcke ↔ Python nebeneinander“ ist schon eingebaut) |
| **Stufe 3 – Python** ✅ | 7 Kapitel: print, Variablen & Datentypen, if/else, Schleifen & Turtle, Funktionen, Listen, Projekt-Werkstatt |
| **Stufe 4 – HTML/CSS/JS** 🛠 | geplant (Editor mit Live-Vorschau funktioniert bereits) |
| **Stufe 5 – Lua** 🛠 | geplant (Lua läuft bereits im Editor) |
| **Stufe 6 – Java** 🛠 | geplant (Schnittstelle vorbereitet, siehe [Architektur](docs/ARCHITEKTUR.md#java-nachrüsten)) |

Jedes Kapitel hat eine **Erklärung mit Beispielen**, **3–5 Aufgaben** mit steigender Schwierigkeit und automatischer Prüfung, ein **Quiz** und ein **Projekt**. Jede fertige Stufe endet mit einem **Abschlusstest**, der die nächste Stufe freischaltet.

## Funktionen

- **Block-Editor** (Blockly) mit deutschen Blöcken und einer Bühne mit Funki: Start/Stopp, Langsam-Modus mit Block-Hervorhebung, Koordinatengitter, Bildschirm-Tasten für Tablets. Auf Knopfdruck ist das Block-Programm auch als Python-Code zu sehen.
- **Code-Editor** (CodeMirror) mit Syntax-Hervorhebung und Fehlermarkierung. Strg+Enter führt aus.
  - **Python** über Pyodide in einem Web Worker, mit interaktivem `input()`, Stopp-Knopf, Turtle-Grafik und `time.sleep`.
  - **HTML/CSS/JS** mit Live-Vorschau in einem abgeschotteten iframe und Konsole.
  - **Lua** über wasmoon (Lua 5.4 als WebAssembly).
- **Automatische Prüfung** mit verständlichem Feedback auf Deutsch, z. B. *„Fast richtig! Dir fehlt ein Doppelpunkt `:` am Ende von Zeile 3.“*
- **Hinweise in 3 Stufen:** Tipp → größerer Tipp → Lösung (wer die Lösung ansieht, bekommt die halbe XP).
- **Fortschritt:** XP, 10 Level („Drachen-Ei“ bis „Großmeister-Drache“), 18 Abzeichen, Lernserien (Streaks) und ein Dashboard mit nächster Lektion und Empfehlungen.
- **Konten** nur mit Benutzername und Passwort, ohne E-Mail (Datensparsamkeit bei Kindern). Ohne Konto wird lokal im Browser gespeichert; beim Anmelden werden beide Stände zusammengeführt.
- **Projekte-Galerie:** Projekte speichern, teilen, liken, remixen und melden. Ein einfacher Wortfilter ist eingebaut; Projekte mit 3 Meldungen werden automatisch versteckt.
- **Design:** bunt im Sticker-Look, mit Hell- und Dunkelmodus und responsiv für Handy (Tab-Leiste unten), Tablet und Desktop.
- **Barrierefreiheit:** hohe Kontraste, Tastaturbedienung, „Zum Inhalt springen“, Screenreader-Beschriftungen, 4 Schriftgrößen, gut lesbare Schrift (Atkinson Hyperlegible) und weniger Animationen.

## Schnellstart

Voraussetzung: **Node.js 22.18 oder neuer** (empfohlen: Node 24). Weitere Software ist nicht nötig, auch keine Datenbank, denn SQLite ist in Node eingebaut.

```bash
npm install
```

```bash
npm run dev
```

Dann im Browser **http://localhost:5173** öffnen. Der Befehl startet zwei Programme:

- die Webseite mit Vite auf Port 5173 (lädt bei Änderungen automatisch neu)
- das Backend auf Port 3001 (die Datenbank landet in `server/data/codefunke.db`)

> Beim ersten Start kopiert ein Skript die Laufzeitdateien für Python (Pyodide, ca. 13 MB), Lua und Blockly nach `client/public/`. Ein CDN wird nicht gebraucht.

## Testen

```bash
npm test
```

Führt **69 automatische Tests** aus (Vitest):

- **Inhalte:** Jede Musterlösung aller Aufgaben besteht ihre Prüfung (Python-Lösungen laufen dafür in echtem Pyodide), und kein Startprogramm ist schon von allein richtig. Außerdem werden alle Block-Programme in Lektionen und Quizfragen geprüft.
- **Block-Interpreter, Block-Schreibweise und Python-Übersetzung**
- **Python-Prüfung und Fehlererklärungen**
- **Fortschritt:** Level, Lernserien, Zusammenführen, Abzeichen, Freischalten
- **Server-API:** Konten, CSRF-Schutz, Fortschritt, Projekte, Teilen, Likes, Meldungen, Konto löschen

```bash
npm run build
```

```bash
npm run test:e2e
```

Die **End-to-End-Tests** (Playwright, 11 Tests; dazu 6 für die GitHub-Pages-Variante mit `npm run test:e2e:pages`) laufen in Chromium gegen den gebauten Server: Aufgaben lösen, Python mit Eingaben, Syntaxfehler, Quiz, Dark Mode, Konto und Galerie, Sicherheit der HTML-Vorschau und die Handy-Ansicht. Falls Playwright noch keinen Browser hat:

```bash
npx playwright install chromium
```

```bash
npm run typecheck
```

prüft die TypeScript-Typen von Client und Server.

## Produktiv starten

```bash
npm run build
```

```bash
npm start
```

Die fertige Seite läuft dann auf **http://localhost:3000**. Ein einziger Node-Prozess liefert Webseite und API aus.

### Umgebungsvariablen

| Variable | Bedeutung | Standard |
|---|---|---|
| `PORT` | Port des Servers | `3000` |
| `DATABASE_PATH` | Pfad zur SQLite-Datei | `server/data/codefunke.db` |
| `NODE_ENV` | `production` schaltet sichere Cookies ein (nur HTTPS) | – |
| `COOKIE_SECURE` | `1`/`0` überschreibt die Cookie-Einstellung | aus `NODE_ENV` |
| `TRUST_PROXY` | `1`, wenn ein Reverse-Proxy davorsitzt (Render, Fly, nginx …) | aus |
| `ALLOWED_ORIGINS` | weitere erlaubte Origins (kommagetrennt) | – |

## Veröffentlichen

Es gibt zwei Wege:

| | **GitHub Pages** (kostenlos, ohne Server) | **Mit eigenem Server** |
|---|---|---|
| Lernpfad, Aufgaben, Editor, Python, Quiz, Abzeichen | ✅ | ✅ |
| Fortschritt speichern | im Browser (+ Datei herunterladen/laden) | im Browser **und** im Konto |
| Konten (Anmelden auf mehreren Geräten) | – | ✅ |
| Galerie zum Teilen mit anderen | – | ✅ |
| Kosten / Aufwand | kostenlos, ein Klick | Hosting nötig |

### GitHub Pages

Die Seite wird bei jedem Push auf `main` automatisch gebaut, getestet und veröffentlicht (`.github/workflows/pages.yml`).

1. Auf GitHub ein **neues Repository** anlegen, z. B. `codefunke`. Für ein privates Repository braucht GitHub Pages einen bezahlten Plan; ein öffentliches ist kostenlos.
2. Den Code hochladen:
   ```bash
   git remote add origin https://github.com/DEIN-NAME/codefunke.git
   ```
   ```bash
   git push -u origin main
   ```
3. Im Repository: **Settings → Pages → Build and deployment → Source: „GitHub Actions“** auswählen.
4. Unter **Actions** läuft jetzt „GitHub Pages“. Nach ein paar Minuten ist die Seite unter **`https://DEIN-NAME.github.io/codefunke/`** erreichbar. Falls der erste Lauf vor Schritt 3 gestartet ist: unter Actions → „GitHub Pages“ → **Run workflow** erneut starten.

Was in der GitHub-Pages-Version anders ist:

- Es gibt **keine Konten und keine gemeinsame Galerie**. Fortschritt und eigene Projekte bleiben im Browser. Unter **Profil** kann man den Fortschritt als Datei **herunterladen** und auf einem anderen Gerät wieder **laden**.
- GitHub Pages erlaubt keine eigenen HTTP-Header. Für `input()` und den Stopp-Knopf in Python setzt deshalb ein kleiner **Service Worker** (`client/public/coi-sw.js`) die nötigen Header. Beim allerersten Besuch lädt die Seite dafür einmal kurz neu.
- Direkte Links wie `…/codefunke/lernpfad/1-scratch` funktionieren über eine `404.html`, die die App startet.

Lokal ausprobieren:

```bash
npm run build:pages
```

```bash
npm run preview:pages
```

Dann `http://localhost:4173/` öffnen. Die Variante wird in einen eigenen Ordner gebaut (`client/dist-pages`), damit `npm start` immer die Server-Variante ausliefert. Die Tests für diese Variante (mit Unterordner `/codefunke/` wie auf GitHub) laufen mit:

```bash
npm run test:e2e:pages
```

### Mit eigenem Server

Wichtig für jede Server-Variante:

- **HTTPS** verwenden, denn Anmelde-Cookies sind in Produktion nur über HTTPS gültig.
- Die Datenbank ist **eine Datei**. Sie muss auf einem **dauerhaften Speicher** liegen (Volume/Disk) und sollte regelmäßig gesichert werden.

### Variante A: Docker (z. B. auf einem eigenen Server oder bei Fly.io)

```bash
docker build -t codefunke .
```

```bash
docker run -d -p 3000:3000 -v codefunke-daten:/data -e TRUST_PROXY=1 --name codefunke codefunke
```

Davor gehört ein Reverse-Proxy mit HTTPS, z. B. Caddy (`reverse_proxy localhost:3000`) oder nginx mit Let’s Encrypt.

> Hinweis: Das Dockerfile konnte in dieser Entwicklungsumgebung nicht gebaut werden, weil kein Docker-Daemon lief. Getestet ist die Produktionsstufe: gleiche Dateien, gleiche Installation, Start und Funktionsprobe.

### Variante B: Render.com, Railway o. Ä. (ohne Docker)

1. Code in ein GitHub-Repository hochladen.
2. Neuen **Web Service** anlegen, Node-Version 22.18+ oder 24.
3. Build-Befehl: `npm ci && npm run build`. Start-Befehl: `npm start`.
4. Eine **Persistent Disk** einbinden (z. B. unter `/data`) und `DATABASE_PATH=/data/codefunke.db` setzen.
5. Außerdem `NODE_ENV=production` und `TRUST_PROXY=1` setzen.

### Variante C: Eigener Server (VPS)

Node 24 installieren, Projekt kopieren, dann `npm ci && npm run build`. Den Start übernimmt ein Dienst, z. B. systemd oder pm2 mit `npm start`. Davor kommt nginx oder Caddy mit HTTPS.

### Andere statische Hosts

Die GitHub-Pages-Variante (`npm run build:pages` → `client/dist-pages`) läuft auch auf Netlify, Cloudflare Pages & Co. Für einen Unterordner setzt du beim Bauen `PAGES_BASE`, z. B. `PAGES_BASE=/lernen/`.

## Projektstruktur (kurz)

```
codefunke/
├── client/          React + TypeScript + Tailwind (Vite)
├── server/          Express + SQLite (node:sqlite)
├── shared/          Fortschritts-Logik für Browser und Server
├── content/         Lerninhalte als JSON + Markdown  ← hier neue Kapitel anlegen
├── e2e/             Playwright-Tests (Server-Variante)
├── e2e-pages/       Playwright-Tests (GitHub-Pages-Variante)
├── .github/         Workflow für GitHub Pages
└── docs/            Architektur und Anleitung für neue Inhalte
```

Mehr Details stehen in [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md). Wie man Kapitel, Aufgaben und Stufen ergänzt, erklärt [docs/INHALTE-ERWEITERN.md](docs/INHALTE-ERWEITERN.md).

## Lizenzen der verwendeten Bibliotheken

Blockly (Apache 2.0), Pyodide (MPL 2.0), wasmoon (MIT), CodeMirror (MIT), React (MIT), Express (MIT), Lucide-Icons (ISC), Schriften Fredoka, Nunito, JetBrains Mono und Atkinson Hyperlegible (SIL Open Font License). Maskottchen Funki und alle Lerninhalte sind eigens für dieses Projekt erstellt.
