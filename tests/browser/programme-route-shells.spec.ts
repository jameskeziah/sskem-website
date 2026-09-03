import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  { path: "/school/academics", title: "School academics" },
  { path: "/junior-college", title: "Junior College" },
  { path: "/programmes/jee-neet", title: "JEE and NEET preparation" },
] as const;

for (const route of routes) {
  test(`${route.path} renders only as a blocked private route shell`, async ({ page }) => {
    const response = await page.goto(route.path);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: route.title })).toBeVisible();
    await expect(page.getByText("Private review only", { exact: true })).toBeVisible();
    await expect(page.locator("main[data-private-programme-shell]")).toHaveAttribute("data-publication-state", "blocked");
    await expect(page.locator(".private-programme-shell__slots > li")).toHaveCount(10);
    await expect(page.getByRole("heading", { level: 2, name: "The shell is ready. Publication is not." })).toBeVisible();
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

test("private Programme shell switching stays inside the three governed routes", async ({ page }) => {
  await page.goto("/school/academics");
  const routeNavigation = page.getByRole("navigation", { name: "Private Programme route shells" });

  await expect(routeNavigation.getByRole("link")).toHaveCount(3);
  await routeNavigation.getByRole("link", { name: "Junior College" }).click();
  await expect(page).toHaveURL(/\/junior-college$/);
  await expect(page.getByRole("heading", { level: 1, name: "Junior College" })).toBeVisible();
});
