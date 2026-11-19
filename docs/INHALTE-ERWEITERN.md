# Lerninhalte erweitern

Alle Inhalte liegen im Ordner **`content/`** als JSON- und Markdown-Dateien. Du musst dafür keinen Programmcode ändern. Neue Dateien werden beim nächsten `npm run dev` oder `npm run build` automatisch eingelesen.

> **Nach jeder Änderung:** `npm run check:content` ausführen. Der Test prüft, ob jede Musterlösung ihre eigenen Prüfungen besteht, ob kein Startprogramm schon richtig ist und ob alle Block-Programme gültig sind.

## Aufbau

```
content/
├── badges.json                  Abzeichen
└── 1-scratch/                   eine Stufe (Ordnername = ID)
    ├── stage.json               Stufe: Titel, Farbe, Reihenfolge der Kapitel, Abschlusstest
    └── 01-bewegung/             ein Kapitel (Ordnername = ID)
        ├── lesson.md            Erklärung (Markdown)
        └── chapter.json         Aufgaben, Quiz, Projekt
```

Neues Kapitel in drei Schritten:

1. Ordner `content/<stufe>/<nr-name>/` anlegen.
2. `lesson.md` und `chapter.json` hineinlegen. Am einfachsten kopierst du ein vorhandenes Kapitel.
3. Die Kapitel-ID in `stage.json` unter `"chapters"` eintragen.

Felder mit **Text** dürfen ein String **oder eine Liste von Zeilen** sein. Bei Code ist die Liste viel lesbarer:

```json
"solution": [
  "for i in range(3):",
  "    print(i)"
]
```

## stage.json

```json
{
  "order": 2,
  "title": "Von Blöcken zu Text",
  "short": "Übergang",
  "subtitle": "Gleicher Code, zwei Schreibweisen",
  "description": "…",
  "language": "blocks",
  "color": "var(--color-stage-bridge)",
  "icon": "shuffle",
  "status": "verfuegbar",
  "chapters": ["01-bloecke-lesen", "02-einrueckung"],
  "finalTest": { "title": "Abschlusstest", "intro": "…", "passScore": 0.7, "questions": [ … ] }
}
```

- `status`: `"verfuegbar"` oder `"bald"`. Stufen mit „bald“ erscheinen im Lernpfad mit den geplanten Kapiteln (`"planned": [{ "title", "summary" }]`).
- **Freischalten:** Eine Stufe ist frei, wenn der Abschlusstest der vorherigen *verfügbaren* Stufe bestanden ist. Stufen mit „bald“ werden dabei übersprungen.
- `color`: CSS-Farbe. Fertige Variablen sind `--color-stage-scratch`, `-bridge`, `-python`, `-web`, `-lua` und `-java`.
- `icon`: Name aus `client/src/components/ui/Icon.tsx` (z. B. `blocks`, `terminal`, `globe`, `moon`, `coffee`, `repeat`, `branch`, `variable`, `function`, `list`, `rocket`, `gamepad`, `keyboard`, `footprints`).

## chapter.json

```json
{
  "title": "Schleifen",
  "summary": "Wiederholen statt abschreiben.",
  "icon": "repeat",
  "tasks": [ … 3 bis 5 Aufgaben … ],
  "quiz": { "questions": [ … ] },
  "project": { … }
}
```

### Aufgaben – gemeinsame Felder

| Feld | Bedeutung |
|---|---|
| `id` | eindeutig im Kapitel (nicht mehr ändern, sonst geht der Fortschritt verloren) |
| `kind` | `"blocks"` oder `"code"` |
| `title`, `instructions` | Titel und Aufgabentext (Markdown) |
| `difficulty` | 1 = leicht, 2 = mittel, 3 = knifflig (XP = 10 × Schwierigkeit, außer `xp` ist gesetzt) |
| `hints` | **genau zwei** Hinweise: Tipp und größerer Tipp. Die dritte Stufe ist automatisch die Lösung. |
| `solution` | Musterlösung (wird beim Test automatisch geprüft) |
| `starter` | Startprogramm |
| `success` | optional: eigene Lob-Nachricht |

