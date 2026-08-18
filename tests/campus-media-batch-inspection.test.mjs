import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import manifest from "../content/approval-manifest.json" with { type: "json" };
import pipeline from "../content/campus-media-pipeline.json" with { type: "json" };
import {
  CAMPUS_MEDIA_BATCH_INSPECTION_ID,
  inspectCampusMediaBatch,
  validateCampusMasterPreflightReport,
} from "../lib/campus-media-batch-inspection.mjs";
import {
  campusMasterPreflightRecordIds,
  createCampusMasterPreflightReport,
} from "../lib/campus-master-preflight.ts";
import { campusMediaProjectRoot } from "../lib/campus-media-pipeline.mjs";

const NOW = "2026-08-18T12:00:00.000Z";
const fixtureRoot = path.join(campusMediaProjectRoot, "work", "campus-batch-inspection-fixtures");

async function createFixture(options = {}) {
  await mkdir(fixtureRoot, { recursive: true });
  const directory = await mkdtemp(path.join(fixtureRoot, "batch-"));
  const inputs = {};
  const measurements = [];
  for (const [index, recordId] of campusMasterPreflightRecordIds.entries()) {
    const dimensions = options.dimensions?.[recordId] ?? { width: 2400, height: 1350 };
    const inputPath = path.join(directory, `${recordId}.jpg`);
    await sharp({
      create: {
        width: dimensions.width,
        height: dimensions.height,
        channels: 3,
        background: { r: 150 + index * 20, g: 30 + index * 15, b: 95 + index * 10 },
      },
    }).jpeg({ quality: 90 }).toFile(inputPath);
    const bytes = await readFile(inputPath);
    inputs[recordId] = inputPath;
    measurements.push({
      recordId,
      format: "jpeg",
      mimeType: "image/jpeg",
      bytes: bytes.length,
      width: dimensions.width,
      height: dimensions.height,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      browserDecoded: true,
    });
  }
  const completion = createCampusMasterPreflightReport({ measurements, pipeline, now: NOW });
  return { directory, inputs, report: completion.report };
}

test("authoritatively inspects four exact preflight-bound masters as one read-only batch", async (context) => {
  const fixture = await createFixture();
  context.after(() => rm(fixture.directory, { recursive: true, force: true }));

  const result = await inspectCampusMediaBatch({
    report: fixture.report,
    inputs: fixture.inputs,
    config: pipeline,
    manifest,
    now: NOW,
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.batchId, CAMPUS_MEDIA_BATCH_INSPECTION_ID);
  assert.equal(result.status, "ready-for-staging");
  assert.equal(result.preflight.exactFilesMatched, 4);
  assert.equal(result.records.length, 4);
  assert.ok(result.records.every((record) => record.status === "ready-for-staging"));
  assert.ok(result.records.every((record) => record.source.colourSpace === "srgb"));
  assert.equal(result.guardrails.readOnlyInspection, true);
  assert.equal(result.guardrails.sourceFilenamesStored, false);
  assert.equal(result.guardrails.sourceLocationsStored, false);
  assert.equal(result.guardrails.derivativesWritten, false);
  assert.equal(result.guardrails.approvalGranted, false);
  assert.equal(result.guardrails.publicWritePerformed, false);
  assert.doesNotMatch(serialized, /"fileName":|"sourcePath":|"controlledPath":|"approvedBy":|[a-z]:\\/i);
});

test("fails the complete batch when any controlled file no longer matches browser preflight", async (context) => {
  const fixture = await createFixture();
  context.after(() => rm(fixture.directory, { recursive: true, force: true }));
  await writeFile(fixture.inputs["media-campus-entrance"], Buffer.from("changed after browser preflight"));

  await assert.rejects(
    inspectCampusMediaBatch({ report: fixture.report, inputs: fixture.inputs, config: pipeline, manifest, now: NOW }),
    /exact-byte preflight mismatch for: media-campus-entrance/i,
  );
});

test("returns one blocked batch when an exact master fails authoritative requirements", async (context) => {
  const fixture = await createFixture({
    dimensions: { "media-campus-courtyard": { width: 1400, height: 500 } },
  });
  context.after(() => rm(fixture.directory, { recursive: true, force: true }));

  const result = await inspectCampusMediaBatch({
    report: fixture.report,
    inputs: fixture.inputs,
    config: pipeline,
    manifest,
    now: NOW,
  });
  const courtyard = result.records.find((record) => record.recordId === "media-campus-courtyard");

  assert.equal(result.status, "blocked");
  assert.equal(courtyard.status, "blocked");
  assert.match(courtyard.issues.join(" "), /2400 px[\s\S]*1350 px/i);
  assert.ok(result.records.filter((record) => record.status === "ready-for-staging").length === 3);
});

test("rejects drifted, identity-bearing or structurally expanded preflight reports", async () => {
  const fixture = await createFixture();
  try {
    const drifted = structuredClone(fixture.report);
    drifted.pipeline.minimumMaster.longEdge = 2000;
    assert.match(validateCampusMasterPreflightReport(drifted, pipeline).map((issue) => issue.message).join(" "), /drifted/i);

    const expanded = structuredClone(fixture.report);
    expanded.records[0].sourcePath = "C:\\controlled\\campus.jpg";
    assert.match(validateCampusMasterPreflightReport(expanded, pipeline).map((issue) => issue.message).join(" "), /record fields/i);

    const malformedIssues = structuredClone(fixture.report);
    malformedIssues.records[0].issues = null;
    assert.match(validateCampusMasterPreflightReport(malformedIssues, pipeline).map((issue) => issue.message).join(" "), /issue entries/i);
  } finally {
    await rm(fixture.directory, { recursive: true, force: true });
  }
});

test("publishes one documented batch-inspection command without adding a write path", async () => {
  const [script, packageText, guide, brief, page] = await Promise.all([
    readFile(new URL("../scripts/inspect-campus-media-batch.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../docs/campus-media-ingestion.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/campus-media-brief.md", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/campus-master-preflight/page.tsx", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageText);

  assert.match(packageJson.scripts["media:inspect-batch"], /inspect-campus-media-batch/);
  assert.match(packageJson.scripts["test:contract"], /campus-media-batch-inspection\.test/);
  assert.match(packageJson.scripts["test:review"], /campus-media-batch-inspection\.test/);
  assert.match(script, /--report/);
  assert.match(script, /--input/);
  assert.doesNotMatch(script, /writeFile|mkdir|rename|rm\(/);
  assert.match(guide, /media:inspect-batch/i);
  assert.match(brief, /authoritative batch inspector/i);
  assert.match(page, /media:inspect-batch/i);
});
