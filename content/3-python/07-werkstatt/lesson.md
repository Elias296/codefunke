# Projekt-Werkstatt: Alles zusammen

Du kennst jetzt die wichtigsten Bausteine: **Variablen**, **Eingaben**, **Entscheidungen**, **Schleifen**, **Funktionen** und **Listen**. Damit kannst du schon richtige kleine Programme und Spiele bauen! In diesem Kapitel lernst du noch den **Zufall** kennen – und wie man ein Programm plant.

## Zufall mit dem Modul random

Python hat viele fertige Werkzeugkisten, sogenannte **Module**. Mit `import` holst du sie in dein Programm:

```python
import random

wurf = random.randint(1, 6)      # Zufallszahl von 1 bis 6 (beide inklusive)
print("Gewürfelt:", wurf)

farben = ["rot", "grün", "blau"]
print(random.choice(farben))      # ein zufälliger Eintrag
```

Führ das Beispiel mehrmals aus – jedes Mal kommt etwas anderes heraus!

## Programme planen: Eingabe – Verarbeitung – Ausgabe

Bevor du losschreibst, überleg dir in drei Schritten:

1. **Eingabe:** Was muss das Programm wissen? (`input`)
2. **Verarbeitung:** Was muss es rechnen oder entscheiden? (`if`, Schleifen, Funktionen)
3. **Ausgabe:** Was soll am Ende angezeigt werden? (`print`)

Und dann: **in kleinen Schritten bauen und oft testen**. Ein Stück schreiben, ausführen, prüfen – dann das nächste Stück.

## Beispiel: Zahlenraten

```python
import random

geheim = random.randint(1, 20)
versuche = 0

while True:
    tipp = int(input("Dein Tipp (1–20): "))
    versuche += 1
    if tipp < geheim:
        print("Zu klein!")
    elif tipp > geheim:
        print("Zu groß!")
    else:
        print(f"Richtig! Du hast {versuche} Versuche gebraucht.")
        break
```

Siehst du alle Bausteine? Modul, Variablen, Schleife, Eingabe, Entscheidung und Ausgabe – alles in einem kleinen Spiel.

> **Tipp:** Beim Testen ist Zufall lästig, weil jedes Mal etwas anderes passiert. Setz die Geheimzahl zum Testen fest, z. B. `geheim = 13` – und erst wenn alles klappt, wieder auf Zufall.
