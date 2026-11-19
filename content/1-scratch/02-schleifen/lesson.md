# Schleifen: Wiederholen ohne Abschreiben

Stell dir vor, Funki soll ein Quadrat laufen. Ohne Schleife bräuchtest du **acht** Blöcke:

```blocks
wenn_start
  gehe 100
  drehe_rechts 90
  gehe 100
  drehe_rechts 90
  gehe 100
  drehe_rechts 90
  gehe 100
  drehe_rechts 90
```

Fällt dir was auf? Es sind immer **dieselben zwei Blöcke**. Programmierer sind gerne „faul“ – und schreiben so etwas mit einer **Schleife**:

```blocks
wenn_start
  wiederhole 4
    gehe 100
    drehe_rechts 90
```

Der Block **„wiederhole … mal“** führt alles, was in ihm steckt, so oft aus, wie du sagst. Das ist kürzer, übersichtlicher – und wenn du statt 100 lieber 50 Schritte willst, musst du nur **eine** Zahl ändern.

## Malen mit dem Stift

Unter **Malstift** findest du Blöcke, mit denen Funki eine Spur hinterlässt:

- **Stift runter** – ab jetzt malt Funki, wenn er sich bewegt
- **Stift hoch** – Funki hört auf zu malen
- **setze Stiftfarbe auf …** und **setze Stiftdicke auf …**

```blocks
wenn_start
  stiftfarbe rot
  stiftdicke 6
  stift_runter
  wiederhole 4
    gehe 100
    drehe_rechts 90
```

## Die Vielecks-Regel

Für jede Form mit gleich langen Seiten gilt: Funki dreht sich insgesamt **einmal ganz herum – 360 Grad**. Deshalb:

> **Drehung = 360 ÷ Anzahl der Ecken.** Dreieck: 360 ÷ 3 = 120. Fünfeck: 360 ÷ 5 = 72.

## Für immer: „wiederhole fortlaufend“

Manche Dinge sollen nie aufhören – zum Beispiel ein Windrad, das sich dreht. Dafür gibt es **„wiederhole fortlaufend“**. Es läuft, bis du auf **■ Stopp** drückst.

```blocks
wenn_start
  wiederhole_immer
    drehe_rechts 5
```

## Schleifen in Schleifen

Du kannst Schleifen auch ineinander stecken. Die innere Schleife malt ein Quadrat, die äußere wiederholt das Quadrat mehrmals und dreht sich dazwischen – so entsteht eine Blume:

```blocks
wenn_start
  stift_runter
  wiederhole 6
    wiederhole 4
      gehe 60
      drehe_rechts 90
    drehe_rechts 60
```

## Merke dir

- Eine **Schleife** wiederholt Blöcke – so bleibt dein Programm kurz.
- **wiederhole … mal** zählt mit, **wiederhole fortlaufend** hört nie auf.
- Vieleck: **360 ÷ Ecken** = Drehung.
