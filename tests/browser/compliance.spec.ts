import { expect, test } from "@playwright/test";

test("archive filters submit through a normal GET request", async ({ page }) => {
  await page.goto("/documents");
  await page.getByLabel("Document category").selectOption("safety-certificates");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page).toHaveURL(/category=safety-certificates/);
  await expect(page.locator(".archive-card")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: /building-safety certificate/i })).toBeVisible();
});

test("missing mandatory files expose records without fake downloads", async ({ page }) => {
  await page.goto("/mandatory-public-disclosure");

  await expect(page.getByText("Compliance action required").first()).toBeVisible();
  await expect(page.getByText("Approved public PDF pending").first()).toBeVisible();
  await expect(page.locator('a[href*="wp-content/uploads"]')).toHaveCount(0);
  await expect(page.locator('a[href="#"]')).toHaveCount(0);
});

test("print mode preserves disclosure content and removes site controls", async ({ page }) => {
  await page.goto("/mandatory-public-disclosure");
  await page.emulateMedia({ media: "print" });

  await expect(page.getByRole("heading", { name: "Mandatory Public Disclosure", level: 1 })).toBeVisible();
  await expect(page.locator("#section-a")).toBeVisible();
  await expect(page.locator(".site-header")).toBeHidden();
  await expect(page.locator(".print-action")).toBeHidden();
});

test("mobile disclosure tables retain labelled reading order", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/mandatory-public-disclosure#section-b");

  const firstRow = page.locator(".compliance-table--documents tbody tr").first();
  await expect(firstRow).toBeVisible();
  await expect(firstRow.getByText("Affiliation/upgradation letter and latest extension")).toBeVisible();
  await expect(firstRow.locator('td[data-label="Document metadata"]')).toBeVisible();
});
