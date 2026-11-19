# Ereignisse: Tasten und Klicks

Bisher startete dein Programm immer mit **▶ Start**. Aber Programme können auch auf andere Dinge reagieren: auf eine **Taste**, auf einen **Mausklick** … So etwas nennt man ein **Ereignis**.

Die gelben **Startblöcke** (mit der runden Kappe oben) warten auf ein Ereignis:

| Startblock | startet, wenn … |
|---|---|
| Wenn ▶ angeklickt | du auf Start klickst |
| Wenn Taste … gedrückt | jemand diese Taste drückt |
| Wenn Funki angeklickt | jemand auf Funki klickt |

## Funki mit den Pfeiltasten steuern

```blocks
wenn_taste rechts
  ändere_x 10

wenn_taste links
  ändere_x -10
```

**„ändere x um 10“** bewegt Funki 10 Schritte nach rechts – egal, wohin er schaut. Mit **-10** geht es nach links. Für oben und unten gibt es **„ändere y um …“**.

> **So probierst du es aus:** Klick auf ▶ Start, dann klick einmal auf die Bühne und drück die Pfeiltasten. Auf dem Tablet erscheinen unter der Bühne Bildschirm-Tasten.

## Mehrere Programme gleichzeitig

Du kannst so viele Startblöcke benutzen, wie du willst – jedes Programm läuft für sich, **gleichzeitig** mit den anderen:

```blocks
wenn_start
  wiederhole_immer
    drehe_rechts 3

wenn_angeklickt
  sage_für "Hihi, das kitzelt!" 2
```

Funki dreht sich die ganze Zeit – und wenn du ihn anklickst, kichert er. Beide Programme laufen nebeneinander.

## Merke dir

- Ein **Ereignis** ist etwas, das passiert: ein Klick, ein Tastendruck, der Start.
- Jeder **Startblock** wartet auf ein Ereignis und startet dann die Blöcke darunter.
- Mehrere Programme können **gleichzeitig** laufen.
