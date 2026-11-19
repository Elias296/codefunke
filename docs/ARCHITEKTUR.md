# Architektur & Umsetzungsplan

## Überblick

```
┌──────────────────────────── Browser ─────────────────────────────┐
│  React-App (Vite, TypeScript, Tailwind)                          │
│   ├─ Lernpfad, Kapitel, Quiz, Projekte, Profil, Dashboard        │
│   ├─ Block-Editor: Blockly + eigener Interpreter + Canvas-Bühne  │
│   ├─ Code-Editor: CodeMirror 6                                   │
│   │    ├─ Python  → Web Worker mit Pyodide (WebAssembly)         │
│   │    ├─ Lua     → Web Worker mit wasmoon (WebAssembly)         │
│   │    └─ HTML/JS → sandbox-iframe (preview.html)                │
│   └─ Fortschritt (zustand) → localStorage  ⇄  /api/progress      │
└───────────────────────────────┬──────────────────────────────────┘
                                │ JSON über HTTPS (Cookie-Sitzung)
┌───────────────────────────────┴──────────────────────────────────┐
│  Node.js-Server (Express 5)                                      │
│   ├─ /api/auth      Registrieren, Anmelden, Abmelden, Löschen    │
│   ├─ /api/progress  Fortschritt speichern (wird zusammengeführt) │
│   ├─ /api/projects  Projekte, Teilen, Likes, Meldungen           │
│   └─ liefert client/dist mit Sicherheits-Headern aus             │
│  SQLite (node:sqlite, eine Datei)                                │
└──────────────────────────────────────────────────────────────────┘
```

**Wichtigster Grundsatz:** Code von Lernenden läuft **nur im Browser**, nie auf dem Server.

## Ordnerstruktur

```
codefunke/
├── package.json              npm-Workspaces (client, server) + Skripte
├── content/                  ★ Lerninhalte (JSON + Markdown)
│   ├── badges.json           Abzeichen und ihre Bedingungen
│   ├── 1-scratch/            Stufe 1: stage.json + 6 Kapitel
│   ├── 2-uebergang/          Stufe 2: nur stage.json ("bald")
│   ├── 3-python/             Stufe 3: stage.json + 7 Kapitel
│   └── 4-web/ 5-lua/ 6-java/ geplante Stufen
├── shared/progress.ts        XP, Level, Serien, Zusammenführen, Abzeichen (Browser + Server)
├── client/
│   ├── public/               preview.html, theme-init.js (+ kopierte Pyodide/Lua/Blockly-Dateien)
│   ├── scripts/              copy-runtime-assets.mjs
│   └── src/
│       ├── content/          types.ts (Datenmodell), loader.ts (lädt /content)
│       ├── components/       Layout, Funki (Maskottchen), UI-Bausteine
│       ├── features/
│       │   ├── blocks/       blockSpecs, dsl, runtime, checks, pythonGen, Blockly-Anbindung, Bühne
│       │   ├── code/         CodeEditor, Konsole, Turtle, CodeWorkbench
│       │   ├── runners/      python/ (Worker, Harness, Fehlerhilfe, Prüfung), lua/, web/, java/
│       │   ├── lesson/       Aufgaben, Hinweise, Quiz, Projekt
│       │   ├── progress/     Speicher, Freischalten, Empfehlungen
│       │   └── projects/     Projekte lokal/Server
│       ├── pages/            eine Datei pro Seite
│       └── stores/           Einstellungen, Konto, Benachrichtigungen
├── server/src/               index.ts, app.ts, db.ts, auth.ts, security.ts, routes/
├── e2e/                      Playwright-Tests
└── docs/
```

## Entscheidungen und Gründe

