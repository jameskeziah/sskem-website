import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import manifestData from "../content/approval-manifest.json" with { type: "json" };
import pipeline from "../content/campus-media-pipeline.json" with { type: "json" };
import {
  CAMPUS_MEDIA_BATCH_STAGING_ACKNOWLEDGEMENT,
  executeCampusMediaBatchStaging,
} from "../lib/campus-media-batch-staging.mjs";
import {
  CAMPUS_MEDIA_PUBLICATION_BATCH_ACKNOWLEDGEMENT,
  executeCampusMediaPublicationBatch,
} from "../lib/campus-media-publication-batch-execution.mjs";
import { campusMediaProjectRoot } from "../lib/campus-media-pipeline.mjs";
import {
  campusMediaPublicationRegistry,
  validateCampusMediaPublicationRegistry,
} from "../lib/campus-media-publication.ts";
import {
  campusMasterPreflightRecordIds,
  createCampusMasterPreflightReport,
} from "../lib/campus-master-preflight.ts";
import { validateApprovalManifest } from "../lib/approval-manifest.mjs";

const NOW = "2026-08-18T13:00:00.000Z";
const fixtureRoot = path.join(campusMediaProjectRoot, "work", "campus-publication-execution-fixtures");
const stagingRoot = path.join(campusMediaProjectRoot, "work", "media-intake");

function approvedManifest() {
  const manifest = structuredClone(manifestData);
  manifest.updatedOn = "2026-08-18";
  for (const [index, recordId] of campusMasterPreflightRecordIds.entries()) {
    const record = manifest.records.find((candidate) => candidate.id === recordId);
    record.checks = Object.fromEntries(Object.keys(record.checks).map((check) => [check, "verified"]));
    record.decision = "approved";
    record.evidenceReferences = [`CONTROLLED/CAMPUS-PUBLICATION-EXECUTION-${index + 1}`];
    record.approvedByRole = "school-management";
    record.approvedAt = NOW;
    record.expiresAt = null;
  }
  assert.deepEqual(validateApprovalManifest(manifest), []);
  return manifest;
}

