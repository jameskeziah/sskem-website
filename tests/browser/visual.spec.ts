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
