# Listen: Viele Werte in einer Variable

Stell dir vor, du willst dir die Punkte aus zehn Spielen merken. Zehn Variablen `punkte1`, `punkte2` … wären furchtbar umständlich. Dafür gibt es **Listen**:

```python
punkte = [7, 3, 9, 5, 10]
freunde = ["Ada", "Bob", "Cem"]
```

Eine Liste steht in **eckigen Klammern** `[ ]`, die Einträge sind mit Kommas getrennt.

## Auf Einträge zugreifen

Jeder Eintrag hat eine Nummer, den **Index**. Und Achtung – Python fängt bei **0** an zu zählen!

```python
freunde = ["Ada", "Bob", "Cem"]
print(freunde[0])   # Ada
print(freunde[2])   # Cem
print(freunde[-1])  # Cem – negative Zahlen zählen von hinten
```

| Index | 0 | 1 | 2 |
|---|---|---|---|
| Eintrag | "Ada" | "Bob" | "Cem" |

## Listen verändern

```python
einkauf = ["Brot", "Milch"]
einkauf.append("Äpfel")      # hinten anhängen
einkauf.remove("Milch")      # einen Eintrag entfernen
einkauf[0] = "Brötchen"      # einen Eintrag ersetzen
print(einkauf)
print(len(einkauf))          # Anzahl der Einträge
```

## Durch eine Liste laufen

Die `for`-Schleife kann direkt durch eine Liste laufen – die Variable bekommt nacheinander jeden Eintrag:

```python
tiere = ["Hund", "Katze", "Drache"]
for tier in tiere:
    print(f"Ich mag {tier}!")
```

## Praktische Helfer

| Befehl | Ergebnis |
|---|---|
| `len(liste)` | Anzahl der Einträge |
| `sum(zahlen)` | Summe aller Zahlen |
| `max(zahlen)` / `min(zahlen)` | größter / kleinster Wert |
| `sorted(liste)` | sortierte Kopie |
| `"Ada" in freunde` | `True`, wenn "Ada" in der Liste ist |

```python
punkte = [7, 3, 9, 5, 10]
print(sum(punkte) / len(punkte))   # Durchschnitt: 6.8
print(sorted(punkte))              # [3, 5, 7, 9, 10]
```
