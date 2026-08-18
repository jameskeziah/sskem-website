import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import manifestData from "../content/approval-manifest.json" with { type: "json" };
import pipeline from "../content/campus-media-pipeline.json" with { type: "json" };
import {
  CAMPUS_MEDIA_BATCH_STAGING_ACKNOWLEDGEMENT,
  executeCampusMediaBatchStaging,
} from "../lib/campus-media-batch-staging.mjs";
import { campusMediaProjectRoot } from "../lib/campus-media-pipeline.mjs";
import {
  CAMPUS_MEDIA_PUBLICATION_BATCH_PLAN_ID,
  auditCampusMediaStagingBatch,
  createCampusMediaPublicationBatchPlan,
} from "../lib/campus-media-publication-batch-plan.mjs";
import {
  campusMediaPublicationRegistry,
  validateCampusMediaPublicationRegistry,
} from "../lib/campus-media-publication.ts";
import {
  campusMasterPreflightRecordIds,
  createCampusMasterPreflightReport,
} from "../lib/campus-master-preflight.ts";
import { validateApprovalManifest } from "../lib/approval-manifest.mjs";

const NOW = "2026-08-18T12:00:00.000Z";
const fixtureRoot = path.join(campusMediaProjectRoot, "work", "campus-publication-plan-fixtures");
const stagingRoot = path.join(campusMediaProjectRoot, "work", "media-intake");

function approvedManifest() {
  const manifest = structuredClone(manifestData);
  manifest.updatedOn = "2026-08-18";
  for (const [index, recordId] of campusMasterPreflightRecordIds.entries()) {
    const record = manifest.records.find((candidate) => candidate.id === recordId);
    record.checks = Object.fromEntries(Object.keys(record.checks).map((check) => [check, "verified"]));
    record.decision = "approved";
    record.evidenceReferences = [`CONTROLLED/CAMPUS-PUBLICATION-${index + 1}`];
    record.approvedByRole = "school-management";
    record.approvedAt = NOW;
    record.expiresAt = null;
  }
  assert.deepEqual(validateApprovalManifest(manifest), []);
  return manifest;
}

async function createFixture() {
  await mkdir(fixtureRoot, { recursive: true });
  const directory = await mkdtemp(path.join(fixtureRoot, "plan-"));
  const stagingPath = path.join(stagingRoot, `campus-publication-plan-${process.pid}-${Date.now()}`);
  const inputs = {};
  const measurements = [];
  for (const [index, recordId] of campusMasterPreflightRecordIds.entries()) {
    const inputPath = path.join(directory, `${recordId}.jpg`);
    await sharp({
      create: {
        width: 2400,
        height: 1350,
        channels: 3,
        background: { r: 110 + index * 20, g: 50 + index * 15, b: 140 + index * 15 },
      },
    }).jpeg({ quality: 90 }).toFile(inputPath);
    const bytes = await readFile(inputPath);
    inputs[recordId] = inputPath;
    measurements.push({
      recordId,
      format: "jpeg",
      mimeType: "image/jpeg",
      bytes: bytes.length,
      width: 2400,
      height: 1350,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      browserDecoded: true,
    });
  }
  const report = createCampusMasterPreflightReport({ measurements, pipeline, now: NOW }).report;
  await executeCampusMediaBatchStaging({
    report,
    inputs,
    outputPath: stagingPath,
    config: pipeline,
    manifest: manifestData,
    now: NOW,
    apply: true,
    acknowledgement: CAMPUS_MEDIA_BATCH_STAGING_ACKNOWLEDGEMENT,
  });
  return { directory, stagingPath };
}

