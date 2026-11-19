# Dein erstes Spiel: Sternenjagd

Jetzt kommt alles zusammen: **Schleifen**, **Ereignisse**, **Bedingungen** und **Variablen**. Wir bauen Schritt für Schritt ein richtiges Spiel:

> Steuere Funki mit den Pfeiltasten. Sammle so viele Sterne wie möglich, bevor die Zeit abläuft!

## Was braucht ein Spiel?

Fast jedes Spiel besteht aus denselben Bausteinen:

1. **Start** – alles auf Anfang: Funki in die Mitte, Punkte auf 0.
2. **Steuerung** – die Spielfigur reagiert auf Tasten.
3. **Ziel** – etwas zum Einsammeln oder Erreichen.
4. **Punkte** – eine Variable zählt mit.
5. **Ende** – zum Beispiel, wenn die Zeit abgelaufen ist.

## Die Spielschleife

Das Herz jedes Spiels ist eine Schleife, die **fortlaufend** prüft, was gerade passiert:

```blocks
wenn_start
  gehe_zu 0 0
  setze punkte 0
  stern_zufall
  stern_zeigen
  wiederhole_immer
    falls (taste rechts)
      ändere_x 6
    falls (taste links)
      ändere_x -6
    falls (berührt_stern)
      ändere punkte 1
      stern_zufall
```

In jeder Runde der Schleife schaut das Programm: Wird eine Taste gedrückt? Berührt Funki den Stern? Das passiert 60-mal pro Sekunde – darum fühlt sich die Steuerung flüssig an.

## Ein Countdown

Ein zweites Programm läuft **gleichzeitig** und zählt die Zeit herunter:

```blocks
wenn_start
  setze zeit 20
  wiederhole_bis (= zeit 0)
    warte 1
    ändere zeit -1
  sage (verbinde "Zeit um! Punkte: " punkte)
  stoppe
```

**„stoppe alles“** beendet am Ende alle Programme – das Spiel ist vorbei.

## Tipps für gute Spiele

- **Teste oft!** Bau ein Stück, probier es aus, bau weiter.
- **Fair bleiben:** Ist das Spiel zu schwer oder zu leicht? Ändere Geschwindigkeit oder Zeit.
- **Rückmeldung:** Ein „Juhu!“ oder ein Farbwechsel macht das Spielen schöner.
