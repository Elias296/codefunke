import { expect, test, type Page } from "@playwright/test";

/** Wartet, bis der Service Worker die Seite isoliert hat (nötig für input() und Stopp) */
async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(() => window.crossOriginIsolated === true, null, { timeout: 20_000 });
  await page.waitForLoadState("load");
}

test("Direktlink auf ein Kapitel funktioniert und die Seite ist isoliert", async ({ page }) => {
  await open(page, "lernpfad/1-scratch/01-bewegung/aufgabe-2");
  await expect(page.getByRole("heading", { name: "Um die Ecke" })).toBeVisible();
  // ohne Server gibt es keinen Anmelde-Knopf
  await expect(page.getByRole("link", { name: "Anmelden" })).toHaveCount(0);
});

test("Block-Aufgabe lösen speichert den Fortschritt im Browser", async ({ page }) => {
  await open(page, "lernpfad/1-scratch/01-bewegung/aufgabe-1");
  await page.getByRole("button", { name: "Tipp", exact: true }).click();
  await page.getByRole("button", { name: "Größerer Tipp" }).click();
  await page.getByRole("button", { name: "Lösung zeigen" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Lösung zeigen" }).click();
  await page.getByRole("button", { name: "Lösung übernehmen" }).click();
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expect(page.getByText("+5 XP")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: /5 XP/ })).toBeVisible();
});

test("Python mit input() läuft", async ({ page }) => {
  await open(page, "editor/python");
  await page.getByRole("button", { name: /Ausführen/ }).click();
  const input = page.locator("#cf-console-input");
  await expect(input).toBeVisible({ timeout: 45_000 });
  await input.fill("Ada");
  await input.press("Enter");
  await expect(page.getByRole("log")).toContainText("Hallo Ada!");
});

test("HTML-Vorschau funktioniert und ist abgeschottet", async ({ page }) => {
  await open(page, "editor/web");
  const frame = page.frameLocator('iframe[title="Vorschau deiner Webseite"]');
  await expect(frame.locator("h1")).toHaveText("Hallo, ich bin eine Webseite!");
  await frame.locator("#knopf").click();
  await expect(page.getByRole("log")).toContainText("Der Knopf wurde geklickt.");
  const access = await frame.locator("body").evaluate(() => { try { return typeof localStorage.length; } catch { return "blockiert"; } });
  expect(access).toBe("blockiert");
});

test("Projekte werden lokal gespeichert, Galerie erklärt sich", async ({ page }) => {
  await open(page, "editor/python");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.fill("#cf-dialog-input", "Lokales Projekt");
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.getByText("Auf diesem Gerät gespeichert", { exact: false })).toBeVisible();
  await page.goto("projekte");
  await expect(page.getByRole("tab", { name: "Meine Projekte" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("link", { name: "Lokales Projekt" })).toBeVisible();
  await page.getByRole("tab", { name: "Galerie entdecken" }).click();
  await expect(page.getByText("gibt es nur mit Server")).toBeVisible();
});

test("Fortschritt aus einer Datei laden (Umzug auf ein anderes Gerät)", async ({ page }) => {
  const data = { completions: { "task:1-scratch/01-bewegung/sprung": { xp: 20, at: "2026-11-01T10:00:00.000Z" } }, activityDays: ["2026-11-01"] };
  await open(page, "profil");
  await expect(page.getByRole("heading", { name: "Konto & Daten" })).toBeVisible();
  await page.getByLabel("Fortschritt laden").setInputFiles({ name: "fortschritt.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(data)) });
  await expect(page.getByText("Fortschritt geladen!")).toBeVisible();
  await expect(page.getByRole("link", { name: /20 XP/ })).toBeVisible();
});