### Block-Aufgaben (`"kind": "blocks"`)

```json
{
  "id": "quadrat", "kind": "blocks", "title": "Das Quadrat", "difficulty": 1,
  "instructions": "Male ein Quadrat …",
  "toolbox": ["event_flag", "motion_move", "motion_turn_right", "control_repeat", "pen_down"],
  "starter": "wenn_start",
  "stage": { "x": 0, "y": 0, "direction": 90, "grid": true, "star": { "x": 150, "y": 0 } },
  "run": { "steps": [{ "flag": true }], "maxTicks": 2400 },
  "checks": [
    { "type": "penSegments", "min": 4, "max": 4, "message": "Ein Quadrat hat 4 Seiten – Funki hat {actual} gemalt." },
    { "type": "closedShape", "message": "Die Form ist nicht geschlossen." }
  ],
  "hints": ["…", "…"],
  "solution": ["wenn_start", "  stift_runter", "  wiederhole 4", "    gehe 100", "    drehe_rechts 90"]
}
```

- `toolbox`: Welche Blöcke es gibt. Weniger Blöcke lenken weniger ab. Ohne `toolbox` stehen alle Blöcke zur Verfügung.
- `stage`: Startzustand der Bühne. `star: false` blendet den Stern aus.
- `run.steps`: Was beim Prüfen simuliert wird, z. B. `{ "flag": true }`, `{ "key": "rechts", "ticks": 10 }` (Taste 10 Ticks halten) oder `{ "click": true, "ticks": 3 }`. Ein Tick ist 1/60 Sekunde. Endlose Programme werden nach `maxTicks` angehalten.
- `showPython: true` blendet die Python-Übersetzung sofort ein (für Stufe 2).

**Prüfungen für Blöcke** (`message` darf Platzhalter enthalten):

| Typ | Felder | prüft … |
|---|---|---|
| `hasBlock` | `block`, `min` | ob ein Block (mindestens `min`-mal) benutzt wurde |
| `blockCount` | `block`?, `min`?, `max`? | Anzahl eines Blocks (ohne `block`: alle Befehlsblöcke) – `{actual}` |
| `position` | `x`?, `y`?, `tolerance`? | Funkis Endposition – `{x}`, `{y}` |
| `direction` | `value` | Funkis Blickrichtung – `{actual}` |
| `said` | `text` | ob Funki irgendwann etwas mit diesem Text gesagt hat (`""` = irgendetwas) |
| `variable` | `name`, `equals`?, `min`? | Wert einer Variable – `{actual}` |
| `penSegments` | `min`, `max`? | Anzahl gemalter Linien – `{actual}` |
| `closedShape` | – | ob die gemalte Form geschlossen ist |
| `moved` | – | ob Funki sich bewegt hat |
| `state` | `path`, `equals`?/`min`?/`max`? | beliebiger Wert, z. B. `sprite.size`, `star.visible`, `variables.punkte` |

Vor allen Prüfungen erkennt Codefunke automatisch typische Fehler: einen fehlenden Startblock, lose Blöcke und leere Bedingungen.

### Code-Aufgaben (`"kind": "code"`)

```json
{
  "id": "gerade", "kind": "code", "language": "python", "title": "Gerade oder ungerade?", "difficulty": 2,
  "instructions": "…",
  "starter": "zahl = int(input(\"Gib eine Zahl ein: \"))\n",
  "checks": [
    { "type": "code", "pattern": "%\\s*2", "message": "Benutze den Rest-Operator." },
    { "type": "output", "inputs": ["4"], "expected": "4 ist gerade.", "match": "contains" },
    { "type": "assert", "code": "assert ist_gerade(3) == False", "message": "ist_gerade(3) soll False sein." }
  ],
  "hints": ["…", "…"],
  "solution": [ "…" ]
}
```

**Prüfungen für Code:**

