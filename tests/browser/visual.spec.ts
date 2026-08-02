import { expect, test } from "@playwright/test";

test("desktop foundation hero and pathway contract remain visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator(".site-header")).toHaveScreenshot("site-header-desktop.png");
  await expect(page.locator(".phase-hero")).toHaveScreenshot("phase-hero-desktop.png");
  await expect(page.locator("#navigation-contract")).toHaveScreenshot("navigation-contract-desktop.png");
});

test("mobile navigation remains visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();

  await expect(page).toHaveScreenshot("mobile-navigation.png");
});

test("form component states remain visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/");
  const controls = page.locator("#controls");
  await controls.scrollIntoViewIfNeeded();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.locator(".skip-link").evaluate((element) => element.remove());

  await expect(controls).toHaveScreenshot("control-states-laptop.png");
});

test("mandatory disclosure structure remains visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/mandatory-public-disclosure");
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".skip-link").evaluate((element) => element.remove());

  await expect(page.locator(".compliance-hero")).toHaveScreenshot("mpd-hero-desktop.png");
  await expect(page.locator("#section-b")).toHaveScreenshot("mpd-section-b-desktop.png");
});

test("document archive controls and records remain visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/documents");
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".skip-link").evaluate((element) => element.remove());

  await expect(page.locator(".archive-filter-panel")).toHaveScreenshot("document-filters-desktop.png");
  await expect(page.locator(".archive-card-grid")).toHaveScreenshot("document-records-desktop.png");
});

test("mandatory disclosure mobile table card remains visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto("/mandatory-public-disclosure#section-a");
  await page.locator(".skip-link").evaluate((element) => element.remove());
  const firstFact = page.locator(".compliance-table--facts tbody tr").first();
  await firstFact.scrollIntoViewIfNeeded();

  await expect(firstFact).toHaveScreenshot("mpd-mobile-fact-card.png");
});

test("admissions landing journey remains visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admissions");
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".skip-link").evaluate((element) => element.remove());

  await expect(page.locator(".admissions-hero")).toHaveScreenshot("admissions-hero-desktop.png");
  await expect(page.locator(".admissions-landing-actions")).toHaveScreenshot("admissions-actions-desktop.png");
});

test("age-rule gate remains visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/admissions/age-criteria");
  await page.locator(".skip-link").evaluate((element) => element.remove());
  const checker = page.locator(".eligibility-checker");
  await checker.scrollIntoViewIfNeeded();

  await expect(checker).toHaveScreenshot("admissions-age-checker-desktop.png");
});

test("mobile admissions enquiry remains visually stable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto("/admissions/enquire");
  await page.locator(".skip-link").evaluate((element) => element.remove());
  const form = page.locator(".admissions-form");
  await form.scrollIntoViewIfNeeded();

  await expect(form).toHaveScreenshot("admissions-enquiry-mobile.png");
});
