import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import approvalManifest from "../../content/approval-manifest.json" with { type: "json" };
import legacyCutoverInventory from "../../content/legacy-cutover-inventory.json" with { type: "json" };
import siteSettingsMigration from "../../content/editorial-site-settings-migration.json" with { type: "json" };

const governedRecordCount = approvalManifest.records.length;
const blockedDocuments = approvalManifest.records.filter((record) => record.kind === "document" && record.decision === "blocked");

test("prioritises campus-media approval and filters the canonical queue", async ({ page }) => {
  await page.goto("/publication-review");

  await expect(page.getByRole("heading", { level: 1, name: "Approval queue" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: `${governedRecordCount} governed records` })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Approved masters become responsive, privacy-clean assets." })).toBeVisible();
  await expect(page.getByText("AVIF · WebP · JPEG")).toBeVisible();
  await expect(page.getByRole("link", { name: "Download campus capture packet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Every PDF is rendered, checked and bound to its approval." })).toBeVisible();
  await expect(page.getByText("External malware-scan evidence and manifest approval remain mandatory.")).toBeVisible();
  const cutover = page.getByRole("region", { name: "Old WordPress links now have a controlled destination." });
  await expect(cutover).toBeVisible();
  await expect(cutover.getByText(String(legacyCutoverInventory.records.length), { exact: true })).toBeVisible();

  const firstBatch = page.getByRole("region", { name: "Approve the four campus photographs first." });
  await expect(firstBatch.getByText("Start here")).toHaveCount(4);

  await page.getByLabel("Content type").selectOption("document");
  await page.getByLabel("Decision").selectOption("blocked");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page).toHaveURL(/kind=document&decision=blocked/);
  await expect(page.getByText(`Showing ${blockedDocuments.length} of ${governedRecordCount} records.`)).toBeVisible();
  const queue = page.getByRole("region", { name: "Review every release dependency" });
  await expect(queue.locator(".review-card")).toHaveCount(blockedDocuments.length);
  for (const record of blockedDocuments) {
    await expect(queue.getByRole("heading", { level: 3, name: record.title, exact: true })).toBeVisible();
  }
});

test("downloads the private coordination worksheet", async ({ page }) => {
  await page.goto("/publication-review");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download review worksheet" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe(`sskem-publication-approval-queue-${approvalManifest.updatedOn}.csv`);
});

test("downloads the owner-only cutover worksheet", async ({ page }) => {
  await page.goto("/publication-review");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download cutover worksheet" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe(`sskem-legacy-cutover-${legacyCutoverInventory.capturedOn}.csv`);
});

test("downloads the guarded four-shot campus capture packet", async ({ page }) => {
  await page.goto("/publication-review");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download campus capture packet" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(download.suggestedFilename()).toMatch(/^sskem-campus-media-capture-\d{4}-\d{2}-\d{2}\.json$/);
  expect(path).not.toBeNull();

  const packet = JSON.parse(await readFile(path, "utf8"));
  expect(packet.status).toBe("capture-and-approval-required");
  expect(packet.summary).toEqual({ requiredShots: 4, approvedRecords: 0, activeBindings: 0 });
  expect(packet.shots).toHaveLength(4);
  expect(packet.guardrails.privateEvidenceIncluded).toBe(false);
  expect(packet.guardrails.pupilPhotographyRequested).toBe(false);
});

test("opens the private exact-output CMS review without exposing raw records", async ({ page }) => {
  await page.goto("/publication-review");
  await page.getByRole("link", { name: "Review exact CMS revisions" }).click();

  await expect(page).toHaveURL(/\/publication-review\/editorial$/);
  await expect(page.getByRole("heading", { level: 1, name: "Editorial revision review" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Raw CMS records never reach this screen." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No review candidates are available." })).toBeVisible();
  await expect(page.getByText("Verified local homepage content remains active.")).toBeVisible();
});

test("downloads the guarded first site settings migration packet", async ({ page }) => {
  await page.goto("/publication-review/editorial");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download first site settings packet" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(download.suggestedFilename()).toMatch(/^sskem-site-settings-migration-\d{4}-\d{2}-\d{2}\.json$/);
  expect(path).not.toBeNull();

  const packet = JSON.parse(await readFile(path, "utf8"));
  expect(packet.status).toBe("review-required");
  const referencedClaims = new Set(siteSettingsMigration.fields.map((field) => field.approvalRecordId));
  const blockingClaimIds = approvalManifest.records
    .filter((record) => referencedClaims.has(record.id) && record.decision !== "approved")
    .map((record) => record.id)
    .sort();
  expect(packet.blockingApprovalRecordIds).toEqual(blockingClaimIds);
  expect(packet.guardrails.externalWritePerformed).toBe(false);
  expect(packet.guardrails.approvalGrantedByPacket).toBe(false);
});

test("downloads an announcement intake packet without invented public copy", async ({ page }) => {
  await page.goto("/publication-review/editorial");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download announcement intake packet" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(download.suggestedFilename()).toMatch(/^sskem-announcement-intake-\d{4}-\d{2}-\d{2}\.json$/);
  expect(path).not.toBeNull();

  const packet = JSON.parse(await readFile(path, "utf8"));
  expect(packet.status).toBe("source-required");
  expect(packet.candidate).toBeNull();
  expect(packet.sanityDraft).toBeNull();
  expect(packet.blockingRequirements).toEqual(["authoritative-announcement-source", "matching-claim-approval-record"]);
  expect(packet.guardrails.placeholderCopyIncluded).toBe(false);
  expect(packet.guardrails.externalWritePerformed).toBe(false);
});

test("rejects editorial receipt requests without platform identity", async () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
  const response = await fetch(new URL("/publication-review/editorial-receipt?type=announcement&id=notice&revision=rev-1", baseUrl));

  expect(response.status).toBe(401);
  expect(response.headers.get("cache-control")).toBe("private, no-store");

  const packetResponse = await fetch(new URL("/publication-review/editorial-site-settings-packet", baseUrl));
  expect(packetResponse.status).toBe(401);
  expect(packetResponse.headers.get("cache-control")).toBe("private, no-store");

  const announcementPacketResponse = await fetch(new URL("/publication-review/editorial-announcement-packet", baseUrl));
  expect(announcementPacketResponse.status).toBe(401);
  expect(announcementPacketResponse.headers.get("cache-control")).toBe("private, no-store");

  const campusPacketResponse = await fetch(new URL("/publication-review/campus-media-packet", baseUrl));
  expect(campusPacketResponse.status).toBe(401);
  expect(campusPacketResponse.headers.get("cache-control")).toBe("private, no-store");
});
