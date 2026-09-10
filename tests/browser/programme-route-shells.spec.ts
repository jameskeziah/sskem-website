import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  { path: "/school/academics", title: "A verified profile of our CBSE school." },
  { path: "/junior-college", title: "Higher Secondary education, clearly identified." },
  { path: "/programmes/jee-neet", title: "Structured NEET-UG preparation." },
] as const;

for (const route of routes) {
  test(`${route.path} renders the approved public subset in private deployment review`, async ({ page }) => {
    const response = await page.goto(route.path);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: route.title })).toBeVisible();
    await expect(page.getByText("Private deployment preview", { exact: true })).toBeVisible();
    await expect(page.locator("main[data-programme-profile]")).toHaveAttribute("data-publication-state", "approved-public-subset");
    await expect(page.getByRole("heading", { level: 2, name: "What is confirmed now." })).toBeVisible();
    await expect(page.locator(".programme-fact-grid > div").first()).toBeVisible();
    await expect(page.locator(".programme-media-slot, main img, main video")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /nofollow/);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  });

  test(`${route.path} reflows at the 320px review boundary`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(route.path);

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(1);
  });
}

test("related programme navigation stays inside the approved profile set", async ({ page }) => {
  await page.goto("/school/academics");
  const routeNavigation = page.getByRole("navigation", { name: "Related programme profiles" });

  await expect(routeNavigation.getByRole("link")).toHaveCount(2);
  await routeNavigation.getByRole("link", { name: "Junior College" }).click();
  await expect(page).toHaveURL(/\/junior-college$/);
  await expect(page.getByRole("heading", { level: 1, name: "Higher Secondary education, clearly identified." })).toBeVisible();
});
