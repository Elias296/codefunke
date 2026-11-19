# Funktionen: Eigene Befehle bauen

Du kennst schon viele Funktionen: `print()`, `input()`, `int()`, `range()`. Jetzt baust du **eigene**! Eine Funktion ist ein Stück Code mit einem **Namen**, das du immer wieder aufrufen kannst.

## Eine Funktion definieren

```python
def begruessung():
    print("Hallo!")
    print("Schön, dass du da bist.")

begruessung()
begruessung()
```

- `def` heißt „definiere“ – danach kommt der **Name**, runde Klammern und ein **Doppelpunkt**.
- Der eingerückte Teil ist der **Körper** der Funktion.
- Die Funktion läuft erst, wenn du sie **aufrufst**: `begruessung()`.

## Parameter: Werte mitgeben

In die Klammern kannst du **Parameter** schreiben. Das sind Variablen, die beim Aufruf einen Wert bekommen:

```python
def hallo(name):
    print(f"Hallo, {name}!")

hallo("Ada")
hallo("Funki")
```

Mehrere Parameter trennst du mit Kommas:

```python
def rechteck(breite, hoehe):
    print(f"Ein Rechteck: {breite} x {hoehe}")
```

## return: ein Ergebnis zurückgeben

Mit `return` gibt eine Funktion einen **Wert zurück**, mit dem man weiterrechnen kann:

```python
def quadrat(zahl):
    return zahl * zahl

ergebnis = quadrat(5)
print(ergebnis)          # 25
print(quadrat(3) + 1)    # 10
```

> **print oder return?** `print` zeigt etwas auf dem Bildschirm an – damit ist es „weg“. `return` gibt den Wert an den Aufrufer zurück, der damit weiterarbeiten kann. Eine Funktion ohne `return` gibt `None` (nichts) zurück.

## Warum Funktionen?

- **Nicht doppelt schreiben:** Code, den du öfter brauchst, steht nur einmal da.
- **Übersicht:** Ein guter Name erklärt, was passiert – `berechne_preis()` versteht jeder.
- **Fehler finden:** Kleine Funktionen kann man einzeln testen.

So machen es auch die Profis: Große Programme bestehen aus vielen kleinen Funktionen.
