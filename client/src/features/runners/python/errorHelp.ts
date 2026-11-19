/**
 * Übersetzt Python-Fehler in freundliche, verständliche Hinweise auf Deutsch.
 * Beispiel: SyntaxError "expected ':'" in Zeile 3
 *   → "Fast richtig! Dir fehlt ein Doppelpunkt : am Ende von Zeile 3."
 */

export interface PyErrorInfo {
  type: string;
  message: string;
  line?: number | null;
  col?: number | null;
  text?: string | null;
  suggestion?: string | null;
  name?: string | null;
}

export interface FriendlyError {
  /** Kurze, ermutigende Überschrift */
  title: string;
  /** Erklärung in einfacher Sprache (darf `code` in Backticks enthalten) */
  text: string;
  line?: number;
  /** Originale Fehlermeldung von Python (für Neugierige) */
  original: string;
}

const NO_INPUT = "__CF_NO_INPUT__";
const TOO_MUCH = "__CF_TOO_MUCH_OUTPUT__";

function at(line?: number | null): string {
  return line ? ` in Zeile ${line}` : "";
}

/** Erkennt Fehlertyp + Meldung und liefert einen freundlichen Text */
export function explainError(err: PyErrorInfo, opts: { checking?: boolean } = {}): FriendlyError {
  const line = err.line ?? undefined;
  const msg = err.message ?? "";
  const original = err.type === "KeyboardInterrupt" ? "KeyboardInterrupt" : `${err.type}: ${msg.replace(NO_INPUT, "EOF").replace(TOO_MUCH, "zu viel Ausgabe")}`;
  const r = (title: string, text: string): FriendlyError => ({ title, text, line, original });
  const L = at(line);

  switch (err.type) {
    case "KeyboardInterrupt":
      return r("Gestoppt", "Du hast das Programm angehalten.");
    case "Timeout":
      return r("Das dauert zu lange …", "Dein Programm läuft und läuft. Vielleicht eine Endlosschleife? Prüfe, ob die Bedingung deiner `while`-Schleife irgendwann falsch wird.");
    case "EOFError":
      if (msg.includes(NO_INPUT)) {
        return opts.checking
          ? r("Zu viele Fragen", "Dein Programm fragt öfter mit `input()` nach einer Eingabe als in der Aufgabe vorgesehen.")
          : r("Keine Eingabe", "Dein Programm wartet auf eine Eingabe, hat aber keine bekommen.");
      }
      break;
    case "IndentationError":
    case "TabError": {
      const after = msg.match(/expected an indented block after '(\w+)' statement on line (\d+)/);
      if (after) {
        return { ...r("Fast richtig!", `Nach \`${after[1]} …:\` in Zeile ${after[2]} müssen die nächsten Zeilen eingerückt sein (4 Leerzeichen oder die Tab-Taste).`), line: Number(after[2]) + 1 };
      }
      if (msg.includes("expected an indented block")) return r("Fast richtig!", `Nach einem Doppelpunkt müssen die nächsten Zeilen eingerückt sein${L}.`);
      if (msg.includes("unexpected indent")) return r("Zu weit eingerückt", `Zeile ${line} ist eingerückt, obwohl sie zu keinem Block gehört. Lösch die Leerzeichen am Anfang.`);
      if (msg.includes("unindent does not match")) return r("Einrückung passt nicht", `Die Einrückung${L} passt nicht zu den Zeilen darüber. Nimm immer gleich viele Leerzeichen (meist 4).`);
      return r("Einrückung prüfen", `Mit der Einrückung${L} stimmt etwas nicht.`);
    }
    case "SyntaxError": {
      if (msg.includes("expected ':'")) return r("Fast richtig!", `Dir fehlt ein Doppelpunkt \`:\` am Ende von Zeile ${line}.`);
      if (msg.includes("Maybe you meant '==' or ':=' instead of '='") || msg.includes("cannot assign to") && msg.includes("Maybe you meant '=='")) {
        return r("Vergleichen oder zuweisen?", `In Zeile ${line} steht \`=\`. Zum Vergleichen brauchst du \`==\` (zwei Gleichheitszeichen).`);
      }
      if (msg.includes("unterminated string literal") || msg.includes("EOL while scanning")) {
        return r("Anführungszeichen fehlt", `In Zeile ${line} fehlt ein Anführungszeichen am Ende eines Textes. Texte brauchen am Anfang UND am Ende ein \`"\`.`);
      }
      if (msg.includes("unterminated triple-quoted string")) return r("Anführungszeichen fehlt", `Ein Text mit drei Anführungszeichen \`"""\`${L} wird nie geschlossen.`);
      const notClosed = msg.match(/'([([{])' was never closed/);
      if (notClosed) {
        const close = { "(": ")", "[": "]", "{": "}" }[notClosed[1]];
        return r("Klammer fehlt", `In Zeile ${line} wird eine Klammer \`${notClosed[1]}\` geöffnet, aber nie geschlossen. Jede \`${notClosed[1]}\` braucht ein \`${close}\`.`);
      }
      const unmatched = msg.match(/unmatched '([)\]}])'/);
      if (unmatched) return r("Eine Klammer zu viel", `In Zeile ${line} ist eine schließende Klammer \`${unmatched[1]}\` zu viel.`);
      const mismatch = msg.match(/closing parenthesis '(.)' does not match opening parenthesis '(.)'/);
      if (mismatch) return r("Klammern passen nicht", `In Zeile ${line} passen die Klammern \`${mismatch[2]}\` und \`${mismatch[1]}\` nicht zusammen.`);
      if (msg.includes("Missing parentheses in call to 'print'")) return r("Fast richtig!", `Bei \`print\` brauchst du Klammern, z. B. \`print("Hallo")\` (Zeile ${line}).`);
      if (msg.includes("Perhaps you forgot a comma")) return r("Komma vergessen?", `In Zeile ${line} stehen zwei Dinge direkt nebeneinander. Fehlt da ein Komma \`,\`?`);
      if (msg.includes("invalid character")) {
        const ch = msg.match(/invalid character '(.)'/)?.[1];
        return r("Komisches Zeichen", `In Zeile ${line} steht ein Zeichen, das Python nicht kennt${ch ? ` (\`${ch}\`)` : ""}. Nutze die normalen Anführungszeichen \`"\` von der Tastatur.`);
      }
      if (msg.includes("invalid decimal literal")) return r("Name mit Zahl?", `In Zeile ${line}: Namen dürfen nicht mit einer Zahl beginnen. Und Kommazahlen schreibt Python mit Punkt: \`2.5\`.`);
      if (msg.includes("cannot assign to literal") || msg.includes("cannot assign to expression") || msg.includes("cannot assign to function call")) {
        return r("Links vom = ", `In Zeile ${line} muss links vom \`=\` ein Variablenname stehen, z. B. \`punkte = 5\`.`);
      }
      if (msg.includes("'return' outside function")) return r("return ohne Funktion", `\`return\` darf nur innerhalb einer Funktion (\`def …\`) stehen${L}.`);
      if (msg.includes("'break' outside loop") || msg.includes("'continue' not properly in loop")) return r("Nicht in einer Schleife", `\`break\` und \`continue\` funktionieren nur in einer Schleife${L}.`);
      if (msg.includes("expected 'except' or 'finally'")) return r("try ohne except", `Nach \`try:\` muss ein \`except:\`-Block kommen${L}.`);
      if (msg.includes("invalid syntax. Did you mean")) {
        const m = msg.match(/Did you mean '([^']+)'/);
        return r("Tippfehler?", `In Zeile ${line} versteht Python etwas nicht.${m ? ` Meintest du \`${m[1]}\`?` : ""}`);
      }
      if (msg.includes("elif") || msg.includes("else")) return r("Fast richtig!", `Prüfe \`if\`, \`elif\` und \`else\`${L}: Sie brauchen einen Doppelpunkt und die richtige Einrückung.`);
      return r("Hier hakt es", `In Zeile ${line ?? "?"} versteht Python etwas nicht. Prüfe Tippfehler, Klammern, Anführungszeichen und Doppelpunkte.`);
    }
    case "NameError": {
      const name = err.name ?? msg.match(/name '([^']+)'/)?.[1] ?? "?";
      const sugg = err.suggestion && err.suggestion !== name ? ` Meintest du \`${err.suggestion}\`?` : "";
      const text = /^[a-zäöüß]+$/i.test(name) && !err.suggestion
        ? ` Wenn das ein Text sein soll, setze ihn in Anführungszeichen: \`"${name}"\`. Wenn es eine Variable ist: Hast du ihr vorher einen Wert gegeben?`
        : " Hast du dich vertippt oder die Variable noch nicht erstellt?";
      return r("Unbekannter Name", `Python kennt \`${name}\`${L} noch nicht.${sugg}${sugg ? "" : text}`);
    }
    case "TypeError": {
      if (msg.includes("can only concatenate str (not \"int\") to str") || msg.includes("can only concatenate str (not \"float\") to str")) {
        return r("Text + Zahl geht nicht", `${L ? `In Zeile ${line} willst` : "Du willst"} du Text und Zahl mit \`+\` verbinden. Mach aus der Zahl Text mit \`str(zahl)\` – oder trenne in \`print\` mit Komma.`);
      }
      if (/unsupported operand type\(s\) for [-+*/]+: '(int|float)' and 'str'|'str' and '(int|float)'/.test(msg)) {
        return r("Zahl und Text gemischt", `${L ? `In Zeile ${line} rechnest` : "Du rechnest"} mit Text. Tipp: \`input()\` liefert immer Text – mit \`int(...)\` wird daraus eine Zahl.`);
      }
      if (/not supported between instances of '(str|int|float)' and '(str|int|float)'/.test(msg)) {
        return r("Äpfel mit Birnen vergleichen", `In Zeile ${line} vergleichst du Text mit einer Zahl. Wandle die Eingabe mit \`int(...)\` in eine Zahl um.`);
      }
      if (msg.includes("object is not callable")) {
        const what = msg.match(/'(\w+)' object is not callable/)?.[1];
        return r("Keine Funktion", `In Zeile ${line} rufst du etwas mit Klammern \`()\` auf, das keine Funktion ist${what ? ` (sondern ein ${what})` : ""}. Hast du eine Variable so genannt wie eine Funktion, z. B. \`print = 5\`?`);
      }
      const args = msg.match(/(\w+)\(\) takes (\d+) positional arguments? but (\d+) (?:was|were) given/);
      if (args) return r("Falsche Anzahl Werte", `\`${args[1]}()\` erwartet ${args[2]} Wert(e), bekommt aber ${args[3]}${L}.`);
      const missing = msg.match(/(\w+)\(\) missing (\d+) required positional arguments?: (.+)/);
      if (missing) return r("Es fehlt ein Wert", `Beim Aufruf von \`${missing[1]}()\`${L} fehlt ${missing[2] === "1" ? "ein Wert" : `${missing[2]} Werte`}: ${missing[3]}.`);
      if (msg.includes("has no len()")) return r("Keine Länge", `\`len()\`${L} funktioniert nur mit Texten und Listen, nicht mit Zahlen.`);
      if (msg.includes("does not support item assignment")) return r("Nicht veränderbar", `Einzelne Buchstaben in einem Text kann man nicht ändern${L}. Baue lieber einen neuen Text.`);
      if (msg.includes("indices must be integers")) return r("Position muss eine Zahl sein", `In Zeile ${line} steht in den eckigen Klammern \`[ ]\` keine ganze Zahl. Tipp: \`int(...)\`.`);
      if (msg.includes("'NoneType'")) return r("Da ist nichts (None)", `In Zeile ${line} ist ein Wert \`None\` – oft, weil eine Funktion nichts mit \`return\` zurückgibt.`);
      return r("Falscher Typ", `In Zeile ${line ?? "?"} passt ein Wert nicht zur Aktion (z. B. Text statt Zahl).`);
    }
    case "ValueError": {
      const lit = msg.match(/invalid literal for int\(\) with base 10: '(.*)'/);
      if (lit) return r("Keine ganze Zahl", `\`int()\`${L} kann „${lit[1]}“ nicht in eine ganze Zahl umwandeln. Gib eine Zahl wie \`42\` ein.`);
      if (msg.includes("could not convert string to float")) return r("Keine Zahl", `\`float()\`${L} kann diesen Text nicht in eine Zahl umwandeln. Kommazahlen mit Punkt: \`2.5\`.`);
      if (msg.includes("not in list")) return r("Nicht in der Liste", `Den gesuchten Wert gibt es in der Liste nicht${L}.`);
      return r("Unpassender Wert", `Ein Wert${L} passt nicht.`);
    }
    case "ZeroDivisionError":
      return r("Durch 0 geteilt", `${L ? `In Zeile ${line} wird` : "Es wird"} durch 0 geteilt – das geht auch in Mathe nicht.`);
    case "IndexError":
      return r("Diese Stelle gibt es nicht", `${L ? `In Zeile ${line} greifst` : "Du greifst"} du auf eine Stelle zu, die es nicht gibt. Denk dran: Python zählt ab 0! Eine Liste mit 3 Dingen hat die Stellen 0, 1 und 2.`);
    case "KeyError":
      return r("Schlüssel fehlt", `Den Schlüssel ${msg} gibt es in deinem Wörterbuch nicht${L}.`);
    case "AttributeError": {
      const name = err.name ?? msg.match(/has no attribute '([^']+)'/)?.[1];
      const typ = msg.match(/'(\w+)' object/)?.[1];
      const sugg = err.suggestion ? ` Meintest du \`${err.suggestion}\`?` : "";
      return r("Gibt es nicht", `\`${name}\` gibt es${typ ? ` bei ${typ === "str" ? "Text (str)" : typ === "list" ? "Listen" : typ}` : ""} nicht${L}.${sugg}`);
    }
    case "RecursionError":
      return r("Endlos-Aufruf", "Eine Funktion ruft sich immer wieder selbst auf und hört nie auf. Gibt es eine Abbruch-Bedingung?");
    case "ModuleNotFoundError":
    case "ImportError": {
      const mod = msg.match(/No module named '([^']+)'/)?.[1];
      return r("Modul nicht da", `Das Modul ${mod ? `\`${mod}\`` : ""} gibt es hier nicht. Verfügbar sind z. B. \`random\`, \`math\`, \`time\` und \`turtle\`.`);
    }
    case "RuntimeError":
      if (msg.includes(TOO_MUCH)) return r("Viel zu viel Text", "Dein Programm schreibt riesige Mengen Text. Läuft da eine Schleife endlos?");
      break;
    case "OSError":
      return r("Viel zu viel Text", "Dein Programm schreibt riesige Mengen Text. Läuft da eine Schleife endlos?");
    case "MemoryError":
      return r("Speicher voll", "Dein Programm braucht zu viel Speicher – wird eine Liste endlos länger?");
  }
  return r("Hoppla, ein Fehler", `${err.type}${L}: ${msg}. Lies die Meldung genau – sie verrät oft, wo das Problem steckt.`);
}