| Thema | Entscheidung | Warum |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind 4 | schnell, verbreitet, gut erweiterbar; kein Server-Rendering nötig |
| Backend | Express 5 + **node:sqlite** | keine nativen Pakete, keine extra Datenbank, eine Datei → einfach zu hosten und zu sichern |
| Server-Code | läuft direkt als `.ts` (Node Type-Stripping) | kein Build-Schritt für den Server |
| Scratch-Stufe | **Blockly** mit eigenen deutschen Blöcken statt Scratch-GUI | Scratch-GUI ist sehr groß, schwer einzubetten und lässt sich nicht automatisch prüfen. Mit eigenen Blöcken haben wir volle Kontrolle über Prüfung, Toolbox pro Aufgabe und die Python-Übersetzung (Stufe 2). |
| Block-Ausführung | eigener Interpreter auf dem Blockly-JSON | kein `eval`, kann den Browser nicht einfrieren (Schleifen pausieren pro Tick), läuft ohne Bildschirm → Prüfung in Millisekunden |
| Python | Pyodide im **Web Worker**, selbst gehostet | keine CDN-Abhängigkeit, Endlosschleifen blockieren nie die Seite |
| `input()` | SharedArrayBuffer + `Atomics.wait` | echtes, blockierendes `input()` wie in „richtigem“ Python; benötigt Cross-Origin-Isolation (Header siehe unten). Fallback: Eingaben vorab eintragen. |
| Turtle | eigenes `turtle`-Modul in Python | das Original braucht ein Desktop-Fenster; unseres rechnet in Python und schickt Zeichenbefehle an ein Canvas – und merkt sich die Linien für Prüfungen |
| Konten | nur Benutzername + Passwort | keine E-Mail-Adressen von Kindern (Datensparsamkeit) |
| Fortschritt | Mengen von Abschlüssen statt Zählern | lässt sich verlustfrei zusammenführen (Gast → Konto, mehrere Geräte) |
| Inhalte | JSON + Markdown in `/content`, beim Build eingelesen | leicht zu bearbeiten, versionierbar, automatisch testbar |

## Sicherheit

**Code-Ausführung**
- Python und Lua laufen in **Web Workern**. Vor dem ersten Programm werden `fetch`, `XMLHttpRequest`, `WebSocket`, `importScripts` usw. aus dem Worker entfernt (`runners/lockdown.ts`). Ein geteiltes Projekt kann also keine Daten verschicken.
- HTML/CSS/JS läuft in `preview.html` in einem `<iframe sandbox="allow-scripts allow-modals allow-forms">`, also **ohne** `allow-same-origin`. Das Skript hat eine eigene, leere Origin und keinen Zugriff auf Cookies, localStorage oder die App. Die Seite hat zusätzlich eine eigene CSP mit `connect-src 'none'`.
- Block-Programme werden interpretiert, nicht als JavaScript ausgeführt.

**Server**
- Passwörter mit **scrypt** (Salt, N = 16384), Vergleich in konstanter Zeit, gleiche Antwortzeit auch bei unbekannten Namen.
- Sitzungen: zufälliges 256-Bit-Token im `httpOnly`-, `SameSite=Lax`-Cookie (in Produktion `Secure`). In der Datenbank liegt nur der SHA-256-Hash.
- **CSRF-Schutz:** Ändernde Anfragen brauchen den Header `X-Codefunke: 1` (fremde Seiten können ihn ohne CORS nicht setzen), und ein `Origin`-Header muss zur eigenen Seite passen.
- Rate-Limits für Anmelden/Registrieren, Projekte und Meldungen. Größenlimits für alle Eingaben. Fortschritt wird serverseitig geprüft und bereinigt (`sanitizeProgress`).
- Header: Content-Security-Policy, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, sowie **COOP `same-origin` + COEP `credentialless`** für SharedArrayBuffer.

**Kinderschutz**
- Kein Klarname, keine E-Mail. Der Hinweis beim Registrieren rät zu Spitznamen.
- Wortfilter für Benutzernamen und geteilte Titel (`server/src/moderation.ts`).
- Melden-Knopf in der Galerie; ab 3 Meldungen wird ein Projekt automatisch versteckt. Für eine öffentliche Plattform mit vielen Kindern sollte zusätzlich **ein Mensch moderieren**. Die Meldungen stehen in der Tabelle `project_reports`.

## Statische Variante (GitHub Pages)

`npm run build:pages` baut mit `VITE_STATIC=1` und dem Basis-Pfad aus `PAGES_BASE` nach `client/dist-pages`:

- `lib/env.ts → STATIC_MODE`: `api()` macht dann gar keine Anfragen, die App verhält sich wie „kein Server“ (Fortschritt und Projekte lokal, Anmelden und Galerie werden ausgeblendet bzw. erklärt). Im Profil kann der Fortschritt als Datei exportiert und importiert werden – der Import führt zusammen, statt zu ersetzen.
- `lib/isolation.ts` + `public/coi-sw.js`: GitHub Pages kann keine Header setzen. Der Service Worker ergänzt COOP/COEP (Chrome/Firefox: `credentialless`, Safari: `require-corp`) und die Seite lädt beim ersten Besuch einmal neu. Danach ist `crossOriginIsolated` aktiv – `input()` und Stopp funktionieren wie mit Server.
- Die HTML-Vorschau nutzt hier `srcdoc` statt `preview.html` (das sandbox-iframe würde sonst ohne COEP-Header blockiert). Sie bleibt durch `sandbox` ohne `allow-same-origin` abgeschottet.
- `404.html` ist eine Kopie von `index.html`: So startet die App auch bei direkten Links und der React-Router (mit `basename`) zeigt die richtige Seite.

