import { expect, test } from "@playwright/test";

const routes = ["/school/academics", "/junior-college", "/programmes/jee-neet"] as const;

for (const route of routes) {
  test(`${route} returns not found outside private-review mode`, async ({ page }) => {
    test.skip(process.env.HOMEPAGE_REVIEW_MODE === "private", "Private-review builds exercise these routes in the shell suite.");

    const response = await page.goto(route);
    expect(response?.status()).toBe(404);
    await expect(page.locator("main[data-private-programme-shell]")).toHaveCount(0);
  });
}
