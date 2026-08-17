import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import {
  homepagePosterOptimizationConfig,
  inspectHomepagePosterOptimization,
  prepareHomepagePosterOptimization,
  validateHomepagePosterOptimizationConfig,
} from "../lib/homepage-poster-optimization.mjs";

const NOW = "2026-08-17T12:00:00.000Z";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function syntheticRoot(width = 1200, height = 630) {
  const rootDir = await mkdtemp(path.join(tmpdir(), "sskem-poster-optimization-"));
  await mkdir(path.join(rootDir, "public"), { recursive: true });
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 19, g: 54, b: 91, alpha: 1 },
    },
  }).png().toFile(path.join(rootDir, "public", "og.png"));
  return rootDir;
}

test("locks optimization to a pixel-exact, staging-only contract", () => {
  assert.deepEqual(validateHomepagePosterOptimizationConfig(), []);
  assert.equal(homepagePosterOptimizationConfig.profile.palette, false);
  assert.equal(homepagePosterOptimizationConfig.profile.resize, "none");
  assert.equal(homepagePosterOptimizationConfig.profile.crop, "none");
  assert.equal(homepagePosterOptimizationConfig.profile.pixelChangesAllowed, false);
  assert.equal(homepagePosterOptimizationConfig.profile.publicWriteAllowed, false);

  const unsafe = structuredClone(homepagePosterOptimizationConfig);
  unsafe.profile.palette = true;
  assert.match(validateHomepagePosterOptimizationConfig(unsafe).join("\n"), /lossless, uncropped, unresized and staging-only/i);
});

test("inspects the current poster without mutation and reports the honest lossless limit", async () => {
  const sourceUrl = new URL("../public/og.png", import.meta.url);
  const before = await readFile(sourceUrl);
  const report = await inspectHomepagePosterOptimization();
  const after = await readFile(sourceUrl);

  assert.equal(sha256(after), sha256(before));
  assert.equal(report.source.bytes, 1446077);
  assert.equal(report.candidate.pixelExact, true);
  assert.equal(report.candidate.privateMetadataRemoved, true);
  assert.ok(report.candidate.bytes < report.source.bytes);
  assert.ok(report.candidate.bytes > report.candidate.maximumBytes);
  assert.equal(report.candidate.withinBudget, false);
  assert.equal(report.status, "format-change-review-required");
  assert.match(report.decision, /format or pixel change requires a separate approved art-direction decision/i);
  assert.equal(report.guardrails.publicWritePerformed, false);
});

test("prepares only a pixel-identical ignored candidate and privacy-safe receipt", async () => {
  const rootDir = await syntheticRoot();
  const sourcePath = path.join(rootDir, "public", "og.png");
  const before = await readFile(sourcePath);
  const result = await prepareHomepagePosterOptimization({ rootDir, now: NOW });
  const after = await readFile(sourcePath);
  const candidatePath = path.join(rootDir, result.outputDirectory, homepagePosterOptimizationConfig.staging.candidateFilename);
  const receiptPath = path.join(rootDir, result.outputDirectory, homepagePosterOptimizationConfig.staging.receiptFilename);
  const [candidate, receiptText, sourcePixels, candidatePixels] = await Promise.all([
    readFile(candidatePath),
    readFile(receiptPath, "utf8"),
    sharp(sourcePath).ensureAlpha().raw().toBuffer(),
    sharp(candidatePath).ensureAlpha().raw().toBuffer(),
  ]);
  const receipt = JSON.parse(receiptText);

  assert.equal(sha256(after), sha256(before));
  assert.equal(sourcePixels.equals(candidatePixels), true);
  assert.equal(receipt.mode, "staging");
  assert.equal(receipt.status, "budget-met");
  assert.equal(receipt.candidate.sha256, sha256(candidate));
  assert.equal(receipt.candidate.pixelExact, true);
  assert.equal(receipt.guardrails.publicWritePerformed, false);
  assert.doesNotMatch(receiptText, /[a-z]:\\|file:\/\/|sourcePath|approver|evidence/i);

  await assert.rejects(
    prepareHomepagePosterOptimization({ rootDir, now: NOW }),
    /staging output is not empty.*explicit replacement/i,
  );
  const replacement = await prepareHomepagePosterOptimization({ rootDir, now: NOW, replace: true });
  assert.equal(replacement.receipt.candidate.pixelExact, true);
  assert.equal(sha256(await readFile(sourcePath)), sha256(before));
});

test("blocks a source whose format or dimensions drift from the authored poster", async () => {
  const rootDir = await syntheticRoot(600, 315);
  const report = await inspectHomepagePosterOptimization({ rootDir });

  assert.equal(report.status, "blocked");
  assert.match(report.issues.join("\n"), /dimensions must remain 1200 x 630/i);
  assert.match(report.decision, /blocked until the source matches the exact poster contract/i);
  assert.doesNotMatch(report.decision, /may proceed/i);
});

test("publishes a matching schema and command surface", async () => {
  const [schemaText, packageText] = await Promise.all([
    readFile(new URL("../content/homepage-poster-optimization.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  const schema = JSON.parse(schemaText);
  const scripts = JSON.parse(packageText).scripts;

  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.profile.properties.pixelChangesAllowed.const, false);
  assert.equal(schema.properties.profile.properties.publicWriteAllowed.const, false);
  assert.match(scripts["poster:inspect"], /--inspect/);
  assert.match(scripts["poster:prepare"], /prepare-homepage-poster-optimization/);
  assert.match(scripts["test:contract"], /homepage-poster-optimization\.test\.mjs/);
});
