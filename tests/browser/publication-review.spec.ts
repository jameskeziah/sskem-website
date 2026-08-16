import { expect, test } from "@playwright/test";

test("prioritises campus-media approval and filters the canonical queue", async ({ page }) => {
  await page.goto("/publication-review");

  await expect(page.getByRole("heading", { level: 1, name: "Approval queue" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "33 governed records" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Approved masters become responsive, privacy-clean assets." })).toBeVisible();
  await expect(page.getByText("AVIF · WebP · JPEG")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Every PDF is rendered, checked and bound to its approval." })).toBeVisible();
  await expect(page.getByText("External malware-scan evidence and manifest approval remain mandatory.")).toBeVisible();
  const cutover = page.getByRole("region", { name: "Old WordPress links now have a controlled destination." });
  await expect(cutover).toBeVisible();
  await expect(cutover.getByText("33", { exact: true })).toBeVisible();

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

test("downloads the owner-only cutover worksheet", async ({ page }) => {
  await page.goto("/publication-review");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download cutover worksheet" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("sskem-legacy-cutover-2026-08-16.csv");
});