| Typ | Felder | prüft … |
|---|---|---|
| `output` | `expected`, `inputs`?, `match`? (`exact`/`contains`/`regex`), `ignoreCase`? | die Ausgabe. Leerzeichen am Zeilenende werden ignoriert. Bei `regex` passen `^`/`$` auf jede Zeile. Ohne `message` erzeugt Codefunke selbst Tipps wie „Achte auf Groß- und Kleinschreibung“. |
| `assert` | `code`, `message`, `inputs`? | Python-Code, der **nach** dem Programm im selben Namensraum läuft. `__output__` enthält die Ausgabe, `turtle._segments` die Turtle-Linien. |
| `code` | `pattern`, `negate`?, `message` | ein Muster (Regex) im Quelltext. Kommentare werden vorher entfernt. Mit `negate: true` darf das Muster **nicht** vorkommen. |
| `noError` | `inputs`? | das Programm läuft ohne Fehler |

**Wichtig zu Eingaben:** Beim Prüfen werden die `inputs` der Reihe nach an `input()` gegeben. Wie in einem echten Terminal stehen sie danach auch in der Ausgabe (`Wie heißt du? Ada`). Nutze darum für Ausgaben mit Eingaben meist `"match": "contains"`.

Laufzeit- und Syntaxfehler im Programm werden immer zuerst gemeldet, mit einer deutschen Erklärung und Markierung der Zeile (siehe `client/src/features/runners/python/errorHelp.ts`).

## Quizfragen

```json
{ "type": "single",   "question": "…", "options": ["A", "B", "C"], "answer": 1, "explanation": "…" }
{ "type": "multiple", "question": "…", "options": ["A", "B", "C"], "answer": [0, 2] }
{ "type": "text",     "question": "…", "answer": ["90", "90 Grad"], "placeholder": "Zahl" }
{ "type": "order",    "question": "Bring die Zeilen in die richtige Reihenfolge.", "lines": ["erste", "zweite", "dritte"] }
```

- `answer` zählt bei `single`/`multiple` ab **0**.
- `text`: Groß/Klein und doppelte Leerzeichen sind egal (außer bei `"caseSensitive": true`).
- `order`: `lines` in der **richtigen** Reihenfolge. Codefunke mischt sie selbst.
- Zu jeder Frage kann `"code"` (mit `"codeLanguage"`) oder `"blocks"` (Block-Schreibweise) angezeigt werden.
- Ein Kapitel-Quiz gilt ab 60 % als bestanden. Für den Abschlusstest gilt `passScore`.

## Projekt am Kapitelende

```json
"project": {
  "title": "Muster-Maler",
  "kind": "blocks",
  "description": "…",
  "starter": "wenn_start",
  "toolbox": ["…"],
  "requirements": ["Mindestens eine Schleife.", "Mindestens zwei Farben."],
  "checks": [ … wie bei Aufgaben, optional … ],
  "ideas": ["…"],
  "example": [ "… Beispiellösung – wird nicht angezeigt, aber automatisch getestet …" ]
}
```

Bei Code-Projekten zusätzlich `"kind": "code", "language": "python"`. Ohne `checks` wird das Projekt abgeschlossen, sobald alle Punkte der Checkliste abgehakt sind.

## Lektionen (lesson.md)

Normales Markdown (inklusive Tabellen) mit diesen Extras:

| Code-Block | Darstellung |
|---|---|
| ```` ```python ```` | hervorgehobener Code mit **Ausprobieren**-Knopf (öffnet den Editor) |
| ```` ```blocks ```` | echte Blöcke (in Block-Schreibweise geschrieben) |
| ```` ```blocks-python ```` | Blöcke und Python **nebeneinander** (für Stufe 2) |
| ```` ```output ```` | „So sieht die Ausgabe aus“ |
| `> **Tipp:** …` | gelber Hinweis-Kasten |

## Block-Schreibweise

Block-Programme schreibt man in den Inhalten als einfachen Text:

```
wenn_start
  stift_runter
  setze punkte 0
  wiederhole 4
    gehe 100
    drehe_rechts 90
    ändere punkte 1
  falls (> punkte 3)
    sage "Fertig!"
  sonst
    sage (verbinde "Punkte: " punkte)
```

Regeln:

