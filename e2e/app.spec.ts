import { expect, test } from "@playwright/test";
import { unlockPython, useSolution } from "./helpers";

test("Startseite zeigt den Lernpfad mit 6 Stufen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Programmieren lernen/ })).toBeVisible();
  await page.getByRole("link", { name: "Lernpfad ansehen" }).click();
  await expect(page.getByRole("heading", { name: "Dein Lernpfad" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Stufen des Lernpfads" }).getByRole("listitem")).toHaveCount(6);
});

test("Python ist gesperrt, bis Stufe 1 bestanden ist", async ({ page }) => {
  await page.goto("/lernpfad/3-python");
  await expect(page.getByText("Noch gesperrt")).toBeVisible();
});

test("Block-Aufgabe lösen bringt XP und ein Abzeichen", async ({ page }) => {
  await page.goto("/lernpfad/1-scratch/01-bewegung/aufgabe-1");
  await useSolution(page, "Lösung übernehmen");
  await page.getByRole("button", { name: "Programm starten" }).click();
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expect(page.getByText("+5 XP")).toBeVisible();
  await expect(page.getByText("Neues Abzeichen: Erster Funke")).toBeVisible();
  await expect(page.getByRole("link", { name: /5 XP/ })).toBeVisible();
});

test("Falsche Block-Lösung bekommt eine hilfreiche Rückmeldung", async ({ page }) => {
  await page.goto("/lernpfad/1-scratch/01-bewegung/aufgabe-1");
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expect(page.getByText(/gehe … Schritte/).last()).toBeVisible();
});

test("Python: Eingabe im Programm und Prüfung mit Fehlermeldung", async ({ page }) => {
  await unlockPython(page);
  await page.goto("/lernpfad/3-python/02-variablen/aufgabe-3");
  await page.getByRole("button", { name: /Ausführen/ }).click();
  const input = page.locator("#cf-console-input");
  await expect(input).toBeVisible({ timeout: 45_000 });
  await input.fill("Ada");
  await input.press("Enter");
  await expect(page.getByRole("log")).toContainText("Programm beendet");
  // Startcode allein gibt nichts aus → Rückmeldung
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expect(page.getByText("Noch nicht ganz")).toBeVisible({ timeout: 20_000 });
  // Mit der Lösung klappt es
  await useSolution(page, "Lösung einfügen");
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expect(page.getByText("+10 XP")).toBeVisible({ timeout: 20_000 });
});

test("Python: Syntaxfehler werden auf Deutsch erklärt", async ({ page }) => {
  await page.goto("/editor/python");
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+a");
  // insertText umgeht das automatische Klammer-Schließen des Editors
  await page.keyboard.insertText('print("Hallo)');
  await page.getByRole("button", { name: /Ausführen/ }).click();
  await expect(page.getByRole("log")).toContainText("Anführungszeichen fehlt", { timeout: 45_000 });
});

test("Quiz gibt sofort Rückmeldung", async ({ page }) => {
  await page.goto("/lernpfad/1-scratch/01-bewegung/quiz");
  await page.getByRole("radio", { name: /Funki läuft 10 Schritte/ }).click();
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
  await expect(page.getByText("Richtig!")).toBeVisible();
});

test("Dark Mode lässt sich umschalten", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Dunklen Modus einschalten" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("Konto erstellen, Projekt speichern und in der Galerie teilen", async ({ page }) => {
  const name = `E2E${Date.now() % 100000}`;
  await page.goto("/registrieren");
  await page.fill("#username", name);
  await page.fill("#password", "DracheFliegt7!");
  await page.fill("#password2", "DracheFliegt7!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/editor/python");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.fill("#cf-dialog-input", `Projekt von ${name}`);
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.getByText("Gespeichert!")).toBeVisible();
  await page.goto("/projekte");
  await page.getByRole("tab", { name: "Meine Projekte" }).click();
  await page.getByRole("button", { name: /in der Galerie teilen/ }).click();
  await page.getByRole("tab", { name: "Galerie entdecken" }).click();
  await expect(page.getByRole("link", { name: `Projekt von ${name}` })).toBeVisible();
});

test("HTML-Vorschau läuft abgeschottet", async ({ page }) => {
  await page.goto("/editor/web");
  const frame = page.frameLocator('iframe[title="Vorschau deiner Webseite"]');
  await expect(frame.locator("h1")).toHaveText("Hallo, ich bin eine Webseite!");
  await frame.locator("#knopf").click();
  await expect(page.getByRole("log")).toContainText("Der Knopf wurde geklickt.");
  const cookieAccess = await frame.locator("body").evaluate(() => { try { return typeof document.cookie; } catch { return "blockiert"; } });
  expect(cookieAccess).toBe("blockiert");
});
