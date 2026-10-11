import { fileURLToPath } from "node:url";

import { expect, test, type Page } from "@playwright/test";

// Component captures should not include the fixed navigation, which is
// covered by its own header and full-page drawer snapshots.
const componentScreenshot = { stylePath: fileURLToPath(new URL("./fixtures/visual-component.css", import.meta.url)) };

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

async function openPage(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".site-header")).toHaveAttribute("data-navigation-enhanced", "true");
  await expect(page.locator("[data-motion-component='home-preloader']")).toBeHidden({ timeout: 12_000 });
  await page.evaluate(() => document.fonts.ready);
}

test("desktop homepage story remains visually stable", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPage(page, "/");
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator(".site-header")).toHaveScreenshot("site-header-desktop.png");
  await page.locator(".skip-links").evaluate((element) => element.remove());
  await expect(page.locator(".home-hero")).toHaveScreenshot("home-hero-desktop.png", componentScreenshot);
  const campus = page.locator(".home-campus");
  await campus.scrollIntoViewIfNeeded();
  await expect(campus.locator(".home-campus__feature img")).toBeVisible();
  await expect.poll(() => campus.locator(".home-campus__feature img").evaluate((image) =>
    (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
  )).toBe(true);
  await expect(campus).toHaveScreenshot("home-campus-desktop.png", componentScreenshot);
  await expect(page.locator(".home-pathways")).toHaveScreenshot("home-pathways-desktop.png", componentScreenshot);
});

test("mobile homepage arrival remains visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPage(page, "/");
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".skip-links").evaluate((element) => element.remove());

  await expect(page.locator(".home-hero")).toHaveScreenshot("home-hero-mobile.png", componentScreenshot);
});

test("mobile navigation remains visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPage(page, "/");
  await page.getByRole("button", { name: "Open navigation" }).click();

  await expect(page).toHaveScreenshot("mobile-navigation.png");
});

test("achievement publication review remains visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPage(page, "/");
  const achievements = page.locator(".home-achievements");
  await achievements.scrollIntoViewIfNeeded();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.locator(".skip-links").evaluate((element) => element.remove());

  await expect(achievements).toHaveScreenshot("home-achievements-laptop.png", componentScreenshot);
});

test("mandatory disclosure structure remains visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPage(page, "/mandatory-public-disclosure");
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".skip-links").evaluate((element) => element.remove());

  await expect(page.locator(".compliance-hero")).toHaveScreenshot("mpd-hero-desktop.png", componentScreenshot);
  await expect(page.locator("#section-b")).toHaveScreenshot("mpd-section-b-desktop.png", componentScreenshot);
});

test("document archive controls and records remain visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPage(page, "/documents");
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".skip-links").evaluate((element) => element.remove());

  await expect(page.locator(".archive-filter-panel")).toHaveScreenshot("document-filters-desktop.png", componentScreenshot);
  await expect(page.locator(".archive-card-grid")).toHaveScreenshot("document-records-desktop.png", componentScreenshot);
});

test("mandatory disclosure mobile table card remains visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await openPage(page, "/mandatory-public-disclosure#section-a");
  await page.locator(".skip-links").evaluate((element) => element.remove());
  const firstFact = page.locator(".compliance-table--facts tbody tr").first();
  await firstFact.scrollIntoViewIfNeeded();

  await expect(firstFact).toHaveScreenshot("mpd-mobile-fact-card.png", componentScreenshot);
});

test("admissions landing journey remains visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPage(page, "/admissions");
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".skip-links").evaluate((element) => element.remove());

  await expect(page.locator(".admissions-hero")).toHaveScreenshot("admissions-hero-desktop.png", componentScreenshot);
  await expect(page.locator(".admissions-start")).toHaveScreenshot("admissions-actions-desktop.png", componentScreenshot);
});

test("age-rule gate remains visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPage(page, "/admissions/age-criteria");
  await page.locator(".skip-links").evaluate((element) => element.remove());
  const checker = page.locator(".eligibility-checker");
  await checker.scrollIntoViewIfNeeded();

  await expect(checker).toHaveScreenshot("admissions-age-checker-desktop.png", componentScreenshot);
});

test("mobile admissions enquiry remains visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await openPage(page, "/admissions/enquire");
  await page.locator(".skip-links").evaluate((element) => element.remove());
  const form = page.locator(".admissions-form");
  await form.scrollIntoViewIfNeeded();

  await expect(form).toHaveScreenshot("admissions-enquiry-mobile.png", componentScreenshot);
});
