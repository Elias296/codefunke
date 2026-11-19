# Bedingungen: Falls … dann

Programme müssen manchmal **Entscheidungen** treffen. Im echten Leben machst du das ständig: *Falls es regnet, dann nehme ich einen Schirm.*

Genau so funktioniert der Block **„falls … dann“**: Die Blöcke darin laufen **nur**, wenn die Bedingung stimmt.

```blocks
wenn_start
  wiederhole_immer
    gehe 10
    falls (berührt_rand)
      drehe_rechts 180
```

Funki läuft immer weiter. **Falls** er den Rand berührt, **dann** dreht er um.

## Bedingungen sind Fragen

Die sechseckigen Blöcke stellen eine **Ja-oder-Nein-Frage**. Die Antwort ist **wahr** oder **falsch**:

- **wird Rand berührt?** – stößt Funki an den Rand?
- **wird Stern berührt?** – ist Funki beim Stern?
- **Taste … gedrückt?** – wird die Taste gerade gedrückt?
- **( ) < ( )**, **( ) = ( )**, **( ) > ( )** – vergleichen Zahlen

## Falls … dann … sonst

Mit **„sonst“** kannst du sagen, was passieren soll, wenn die Bedingung **nicht** stimmt:

```blocks
wenn_start
  falls (> (x) 0)
    sage "Ich bin rechts!"
  sonst
    sage "Ich bin links!"
```

## Wiederhole bis …

Eine Schleife mit Bedingung: Sie läuft so lange, **bis** die Bedingung stimmt.

```blocks
wenn_start
  wiederhole_bis (berührt_stern)
    gehe 5
  sage_für "Hab ihn!" 2
```

## Und, oder, nicht

- **und**: beide Bedingungen müssen stimmen
- **oder**: mindestens eine muss stimmen
- **nicht**: dreht wahr und falsch um

```blocks
wenn_start
  falls (und (> (x) 0) (> (y) 0))
    sage "Ich bin oben rechts!"
```

## Merke dir

- **falls … dann** führt Blöcke nur aus, wenn die Bedingung **wahr** ist.
- **sonst** ist für den Fall, dass sie **falsch** ist.
- Bedingungen sind die **sechseckigen** Blöcke.
