# Schleifen: for und while

Schleifen kennst du schon aus den Blöcken. In Python gibt es zwei Arten:

- **for** – wenn du weißt, **wie oft** etwas wiederholt werden soll
- **while** – wenn etwas wiederholt werden soll, **solange** eine Bedingung stimmt

## Die for-Schleife mit range

```python
for i in range(5):
    print("Hallo!")
```

`range(5)` erzeugt die Zahlen **0, 1, 2, 3, 4** – also fünf Zahlen, und zwar **ab 0**! Die Variable `i` bekommt nacheinander jede dieser Zahlen:

```python
for i in range(5):
    print(i)
```

```output
0
1
2
3
4
```

`range` kann noch mehr:

| Schreibweise | Zahlen |
|---|---|
| `range(5)` | 0, 1, 2, 3, 4 |
| `range(1, 6)` | 1, 2, 3, 4, 5 (Ende **nicht** dabei!) |
| `range(0, 10, 2)` | 0, 2, 4, 6, 8 (in 2er-Schritten) |
| `range(10, 0, -1)` | 10, 9, … , 1 (rückwärts) |

Wie beim `if` gilt: **Doppelpunkt** am Ende und alles, was wiederholt werden soll, **einrücken**.

## Zusammenzählen

Ein klassisches Muster: Eine Variable sammelt etwas auf.

```python
summe = 0
for zahl in range(1, 6):
    summe = summe + zahl
print(summe)  # 1 + 2 + 3 + 4 + 5 = 15
```

## Die while-Schleife

`while` heißt „solange“. Die Schleife läuft, **solange** die Bedingung wahr ist:

```python
countdown = 3
while countdown > 0:
    print(countdown)
    countdown = countdown - 1
print("Los!")
```

> **Vorsicht, Endlosschleife!** Wenn sich die Bedingung nie ändert, läuft die Schleife für immer. Hier hilft der **Stopp**-Knopf. Achte darauf, dass sich in der Schleife etwas ändert!

Mit **break** kannst du eine Schleife sofort verlassen:

```python
while True:
    antwort = input("Sag 'stopp': ")
    if antwort == "stopp":
        break
print("Okay, ich höre auf.")
```

## Zeichnen mit der Turtle

Python hat eine eingebaute Zeichen-Schildkröte: die **turtle**. Sie funktioniert wie Funki mit dem Malstift!

```python
import turtle

t = turtle.Turtle()
t.color("orange")
for i in range(4):
    t.forward(100)
    t.left(90)
```

| Befehl | Bedeutung |
|---|---|
| `t.forward(100)` | 100 Schritte vorwärts |
| `t.left(90)` / `t.right(90)` | drehen |
| `t.penup()` / `t.pendown()` | Stift hoch / runter |
| `t.color("red")` | Farbe ändern |
| `t.circle(50)` | Kreis mit Radius 50 |

Klick auf **Ausprobieren** und schau der Turtle beim Malen zu!
