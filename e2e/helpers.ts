import type { Page } from "@playwright/test";

/** Markiert Stufe 1 als bestanden (damit Python frei ist) */
export async function unlockPython(page: Page) {
  await page.addInitScript(() => {
    if (localStorage.getItem("codefunke-progress")) return;
    localStorage.setItem("codefunke-progress", JSON.stringify({
      version: 1,
      completions: { "final:1-scratch": { xp: 100, at: new Date().toISOString(), passed: true, score: 1 } },
      hints: {}, activityDays: [], badges: {}, stats: { codeRuns: 0, errorsFixed: 0, projectsSaved: 0, projectsShared: 0 },
      updatedAt: new Date().toISOString(),
    }));
  });
}

/** Deckt alle Hilfe-Stufen auf und übernimmt die Lösung */
export async function useSolution(page: Page, button: "Lösung übernehmen" | "Lösung einfügen") {
  await page.getByRole("button", { name: "Tipp", exact: true }).click();
  await page.getByRole("button", { name: "Größerer Tipp" }).click();
  await page.getByRole("button", { name: "Lösung zeigen" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Lösung zeigen" }).click();
  await page.getByRole("button", { name: button }).click();
}
