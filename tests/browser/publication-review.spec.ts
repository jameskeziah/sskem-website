import { expect, test } from "@playwright/test";

test("prioritises campus-media approval and filters the canonical queue", async ({ page }) => {
  await page.goto("/publication-review");

  await expect(page.getByRole("heading", { level: 1, name: "Approval queue" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "33 governed records" })).toBeVisible();

  const firstBatch = page.getByRole("region", { name: "Approve the four campus photographs first." });
  await expect(firstBatch.getByText("Start here")).toHaveCount(4);

  await page.getByLabel("Content type").selectOption("document");
  await page.getByLabel("Decision").selectOption("blocked");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page).toHaveURL(/kind=document&decision=blocked/);
  await expect(page.getByText("Showing 12 of 33 records.")).toBeVisible();
});

test("downloads the private coordination worksheet", async ({ page }) => {
  await page.goto("/publication-review");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download review worksheet" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("sskem-publication-approval-queue-2026-08-10.csv");
});