test("verifies the complete staged batch and produces one read-only first-publication plan", async (context) => {
  const fixture = await createFixture();
  const registryPath = path.join(fixture.directory, "campus-media-publication-bindings.json");
  const publicRoot = path.join(fixture.directory, "public-media");
  const originalRegistryText = `${JSON.stringify(campusMediaPublicationRegistry, null, 2)}\n`;
  await writeFile(registryPath, originalRegistryText, "utf8");
  context.after(async () => {
    await rm(fixture.directory, { recursive: true, force: true });
    await rm(fixture.stagingPath, { recursive: true, force: true });
  });

  const manifest = approvedManifest();
  const plan = await createCampusMediaPublicationBatchPlan({
    stagingPath: fixture.stagingPath,
    registryPath,
    publicRoot,
    manifest,
    now: NOW,
  });

  assert.equal(plan.planId, CAMPUS_MEDIA_PUBLICATION_BATCH_PLAN_ID);
  assert.equal(plan.status, "ready-for-explicit-first-publication");
  assert.match(plan.publicationBatchId, /^campus-first-publication-[a-f0-9]{12}$/);
  assert.match(plan.stagingBatchSha256, /^[a-f0-9]{64}$/);
  assert.equal(plan.records.length, 4);
  assert.ok(plan.records.every((record) => record.approvalReady && record.stagingVerified && record.publicTargetState === "absent"));
  assert.ok(plan.records.every((record) => record.variants === 15 && /^[a-f0-9]{64}$/.test(record.sourceSha256)));
  assert.equal(plan.nextRegistry.bindings.length, 4);
  assert.deepEqual(validateCampusMediaPublicationRegistry({ registry: plan.nextRegistry, manifest, now: NOW }), []);
  assert.equal(plan.guardrails.planOnly, true);
  assert.equal(plan.guardrails.publicFilesWritten, false);
  assert.equal(plan.guardrails.registryWritePerformed, false);
  assert.equal(plan.guardrails.deploymentPerformed, false);
  assert.equal(await readFile(registryPath, "utf8"), originalRegistryText);
  await assert.rejects(readFile(path.join(publicRoot, "media-campus-main", "intake-receipt.json"), "utf8"), /ENOENT/);

  const stagedAudit = await auditCampusMediaStagingBatch({ stagingPath: fixture.stagingPath, now: NOW, config: pipeline });
  assert.equal(stagedAudit.status, "verified");
  const replacementBlocked = await createCampusMediaPublicationBatchPlan({
    manifest,
    registry: plan.nextRegistry,
    stagedAudit,
    publicTargetStates: campusMasterPreflightRecordIds.map((recordId) => ({ recordId, state: "absent" })),
    now: NOW,
  });
  assert.equal(replacementBlocked.status, "blocked");
  assert.match(replacementBlocked.blockers.join(" "), /refuses an existing campus binding/i);

  const occupiedTarget = await createCampusMediaPublicationBatchPlan({
    manifest,
    registry: campusMediaPublicationRegistry,
    stagedAudit,
    publicTargetStates: campusMasterPreflightRecordIds.map((recordId, index) => ({ recordId, state: index === 0 ? "directory" : "absent" })),
    now: NOW,
  });
  assert.equal(occupiedTarget.status, "blocked");
  assert.match(occupiedTarget.blockers.join(" "), /public target is not absent/i);
});

test("reports the current repository honestly blocked without staging or approvals", async () => {
  const missingStagingPath = path.join(stagingRoot, `missing-publication-plan-${process.pid}-${Date.now()}`);
  const plan = await createCampusMediaPublicationBatchPlan({
    stagingPath: missingStagingPath,
    manifest: manifestData,
    registry: campusMediaPublicationRegistry,
    publicTargetStates: campusMasterPreflightRecordIds.map((recordId) => ({ recordId, state: "absent" })),
    now: NOW,
  });

  assert.equal(plan.status, "blocked");
  assert.equal(plan.publicationBatchId, null);
  assert.equal(plan.records.filter((record) => record.approvalReady).length, 0);
  assert.match(plan.blockers.join(" "), /atomic campus staging receipt is missing or unreadable/i);
  assert.match(plan.blockers.join(" "), /media-campus-main does not have a current approved media decision/i);
  assert.equal(plan.guardrails.approvalGranted, false);
  assert.equal(plan.guardrails.publicFilesWritten, false);
});

test("publishes a permanently read-only planner command and operating guidance", async () => {
  const [script, library, packageText, guide, brief, readme, page] = await Promise.all([
    readFile(new URL("../scripts/plan-campus-media-publication-batch.mjs", import.meta.url), "utf8"),
    readFile(new URL("../lib/campus-media-publication-batch-plan.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../docs/campus-media-ingestion.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/campus-media-brief.md", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/campus-master-preflight/page.tsx", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageText);

  assert.match(packageJson.scripts["media:publish-batch-plan"], /plan-campus-media-publication-batch/);
  assert.match(packageJson.scripts["test:contract"], /campus-media-publication-batch-plan\.test/);
  assert.match(packageJson.scripts["test:review"], /campus-media-publication-batch-plan\.test/);
  assert.doesNotMatch(script, /argument === "--apply"|argument === "--replace"/);
  assert.doesNotMatch(script, /writeFile|rename|rm\(/);
  assert.match(library, /verifyCampusMediaBindingArtifacts/);
  assert.doesNotMatch(library, /export async function execute/);
  assert.match(guide, /media:publish-batch-plan/i);
  assert.match(brief, /first-publication planner/i);
  assert.match(readme, /first-publication planner/i);
  assert.match(page, /media:publish-batch-plan/i);
});