## Datenfluss beim Prüfen einer Aufgabe

1. **Block-Aufgabe:** `checkBlocksTask()` prüft erst typische Fehler (kein Startblock, lose Blöcke, leere Bedingung). Dann simuliert der Interpreter das Programm ohne Bildschirm, mit festem Zufalls-Startwert und simulierten Tasten und Klicks aus `run.steps`. Zuletzt werden die `checks` gegen den Endzustand geprüft.
2. **Python-Aufgabe:** `checkCodeTask()` bündelt alle Prüfungen nach Eingaben. Jede Eingabe-Kombination läuft genau einmal im Worker (`_cf_run_checks` im Harness): Die Ausgabe wird abgefangen, danach laufen die `assert`-Tests im selben Namensraum. Fehler werden mit `explainError()` in freundliche deutsche Sätze übersetzt, inklusive Zeilennummer, die im Editor markiert wird. Nach 8 Sekunden gibt es ein Zeitlimit, und der Worker wird neu gestartet.

## Weitere Stufen ergänzen

### Stufe 2 (Übergang Blöcke → Python)
Alles Nötige ist vorhanden:
- In Lektionen zeigt ein Code-Block ```` ```blocks-python ```` Blöcke und Python **nebeneinander**.
- In Block-Aufgaben blendet `"showPython": true` die Python-Übersetzung von Anfang an ein.
- Vorgehen: Kapitel anlegen (siehe [INHALTE-ERWEITERN.md](INHALTE-ERWEITERN.md)), in `content/2-uebergang/stage.json` den Status auf `"verfuegbar"` setzen, `chapters` und `finalTest` ergänzen. Python ist danach automatisch erst nach Stufe 2 frei.
- Optionaler Ausbau: ein Python-Modul `funki`, das die Bühne aus Python steuert (die Funktionsnamen in `pythonGen.ts` sind dafür schon passend gewählt).

### Stufe 4 (HTML/CSS/JS)
- Editor und Live-Vorschau funktionieren (`language: "web"`, Code als JSON `{"html","css","js"}`).
- Für automatische Prüfungen fehlt noch ein Prüftyp, z. B. `{"type": "dom", "selector": "h1", "text": "…"}`. Umsetzung: `preview.html` führt nach dem Rendern Prüfungen aus und meldet das Ergebnis per `postMessage` zurück (analog zur Konsole).

### Stufe 5 (Lua)
- Lua läuft (`runners/lua`). Für Aufgaben `checkCodeTask` um einen Lua-Runner erweitern: Ausgabe mit Eingaben vergleichen funktioniert genauso wie bei Python. `luaWorker.ts` braucht dafür einen „Prüf“-Modus, der die Ausgabe sammelt.

### Java nachrüsten
`runners/java/javaRunner.ts` hat bereits die Schnittstelle (`runJava(code) → { ok, output, error }`). Zwei Wege:
1. **CheerpJ** (JVM als WebAssembly, läuft komplett im Browser): `cheerpjInit()`, dann `javac` aus dem JDK-Bundle aufrufen und die Klasse starten. Vorher die Lizenzbedingungen für Bildungsprojekte prüfen.
2. **Isolierte Sandbox-API** wie eine selbst gehostete **Piston**- oder **Judge0**-Instanz in einem Container ohne Netzwerk, mit CPU-, Speicher- und Zeitlimits. Der Codefunke-Server leitet nur weiter und führt selbst nie Code aus.

## Mögliche nächste Schritte

- Stufen 2, 4, 5, 6 mit Inhalten füllen (siehe oben).
- Lehrkräfte-Ansicht: Klassen anlegen und den Fortschritt der Klasse sehen.
- Moderations-Oberfläche für gemeldete Projekte.
- Offline-Modus (Service Worker), damit Pyodide nach dem ersten Laden nicht erneut geladen werden muss.
- Weitere Figuren und Klänge für die Block-Bühne.
