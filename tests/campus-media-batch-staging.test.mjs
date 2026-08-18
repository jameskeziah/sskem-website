import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import manifest from "../content/approval-manifest.json" with { type: "json" };
import pipeline from "../content/campus-media-pipeline.json" with { type: "json" };
import {
  CAMPUS_MEDIA_BATCH_STAGING_ACKNOWLEDGEMENT,
  CAMPUS_MEDIA_BATCH_STAGING_ID,
  createCampusMediaBatchStagingPlan,
  executeCampusMediaBatchStaging,
} from "../lib/campus-media-batch-staging.mjs";
import { campusMediaProjectRoot } from "../lib/campus-media-pipeline.mjs";
import {
  campusMasterPreflightRecordIds,
  createCampusMasterPreflightReport,
} from "../lib/campus-master-preflight.ts";

const NOW = "2026-08-18T12:00:00.000Z";
const fixtureRoot = path.join(campusMediaProjectRoot, "work", "campus-batch-staging-fixtures");
const stagingRoot = path.join(campusMediaProjectRoot, "work", "media-intake");

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function createFixture() {
  await mkdir(fixtureRoot, { recursive: true });
  const directory = await mkdtemp(path.join(fixtureRoot, "batch-"));
  const inputs = {};
  const measurements = [];
  for (const [index, recordId] of campusMasterPreflightRecordIds.entries()) {
    const inputPath = path.join(directory, `${recordId}.jpg`);
    await sharp({
      create: {
        width: 2400,
        height: 1350,
        channels: 3,
        background: { r: 120 + index * 25, g: 45 + index * 10, b: 110 + index * 20 },
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
  const completion = createCampusMasterPreflightReport({ measurements, pipeline, now: NOW });
  return { directory, inputs, report: completion.report };
}

test("plans without writing, then atomically stages all four exact masters after acknowledgement", async (context) => {
  const fixture = await createFixture();
  const outputPath = path.join(stagingRoot, `campus-batch-success-${process.pid}-${Date.now()}`);
  context.after(async () => {
    await rm(fixture.directory, { recursive: true, force: true });
    await rm(outputPath, { recursive: true, force: true });
  });

  const plan = await executeCampusMediaBatchStaging({
    report: fixture.report,
    inputs: fixture.inputs,
    outputPath,
    config: pipeline,
    manifest,
    now: NOW,
  });
  assert.equal(plan.mode, "read-only-plan");
  assert.equal(plan.status, "ready-for-explicit-write");
  assert.equal(plan.guardrails.derivativesWritten, false);
  assert.equal(await exists(outputPath), false);

  await assert.rejects(
    executeCampusMediaBatchStaging({
      report: fixture.report,
      inputs: fixture.inputs,
      outputPath,
      config: pipeline,
      manifest,
      now: NOW,
      apply: true,
    }),
    /exact acknowledgement is required/i,
  );
  assert.equal(await exists(outputPath), false);

  const result = await executeCampusMediaBatchStaging({
    report: fixture.report,
    inputs: fixture.inputs,
    outputPath,
    config: pipeline,
    manifest,
    now: NOW,
    apply: true,
    acknowledgement: CAMPUS_MEDIA_BATCH_STAGING_ACKNOWLEDGEMENT,
  });
  const serializedReceipt = JSON.stringify(result.batchReceipt);

  assert.equal(result.mode, "local-atomic-staging-write");
  assert.equal(result.batchId, CAMPUS_MEDIA_BATCH_STAGING_ID);
  assert.equal(result.status, "staged-for-private-review");
  assert.equal(result.recordsStaged, 4);
  assert.equal(result.derivativesStaged, 60);
  assert.equal(result.backupCleanupPending, false);
  assert.equal(result.batchReceipt.records.length, 4);
  assert.equal(result.guardrails.approvalGranted, false);
  assert.equal(result.guardrails.publicWritePerformed, false);
  assert.doesNotMatch(serializedReceipt, /"fileName":|"sourcePath":|"controlledPath":|"approvedBy":|[a-z]:\\/i);

  const batchFiles = await readdir(outputPath);
  assert.ok(batchFiles.includes("batch-intake-receipt.json"));
  for (const recordId of campusMasterPreflightRecordIds) {
    const recordFiles = await readdir(path.join(outputPath, recordId));
    assert.equal(recordFiles.length, 16);
    assert.ok(recordFiles.includes("intake-receipt.json"));
  }
});

test("removes the complete temporary batch when any record preparation fails", async (context) => {
  const fixture = await createFixture();
  const outputPath = path.join(stagingRoot, `campus-batch-failure-${process.pid}-${Date.now()}`);
  context.after(async () => {
    await rm(fixture.directory, { recursive: true, force: true });
    await rm(outputPath, { recursive: true, force: true });
  });
  let preparedCount = 0;

  await assert.rejects(
    executeCampusMediaBatchStaging({
      report: fixture.report,
      inputs: fixture.inputs,
      outputPath,
      config: pipeline,
      manifest,
      now: NOW,
      apply: true,
      acknowledgement: CAMPUS_MEDIA_BATCH_STAGING_ACKNOWLEDGEMENT,
      prepareMedia: async ({ recordId, outputPath: recordOutput }) => {
        preparedCount += 1;
        if (recordId === "media-campus-entrance") throw new Error("Simulated preparation failure.");
        await mkdir(recordOutput, { recursive: true });
        await writeFile(path.join(recordOutput, "partial.txt"), "temporary", "utf8");
        const expected = fixture.report.records.find((record) => record.recordId === recordId);
        return {
          receipt: {
            source: { bytes: expected.bytes, sha256: expected.sha256 },
            output: { profile: "campus-responsive", crop: "none", variants: Array.from({ length: 15 }, () => ({})) },
          },
        };
      },
    }),
    /simulated preparation failure/i,
  );

  assert.equal(preparedCount, 3);
  assert.equal(await exists(outputPath), false);
  const parentEntries = await readdir(path.dirname(outputPath));
  assert.ok(!parentEntries.some((entry) => entry.startsWith(`${path.basename(outputPath)}.tmp-`)));
});

test("blocks silent replacement while preserving the existing private staging batch", async (context) => {
  const fixture = await createFixture();
  const outputPath = path.join(stagingRoot, `campus-batch-existing-${process.pid}-${Date.now()}`);
  await mkdir(outputPath, { recursive: true });
  await writeFile(path.join(outputPath, "review-marker.txt"), "retain", "utf8");
  context.after(async () => {
    await rm(fixture.directory, { recursive: true, force: true });
    await rm(outputPath, { recursive: true, force: true });
  });

  const blocked = await createCampusMediaBatchStagingPlan({
    report: fixture.report,
    inputs: fixture.inputs,
    outputPath,
    config: pipeline,
    manifest,
    now: NOW,
  });
  assert.equal(blocked.status, "blocked");
  assert.match(blocked.blockers.join(" "), /already exists/i);

  await assert.rejects(
    executeCampusMediaBatchStaging({
      report: fixture.report,
      inputs: fixture.inputs,
      outputPath,
      config: pipeline,
      manifest,
      now: NOW,
      apply: true,
      acknowledgement: CAMPUS_MEDIA_BATCH_STAGING_ACKNOWLEDGEMENT,
    }),
    /staging is blocked/i,
  );
  assert.equal(await readFile(path.join(outputPath, "review-marker.txt"), "utf8"), "retain");

  const replacePlan = await createCampusMediaBatchStagingPlan({
    report: fixture.report,
    inputs: fixture.inputs,
    outputPath,
    replace: true,
    config: pipeline,
    manifest,
    now: NOW,
  });
  assert.equal(replacePlan.status, "ready-for-explicit-write");
  assert.match(replacePlan.existingTargetFingerprint, /^[a-f0-9]{64}$/);
});

test("publishes a guarded batch-staging command and documents the private-only boundary", async () => {
  const [script, packageText, guide, brief, readme, page] = await Promise.all([
    readFile(new URL("../scripts/stage-campus-media-batch.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../docs/campus-media-ingestion.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/campus-media-brief.md", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/campus-master-preflight/page.tsx", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageText);

  assert.match(packageJson.scripts["media:stage-batch"], /stage-campus-media-batch/);
  assert.match(packageJson.scripts["test:contract"], /campus-media-batch-staging\.test/);
  assert.match(packageJson.scripts["test:review"], /campus-media-batch-staging\.test/);
  assert.match(script, /--apply/);
  assert.match(script, /--replace/);
  assert.match(script, /acknowledge-local-write/);
  assert.match(guide, /media:stage-batch/i);
  assert.match(brief, /atomic four-master staging/i);
  assert.match(readme, /atomic staging batch/i);
  assert.match(page, /media:stage-batch/i);
});
