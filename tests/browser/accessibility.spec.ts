import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/", "/mandatory-public-disclosure", "/documents", "/admissions/enquire"]) {
  test(`has no serious automated accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const seriousViolations = results.violations.filter((violation) =>
      violation.impact === "serious" || violation.impact === "critical"
    );

    expect(seriousViolations).toEqual([]);
  });
}

test("has a concise landmark and heading structure", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Utility navigation" })).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toHaveCount(0);
  await expect(page.getByRole("contentinfo")).toHaveCount(1);

  await page.goto("/documents");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toHaveCount(1);
});
