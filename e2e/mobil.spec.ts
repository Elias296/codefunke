import { expect, test } from "@playwright/test";

test("Auf dem Handy gibt es die Tab-Leiste unten", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Hauptnavigation (mobil)" });
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "Lernpfad" }).click();
  await expect(page.getByRole("heading", { name: "Dein Lernpfad" })).toBeVisible();
  // kein waagerechtes Scrollen
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
