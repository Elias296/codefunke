# Entscheidungen: if, elif, else

In Scratch hieß es „falls … dann … sonst“. In Python heißt das **if** (falls), **elif** (sonst falls) und **else** (sonst):

```python
temperatur = 28

if temperatur > 25:
    print("Ab ins Freibad!")
else:
    print("Lieber ins Museum.")
```

Zwei Dinge sind **super wichtig**:

1. Nach der Bedingung kommt ein **Doppelpunkt** `:`
2. Die Zeilen, die dazugehören, sind **eingerückt** (4 Leerzeichen oder die Tab-Taste)

Die Einrückung ersetzt in Python die „Klammer“ des falls-Blocks: Alles, was eingerückt ist, gehört dazu.

## Vergleichen

| Zeichen | Bedeutung |
|---|---|
| `==` | ist gleich (zwei Gleichheitszeichen!) |
| `!=` | ist ungleich |
| `<` / `>` | kleiner / größer |
| `<=` / `>=` | kleiner gleich / größer gleich |

> **Häufiger Fehler:** `if x = 5:` geht nicht. Ein `=` speichert einen Wert, zum **Vergleichen** brauchst du `==`.

## Mehrere Fälle mit elif

```python
punkte = int(input("Wie viele Punkte? "))

if punkte >= 90:
    print("Spitze!")
elif punkte >= 50:
    print("Gut gemacht!")
else:
    print("Übung macht den Meister!")
```

Python prüft von oben nach unten und nimmt den **ersten** Fall, der stimmt. Alle anderen werden übersprungen.

## Gerade oder ungerade?

Der Rest-Operator `%` ist hier sehr praktisch: Eine Zahl ist **gerade**, wenn beim Teilen durch 2 kein Rest bleibt.

```python
zahl = 7
if zahl % 2 == 0:
    print("gerade")
else:
    print("ungerade")
```

## and, or, not

- `and` – beide Bedingungen müssen stimmen
- `or` – mindestens eine muss stimmen
- `not` – dreht `True` und `False` um

```python
alter = 12
if alter >= 10 and alter <= 14:
    print("Du bist zwischen 10 und 14.")
```

Bedingungen ergeben immer `True` oder `False`:

```python
print(5 > 3)
print(5 == 3)
```