- Jede Zeile ist ein Block: Schlüsselwort und Eingaben.
- **Einrückung** (2 Leerzeichen) heißt „steckt im Block darüber“. Bei Startblöcken ist es das Programm darunter.
- `sonst` direkt nach einem `falls` macht daraus „falls … sonst“.
- Zahlen schreibt man direkt (`10`, `-5`, `0.5`), Texte in `"Anführungszeichen"`.
- Wert-Blöcke kommen in Klammern: `(x)`, `(zufall 1 6)`, `(+ (x) 10)`, `(berührt_rand)`.
- Ein einzelnes Wort an einer Zahl- oder Textstelle ist eine **Variable**, z. B. `gehe schritte`.
- Zeilen mit `#` sind Kommentare.

**Tipp:** Ein Programm lässt sich auch im Block-Editor bauen. Die Funktion `toDsl()` in `client/src/features/blocks/dsl.ts` wandelt es zurück in diese Schreibweise.

### Alle Blöcke

Die folgende Tabelle wird mit `node scripts/blocks-table.mjs` aus `blockSpecs.ts` erzeugt.

| Kategorie | Block | Schreibweise | Typ (für toolbox/checks) |
|---|---|---|---|
| Ereignisse | Wenn ▶ angeklickt | `wenn_start` | `event_flag` |
| Ereignisse | Wenn Taste [KEY] gedrückt | `wenn_taste KEY:…` | `event_key` |
| Ereignisse | Wenn Funki angeklickt | `wenn_angeklickt` | `event_click` |
| Bewegung | gehe [STEPS] Schritte | `gehe steps` | `motion_move` |
| Bewegung | drehe dich ↻ um [DEGREES] Grad | `drehe_rechts degrees` | `motion_turn_right` |
| Bewegung | drehe dich ↺ um [DEGREES] Grad | `drehe_links degrees` | `motion_turn_left` |
| Bewegung | gehe zu x: [X] y: [Y] | `gehe_zu x y` | `motion_goto` |
| Bewegung | gehe zu zufälliger Position | `gehe_zufall` | `motion_goto_random` |
| Bewegung | gleite in [SECS] Sek. zu x: [X] y: [Y] | `gleite secs x y` | `motion_glide` |
| Bewegung | setze Richtung auf [DIR] Grad | `richtung dir` | `motion_point` |
| Bewegung | ändere x um [DX] | `ändere_x dx` | `motion_change_x` |
| Bewegung | setze x auf [X] | `setze_x x` | `motion_set_x` |
| Bewegung | ändere y um [DY] | `ändere_y dy` | `motion_change_y` |
| Bewegung | setze y auf [Y] | `setze_y y` | `motion_set_y` |
| Bewegung | pralle vom Rand ab | `pralle_ab` | `motion_bounce` |
| Bewegung | x-Position | `(x)` | `motion_x` |
| Bewegung | y-Position | `(y)` | `motion_y` |
| Bewegung | Richtung | `(richtung?)` | `motion_direction` |
| Aussehen | sage [TEXT] für [SECS] Sekunden | `sage_für text secs` | `looks_say_secs` |
| Aussehen | sage [TEXT] | `sage text` | `looks_say` |
| Aussehen | setze Größe auf [SIZE] % | `größe size` | `looks_set_size` |
| Aussehen | ändere Größe um [CHANGE] | `ändere_größe change` | `looks_change_size` |
| Aussehen | setze Farbe auf [COLOR] | `farbe COLOR:…` | `looks_color` |
| Aussehen | setze Hintergrund auf [COLOR] | `hintergrund COLOR:…` | `looks_background` |
| Aussehen | zeige dich | `zeige_dich` | `looks_show` |
| Aussehen | verstecke dich | `verstecke_dich` | `looks_hide` |
| Steuerung | warte [SECS] Sekunden | `warte secs` | `control_wait` |
| Steuerung | wiederhole [TIMES] mal [DO] | `wiederhole times` | `control_repeat` |
| Steuerung | wiederhole fortlaufend [DO] | `wiederhole_immer` | `control_forever` |
| Steuerung | falls [COND] dann [DO] | `falls cond` | `control_if` |
| Steuerung | falls [COND] dann [DO] sonst [ELSE] | `falls_sonst cond` | `control_if_else` |
| Steuerung | wiederhole bis [COND] [DO] | `wiederhole_bis cond` | `control_repeat_until` |
| Steuerung | stoppe alles | `stoppe` | `control_stop` |
| Fühlen | wird Rand berührt? | `(berührt_rand)` | `sensing_touching_edge` |
| Fühlen | wird Stern berührt? | `(berührt_stern)` | `sensing_touching_star` |
| Fühlen | Taste [KEY] gedrückt? | `(taste KEY:…)` | `sensing_key` |
| Fühlen | Stoppuhr | `(stoppuhr)` | `sensing_timer` |
| Stern | setze Stern an zufällige Position | `stern_zufall` | `star_random` |
| Stern | setze Stern auf x: [X] y: [Y] | `stern_zu x y` | `star_goto` |
| Stern | zeige Stern | `stern_zeigen` | `star_show` |
| Stern | verstecke Stern | `stern_verstecken` | `star_hide` |
| Operatoren | [A] + [B] | `(+ a b)` | `op_add` |
| Operatoren | [A] − [B] | `(- a b)` | `op_sub` |
| Operatoren | [A] × [B] | `(* a b)` | `op_mul` |
| Operatoren | [A] ÷ [B] | `(/ a b)` | `op_div` |
| Operatoren | Zufallszahl von [FROM] bis [TO] | `(zufall from to)` | `op_random` |
| Operatoren | [A] < [B] | `(< a b)` | `op_lt` |
| Operatoren | [A] = [B] | `(= a b)` | `op_eq` |
| Operatoren | [A] > [B] | `(> a b)` | `op_gt` |
| Operatoren | [A] und [B] | `(und a b)` | `op_and` |
| Operatoren | [A] oder [B] | `(oder a b)` | `op_or` |
| Operatoren | nicht [A] | `(nicht a)` | `op_not` |
| Operatoren | verbinde [A] und [B] | `(verbinde a b)` | `op_join` |
| Operatoren | [A] Rest von ÷ [B] | `(rest a b)` | `op_mod` |
| Variablen | setze [VAR] auf [VALUE] | `setze var value` | `data_set` |
| Variablen | ändere [VAR] um [VALUE] | `ändere var value` | `data_change` |
| Variablen | [VAR] | `(var var)` | `data_get` |
| Malstift | Stift runter | `stift_runter` | `pen_down` |
| Malstift | Stift hoch | `stift_hoch` | `pen_up` |
| Malstift | setze Stiftfarbe auf [COLOR] | `stiftfarbe COLOR:…` | `pen_color` |
| Malstift | setze Stiftdicke auf [SIZE] | `stiftdicke size` | `pen_size` |
| Malstift | lösche alles | `lösche_alles` | `pen_clear` |

