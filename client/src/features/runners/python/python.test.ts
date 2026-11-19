import { describe, expect, it } from "vitest";
import { checkCodeTask, stripPythonComments, outputHint } from "./checkCode";
import { explainError } from "./errorHelp";
import { nodeRunGroups } from "./testPyodide";

describe("Python-Prüfung (echtes Pyodide)", () => {
  it("erkennt fehlenden Doppelpunkt mit Zeilennummer", async () => {
    const res = await checkCodeTask('x = 5\nif x > 3\n    print("groß")', [{ type: "noError" }], nodeRunGroups);
    expect(res.ok).toBe(false);
    expect(res.title).toBe("Fast richtig!");
    expect(res.message).toContain("Doppelpunkt");
    expect(res.line).toBe(2);
  });

  it("vergleicht Ausgabe mit Eingaben", async () => {
    const code = 'name = input("Wie heißt du? ")\nprint("Hallo " + name + "!")';
    const ok = await checkCodeTask(code, [{ type: "output", inputs: ["Ada"], expected: "Hallo Ada!", match: "contains" }], nodeRunGroups);
    expect(ok.ok).toBe(true);
    const bad = await checkCodeTask(code.replace("Hallo", "hallo"), [{ type: "output", inputs: ["Ada"], expected: "Hallo Ada!", match: "contains" }], nodeRunGroups);
    expect(bad.ok).toBe(false);
    expect(bad.message).toContain("Groß- und Kleinschreibung");
  });

  it("führt Tests (assert) im Namensraum des Programms aus", async () => {
    const code = "def verdopple(n):\n    return n * 2";
    const checks = [{ type: "assert" as const, code: "assert verdopple(4) == 8", message: "verdopple(4) sollte 8 sein" }];
    expect((await checkCodeTask(code, checks, nodeRunGroups)).ok).toBe(true);
    const wrong = await checkCodeTask("def verdopple(n):\n    return n + 2", checks, nodeRunGroups);
    expect(wrong.message).toBe("verdopple(4) sollte 8 sein");
  });

  it("findet Laufzeitfehler: Text + Zahl", async () => {
    const res = await checkCodeTask('alter = 12\nprint("Ich bin " + alter)', [{ type: "noError" }], nodeRunGroups);
    expect(res.title).toBe("Text + Zahl geht nicht");
    expect(res.line).toBe(2);
  });

  it("schlägt bei Tippfehlern Namen vor", async () => {
    const res = await checkCodeTask('prnt("hi")', [{ type: "noError" }], nodeRunGroups);
    expect(res.message).toContain("`print`");
  });

  it("zu viele input()-Aufrufe", async () => {
    const res = await checkCodeTask("a = input()\nb = input()", [{ type: "output", inputs: ["1"], expected: "", match: "contains" }], nodeRunGroups);
    expect(res.title).toBe("Zu viele Fragen");
  });

  it("Turtle zeichnet und merkt sich Linien", async () => {
    const code = "import turtle\nt = turtle.Turtle()\nfor i in range(4):\n    t.forward(100)\n    t.left(90)";
    const res = await checkCodeTask(code, [{ type: "assert", code: "import turtle\nassert len(turtle._segments) == 4\nassert turtle._segments[-1][1] == (0.0, 0.0)", message: "Quadrat fehlt" }], nodeRunGroups);
    expect(res.ok).toBe(true);
  });

  it("Code-Muster ignorieren Kommentare", async () => {
    expect(stripPythonComments('# for i in x\nprint("# kein Kommentar")')).toBe('\nprint("# kein Kommentar")');
    const res = await checkCodeTask('# for i in range(3):\nprint(1)', [{ type: "code", pattern: "for\\s+\\w+\\s+in", message: "Benutze eine for-Schleife" }], nodeRunGroups);
    expect(res.message).toBe("Benutze eine for-Schleife");
  });
});

describe("Fehlererklärungen", () => {
  it("übersetzt typische Fehler", () => {
    expect(explainError({ type: "SyntaxError", message: "invalid syntax. Maybe you meant '==' or ':=' instead of '='?", line: 4 }).text).toContain("==");
    expect(explainError({ type: "IndentationError", message: "expected an indented block after 'for' statement on line 1", line: 2 }).text).toContain("eingerückt");
    expect(explainError({ type: "ZeroDivisionError", message: "division by zero", line: 3 }).text).toContain("Zeile 3");
    expect(explainError({ type: "ValueError", message: "invalid literal for int() with base 10: 'zwölf'", line: 1 }).text).toContain("zwölf");
  });
  it("gibt Tipps bei fast richtiger Ausgabe", () => {
    expect(outputHint("Hallo welt", "Hallo Welt")).toContain("Groß");
    expect(outputHint("Hallo  Welt", "Hallo Welt")).toContain("Leerzeichen");
    expect(outputHint("Hallo Welt", "Hallo Welt!")).toContain("Satzzeichen");
    expect(outputHint("", "x")).toContain("print");
  });
});
