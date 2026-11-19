# Variablen und Datentypen

Erinnerst du dich an die Variablen aus den Blöcken? In Python funktionieren sie genauso – nur schreibst du sie:

```python
punkte = 0
punkte = punkte + 1
print(punkte)
```

Das `=` bedeutet **nicht** „ist gleich“ wie in Mathe, sondern: **„Leg den Wert rechts in die Kiste links.“** Die zweite Zeile liest man so: *Nimm den alten Wert von punkte, zähl 1 dazu und leg das Ergebnis wieder in punkte.*

Kürzer geht es mit `+=`:

```python
punkte += 1
```

## Gute Namen

- Erlaubt: Buchstaben, Zahlen und `_` – aber **nicht am Anfang eine Zahl**
- Keine Leerzeichen: `meine_zahl` statt `meine zahl`
- Python unterscheidet Groß/Klein: `Name` und `name` sind zwei verschiedene Variablen
- Wähle Namen, die verraten, was drin ist: `alter` ist besser als `a`

## Datentypen

Jeder Wert hat einen **Typ**. Die wichtigsten:

| Typ | Name | Beispiele |
|---|---|---|
| `int` | ganze Zahl | `42`, `-7`, `0` |
| `float` | Kommazahl | `3.14`, `0.5` (mit **Punkt**!) |
| `str` | Text (*string*) | `"Funki"`, `"42"` |
| `bool` | Wahrheitswert | `True`, `False` |

Mit `type()` kannst du nachschauen:

```python
print(type(42))
print(type("42"))
```

Achtung: `"42"` ist **Text**, `42` ist eine **Zahl**. Mit Text kann man nicht rechnen:

```python
print("4" + "2")   # 42  – Texte werden aneinandergehängt!
print(4 + 2)       # 6
```

## Eingaben mit input

Mit `input()` fragt dein Programm nach einer Eingabe. Was in den Klammern steht, wird als Frage angezeigt:

```python
name = input("Wie heißt du? ")
print("Hallo " + name + "!")
```

**Ganz wichtig:** `input()` liefert **immer Text** – auch wenn jemand eine Zahl eintippt. Zum Rechnen musst du ihn umwandeln:

```python
alter = int(input("Wie alt bist du? "))
print("Nächstes Jahr bist du", alter + 1)
```

| Umwandlung | macht aus … | Beispiel |
|---|---|---|
| `int(...)` | Text → ganze Zahl | `int("12")` → `12` |
| `float(...)` | Text → Kommazahl | `float("2.5")` → `2.5` |
| `str(...)` | Zahl → Text | `str(12)` → `"12"` |

## f-Strings: Text mit Lücken

Mit einem `f` vor dem Text kannst du Variablen direkt in geschweifte Klammern `{ }` setzen – Python füllt die Lücken aus:

```python
name = "Funki"
alter = 3
print(f"{name} ist {alter} Jahre alt.")
print(f"In 10 Jahren ist {name} {alter + 10}.")
```

```output
Funki ist 3 Jahre alt.
In 10 Jahren ist Funki 13.
```

f-Strings sind der bequemste Weg, Text und Zahlen zu mischen.