Tasten (`KEY`): `leertaste`, `oben`, `unten`, `links`, `rechts`, `a` … `z`.
Farben (`COLOR`): `orange`, `rot`, `blau`, `grün`, `gelb`, `lila`, `pink`, `schwarz`, `weiß`, `türkis`.

### Neue Blöcke hinzufügen

1. In `client/src/features/blocks/blockSpecs.ts` einen Eintrag in `BLOCKS` anlegen (Typ, Kategorie, Schlüsselwort, Beschriftung, Form).
2. In `runtime.ts` das Verhalten ergänzen: Befehle kommen in `exec()`, Werte in `evaluate()`.
3. In `pythonGen.ts` die Python-Übersetzung ergänzen.
4. Mit `npm test` prüfen.

## Abzeichen (badges.json)

```json
{ "id": "serie-7", "title": "Wochen-Flamme", "description": "7 Tage hintereinander gelernt.", "icon": "flame", "color": "#ff6b35",
  "condition": { "type": "streak", "count": 7 } }
```

Mögliche Bedingungen: `tasksCompleted`, `perfectQuizzes`, `noHintTasks`, `streak`, `projectsCompleted`, `projectsSaved`, `projectsShared`, `errorsFixed`, `codeRuns`, `xp`, `level` (jeweils mit `count`), `stagePassed` (mit `stage`) und `itemsCompleted` (mit `prefix` und `count`).
