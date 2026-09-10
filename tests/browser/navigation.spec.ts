import { expect, test } from "@playwright/test";

test("desktop submenu is keyboard operated and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const toggle = page.getByRole("button", { name: "Show School links" });
  await toggle.focus();
  await expect(toggle).toBeFocused();
  await toggle.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: /Academics/ })).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  await expect(page.getByRole("link", { name: "School", exact: true }).first()).toHaveAttribute("href", "/school");
});

test("mobile drawer traps focus, closes with Escape and preserves scroll", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "Open navigation" });
  await page.evaluate(() => window.scrollTo(0, 700));
  const before = await page.evaluate(() => window.scrollY);
  await menuButton.evaluate((button: HTMLButtonElement) => button.click());

  const drawer = page.getByRole("dialog", { name: "Site navigation" });
  await expect(drawer).toBeVisible();
  await expect(page.locator("#main-content")).toHaveAttribute("inert", "");
  expect(await drawer.evaluate((element) => element.contains(document.activeElement))).toBe(true);

  const lastControl = drawer.getByRole("link", { name: "Enquire now", exact: true });
  await lastControl.focus();
  await page.keyboard.press("Tab");
  expect(await drawer.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await expect(drawer.getByRole("link", { name: "SSKEMS home" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(menuButton).toBeFocused();
  await expect(page.locator("#main-content")).not.toHaveAttribute("inert", "");
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test("mobile navigation opens the current section and closes after navigation", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto("/admissions/enquire");
  await page.getByRole("button", { name: "Open navigation" }).click();

  const drawer = page.getByRole("dialog", { name: "Site navigation" });
  await expect(drawer.getByRole("button", { name: "Hide Admissions links" })).toHaveAttribute("aria-expanded", "true");
  await drawer.getByRole("link", { name: "Process", exact: true }).click();
  await expect(page).toHaveURL(/\/admissions\/process$/);
  await expect(drawer).toBeHidden();
});

test("skip links move keyboard focus to main content and the footer", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  await page.reload();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to footer" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#site-footer")).toBeFocused();
});

test("search dialog moves and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Search" });
  await trigger.click();
  const search = page.getByRole("searchbox", { name: "Search pages" });
  await expect(search).toBeFocused();
  await search.fill("faculty");
  await expect(page.getByRole("dialog", { name: "What are you looking for?" }).getByRole("link", { name: "Faculty", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("approved Programme profiles appear in navigation and sitemap", async ({ page, request }) => {
  await page.goto("/");
  const sitemap = await request.get("/sitemap.xml");
  const sitemapText = await sitemap.text();

  for (const route of ["/school/academics", "/junior-college", "/programmes/jee-neet"]) {
    expect(await page.locator(`header a[href="${route}"]`).count(), route).toBeGreaterThan(0);
    expect(await page.locator(`footer a[href="${route}"]`).count(), route).toBeGreaterThan(0);
    expect(sitemapText, route).toContain(route);
  }
});
