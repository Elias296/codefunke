# Funki bewegt sich

Ein **Programm** ist eine Liste von Befehlen. Der Computer führt sie **genau** so aus, wie du sie hinschreibst – Schritt für Schritt, von oben nach unten. Er denkt nicht mit! Darum ist die **Reihenfolge** so wichtig.

Bei uns sind die Befehle bunte **Blöcke**. Du steckst sie zusammen wie Puzzleteile – so wie in Scratch.

## Der Startblock

Jedes Programm braucht einen Anfang. Der gelbe Block **„Wenn ▶ angeklickt“** startet alles, was darunter hängt, sobald du auf **▶ Start** klickst.

```blocks
wenn_start
  gehe 100
```

Funki läuft 100 Schritte in die Richtung, in die er schaut – am Anfang ist das nach rechts.

## Die Bühne und ihre Koordinaten

Die Bühne ist wie ein großes Blatt Kästchenpapier. Jeder Punkt hat zwei Zahlen:

- **x** sagt, wie weit links oder rechts: von **-240** (ganz links) bis **240** (ganz rechts)
- **y** sagt, wie weit unten oder oben: von **-180** (ganz unten) bis **180** (ganz oben)

Die Mitte ist **x: 0, y: 0**. Schalte über der Bühne das **Gitter** ein – dann siehst du die Koordinaten!

## Drehen

Mit „drehe dich ↻ um … Grad“ dreht sich Funki im Uhrzeigersinn. Eine Vierteldrehung sind **90 Grad**, eine halbe Drehung **180 Grad**, einmal ganz herum **360 Grad**.

| Richtung | Funki schaut … |
|---|---|
| 90 | nach rechts → |
| 0 | nach oben ↑ |
| -90 | nach links ← |
| 180 | nach unten ↓ |

```blocks
wenn_start
  gehe 100
  drehe_links 90
  gehe 50
```

Funki läuft erst nach rechts, dreht sich nach links (jetzt schaut er nach oben) und läuft dann 50 Schritte nach oben.

> **Tipp:** Klick über der Bühne auf **🐌 Langsam**. Dann führt Funki jeden Block einzeln aus und der aktuelle Block leuchtet auf. So siehst du genau, was dein Programm macht!

## Springen, gleiten, sprechen

- **„gehe zu x: … y: …“** setzt Funki sofort an eine Stelle.
- **„gleite in … Sek. zu x: … y: …“** bewegt ihn langsam dorthin.
- **„sage … für … Sekunden“** zeigt eine Sprechblase.

```blocks
wenn_start
  gehe_zu -150 0
  gleite 2 150 0
  sage_für "Huiii!" 2
```

## Merke dir

- Ein Programm ist eine Folge von Befehlen – die **Reihenfolge** zählt.
- **x** = links/rechts, **y** = unten/oben, die Mitte ist **(0 | 0)**.
- 90 Grad sind eine Vierteldrehung.
