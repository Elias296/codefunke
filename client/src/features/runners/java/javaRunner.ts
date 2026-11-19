/**
 * Java-Ausführung – Platzhalter für Stufe 6.
 *
 * Java braucht einen Compiler (javac) und eine JVM. Zwei bewährte Wege:
 *  1. CheerpJ (https://cheerpj.com): JVM als WebAssembly im Browser – Code
 *     bleibt komplett beim Lernenden. Für Bildungs-/nicht-kommerzielle
 *     Projekte gibt es eine kostenlose Lizenz (Bedingungen prüfen!).
 *  2. Eine isolierte Sandbox-API (z. B. eine selbst gehostete Piston- oder
 *     Judge0-Instanz in einem Container ohne Netzwerk). Dann läuft Code auf
 *     einem Server – aber niemals ungeschützt auf dem Codefunke-Server selbst.
 *
 * Die Schnittstelle unten ist so gebaut, dass man nur `run` ersetzen muss.
 * Anleitung: docs/ARCHITEKTUR.md → "Java nachrüsten".
 */
export interface JavaResult {
  ok: boolean;
  output: string;
  error?: string;
}

export async function runJava(_code: string): Promise<JavaResult> {
  return {
    ok: false,
    output: "",
    error: "Java kommt mit Stufe 6! Bis dahin kannst du dir den Code schon anschauen. (Für Entwickler: siehe docs/ARCHITEKTUR.md → „Java nachrüsten“.)",
  };
}

export const JAVA_STARTER = `public class Main {
    public static void main(String[] args) {
        System.out.println("Hallo aus Java!");
    }
}`;
