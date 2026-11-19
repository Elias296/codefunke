# Variablen: Sich Dinge merken

Ein Spiel braucht **Punkte**, ein Wecker die **Zeit**, ein Würfel die **gewürfelte Zahl**. Programme müssen sich Dinge merken – dafür gibt es **Variablen**.

Stell dir eine Variable wie eine **Kiste mit einem Namensschild** vor. In die Kiste kannst du etwas hineinlegen (eine Zahl oder ein Wort). Später schaust du nach, was drin ist – oder du tauschst es aus.

## Eine Variable erstellen

1. Klick links auf **Variablen**.
2. Klick auf **„＋ Variable erstellen“** und gib einen Namen ein, zum Beispiel **punkte**.
3. Jetzt hast du drei neue Blöcke: den runden Block **punkte** (der Inhalt), **„setze punkte auf …“** und **„ändere punkte um …“**.

Die Werte deiner Variablen siehst du oben links auf der Bühne.

## Setzen und ändern

```blocks
wenn_start
  setze punkte 0
  ändere punkte 1
  ändere punkte 1
  sage punkte
```

- **„setze … auf …“** legt einen neuen Wert in die Kiste (der alte ist weg).
- **„ändere … um …“** zählt etwas dazu (mit Minus: zieht etwas ab).

Am Ende sagt Funki **2**.

## Variablen in anderen Blöcken

Der runde Variablen-Block passt in jedes runde Feld. So kannst du Funki zum Beispiel immer weiter laufen lassen – das ergibt eine Spirale:

```blocks
wenn_start
  stift_runter
  setze länge 10
  wiederhole 20
    gehe länge
    drehe_rechts 90
    ändere länge 10
```

## Text und Zahlen verbinden

Mit **„verbinde … und …“** (bei **Operatoren**) baust du Sätze:

```blocks
wenn_start
  setze punkte 7
  sage (verbinde "Punkte: " punkte)
```

## Zufall

**„Zufallszahl von 1 bis 6“** würfelt für dich. Jedes Mal kommt etwas anderes heraus!

```blocks
wenn_angeklickt
  setze wurf (zufall 1 6)
  sage (verbinde "Ich würfle eine " wurf)
```

## Merke dir

- Eine **Variable** ist eine Kiste mit Namen, in der dein Programm sich etwas merkt.
- **setze** = neuen Wert hineinlegen, **ändere** = etwas dazuzählen.
- Gib Variablen **sprechende Namen**: „punkte“ statt „x7“.
