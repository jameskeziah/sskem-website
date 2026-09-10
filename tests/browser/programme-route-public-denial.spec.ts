import { expect, test } from "@playwright/test";

const routes = ["/school/academics", "/junior-college", "/programmes/jee-neet"] as const;

for (const route of routes) {
  test(`${route} serves the approved profile outside private-review mode`, async ({ page }) => {
    test.skip(process.env.HOMEPAGE_REVIEW_MODE === "private", "Private-review builds exercise these routes in the profile suite.");

    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main[data-programme-profile]")).toHaveAttribute("data-publication-state", "approved-public-subset");
    await expect(page.getByText("Private deployment preview", { exact: true })).toHaveCount(0);
  });
}