async function createFixture(context) {
  await mkdir(fixtureRoot, { recursive: true });
  const directory = await mkdtemp(path.join(fixtureRoot, "publish-"));
  const stagingPath = path.join(stagingRoot, `campus-publication-execution-${process.pid}-${Date.now()}`);
  const registryPath = path.join(directory, "campus-media-publication-bindings.json");
  const publicRoot = path.join(directory, "public-media", "production");
  const inputs = {};
  const measurements = [];
  for (const [index, recordId] of campusMasterPreflightRecordIds.entries()) {
    const inputPath = path.join(directory, `${recordId}.jpg`);
    await sharp({
      create: {
        width: 2400,
        height: 1350,
        channels: 3,
        background: { r: 90 + index * 25, g: 60 + index * 20, b: 135 + index * 15 },
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
  const registryText = `${JSON.stringify(campusMediaPublicationRegistry, null, 2)}\n`;
  await writeFile(registryPath, registryText, "utf8");
  context.after(async () => {
    await rm(directory, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
    await rm(stagingPath, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  });
  return { directory, publicRoot, registryPath, registryText, stagingPath };
}

test("publishes and activates the exact four-record batch together with rollback before registry commit", async (context) => {
  const fixture = await createFixture(context);
  const manifest = approvedManifest();
  const options = {
    stagingPath: fixture.stagingPath,
    registryPath: fixture.registryPath,
    publicRoot: fixture.publicRoot,
    manifest,
    now: NOW,
  };

  const planned = await executeCampusMediaPublicationBatch(options);
  assert.equal(planned.mode, "local-plan");
  assert.equal(planned.plan.status, "ready-for-explicit-first-publication");
  assert.match(planned.plan.publicationBatchId, /^campus-first-publication-[a-f0-9]{12}$/);
  await assert.rejects(stat(fixture.publicRoot), /ENOENT/);
  assert.equal(await readFile(fixture.registryPath, "utf8"), fixture.registryText);

  await assert.rejects(
    executeCampusMediaPublicationBatch({
      ...options,
      apply: true,
      acknowledgement: CAMPUS_MEDIA_PUBLICATION_BATCH_ACKNOWLEDGEMENT,
      publicationBatchId: "campus-first-publication-000000000000",
    }),
    /requires --publication-batch-id=.*?No public or registry write/i,
  );

  await assert.rejects(
    executeCampusMediaPublicationBatch({
      ...options,
      apply: true,
      acknowledgement: CAMPUS_MEDIA_PUBLICATION_BATCH_ACKNOWLEDGEMENT,
      publicationBatchId: planned.plan.publicationBatchId,
      beforeRegistryCommit: async () => {
        throw new Error("Injected registry commit failure.");
      },
    }),
    /Injected registry commit failure/,
  );
  await assert.rejects(stat(fixture.publicRoot), /ENOENT/);
  assert.equal(await readFile(fixture.registryPath, "utf8"), fixture.registryText);
  assert.equal((await stat(fixture.stagingPath)).isDirectory(), true);

  const applied = await executeCampusMediaPublicationBatch({
    ...options,
    apply: true,
    acknowledgement: CAMPUS_MEDIA_PUBLICATION_BATCH_ACKNOWLEDGEMENT,
    publicationBatchId: planned.plan.publicationBatchId,
  });
  assert.equal(applied.mode, "local-atomic-first-publication");
  assert.equal(applied.status, "published-and-activated-locally");
  assert.equal(applied.receipt.recordsPublished, 4);
  assert.equal(applied.receipt.derivativesPublished, 60);
  assert.equal(applied.receipt.stagingPreserved, true);
  assert.equal(applied.receipt.deploymentPerformed, false);
  const registry = JSON.parse(await readFile(fixture.registryPath, "utf8"));
  assert.equal(registry.bindings.length, 4);
  assert.deepEqual(validateCampusMediaPublicationRegistry({ registry, manifest, now: NOW }), []);

  for (const recordId of campusMasterPreflightRecordIds) {
    const files = await readdir(path.join(fixture.publicRoot, recordId));
    assert.equal(files.length, 16);
    const receipt = JSON.parse(await readFile(path.join(fixture.publicRoot, recordId, "intake-receipt.json"), "utf8"));
    assert.equal(receipt.mode, "public");
    assert.equal(receipt.decisionAtPreparation, "approved");
    assert.equal(receipt.output.variants.length, 15);
    assert.doesNotMatch(JSON.stringify(receipt), /"(?:fileName|sourcePath|sourceFilename|approver|consent|evidenceReferences|token)"\s*:/);
  }
  assert.equal((await stat(fixture.stagingPath)).isDirectory(), true);

  const repeated = await executeCampusMediaPublicationBatch(options);
  assert.equal(repeated.plan.status, "blocked");
  assert.match(repeated.plan.blockers.join(" "), /refuses an existing campus binding/i);
  assert.match(repeated.plan.blockers.join(" "), /media root is not absent/i);
});

test("keeps the batch publisher blocked in the current repository and documents its guarded command", async () => {
  const [result, script, library, packageText, guide, brief, readme, page] = await Promise.all([
    executeCampusMediaPublicationBatch({
      stagingPath: path.join(stagingRoot, `missing-execution-${process.pid}-${Date.now()}`),
      manifest: manifestData,
      now: NOW,
    }),
    readFile(new URL("../scripts/publish-campus-media-batch.mjs", import.meta.url), "utf8"),
    readFile(new URL("../lib/campus-media-publication-batch-execution.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../docs/campus-media-ingestion.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/campus-media-brief.md", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/campus-master-preflight/page.tsx", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageText);

  assert.equal(result.mode, "local-plan");
  assert.equal(result.plan.status, "blocked");
  assert.match(result.plan.blockers.join(" "), /staging receipt is missing or unreadable/i);
  assert.match(packageJson.scripts["media:publish-batch"], /publish-campus-media-batch/);
  assert.match(packageJson.scripts["test:contract"], /campus-media-publication-batch-execution\.test/);
  assert.match(packageJson.scripts["test:review"], /campus-media-publication-batch-execution\.test/);
  assert.doesNotMatch(script, /argument === "--replace"/);
  assert.match(script, /publication-batch-id/);
  assert.match(library, /beforeRegistryCommit/);
  assert.match(library, /renameWithRetry\(temporaryPublicRoot, publicRoot\)/);
  assert.match(guide, /media:publish-batch/i);
  assert.match(brief, /atomic first-publication executor/i);
  assert.match(readme, /atomic first-publication executor/i);
  assert.match(page, /media:publish-batch/i);
});
