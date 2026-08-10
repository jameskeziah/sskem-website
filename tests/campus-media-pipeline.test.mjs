import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import {
  campusMediaProjectRoot,
  inspectCampusMedia,
  loadCampusMediaConfig,
  prepareCampusMedia,
  validateCampusMediaConfig,
} from "../lib/campus-media-pipeline.mjs";
import { loadApprovalManifest } from "../lib/approval-manifest.mjs";

const stagingRoot = path.join(campusMediaProjectRoot, "work", "media-intake");
const fixtureRoot = path.join(campusMediaProjectRoot, "work", "media-pipeline-fixtures");

function removeDirectory(target) {
  return rm(target, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
}

async function createMaster() {
  await mkdir(fixtureRoot, { recursive: true });
  const directory = await mkdtemp(path.join(fixtureRoot, "master-"));
  const inputPath = path.join(directory, "approved-campus-master.jpg");
  await sharp({
    create: {
      width: 2400,
      height: 1350,
      channels: 3,
      background: { r: 210, g: 55, b: 128 },
    },
  })
    .withMetadata({ orientation: 1 })
    .jpeg({ quality: 94 })
    .toFile(inputPath);
  return { directory, inputPath };
}

test("defines a complete uncropped responsive campus profile", async () => {
  const config = await loadCampusMediaConfig();
  assert.deepEqual(validateCampusMediaConfig(config), []);
  assert.deepEqual(config.profiles["campus-responsive"].widths, [480, 768, 1200, 1600, 2000]);
  assert.deepEqual(Object.keys(config.profiles["campus-responsive"].formats), ["avif", "webp", "jpeg"]);
  assert.equal(config.minimumMaster.longEdge, 2400);
  assert.equal(config.minimumMaster.shortEdge, 1350);
});

test("reports the supplied prototype photograph as below the production master gate", async () => {
  const inspection = await inspectCampusMedia({
    recordId: "media-campus-main",
    inputPath: path.join(campusMediaProjectRoot, "public", "media", "home", "campus-main.jpeg"),
  });
  assert.equal(inspection.eligible, false);
  assert.deepEqual({ width: inspection.source.width, height: inspection.source.height }, { width: 1400, height: 500 });
  assert.match(inspection.issues.join(" "), /2400 px[\s\S]*?1350 px/i);
  assert.deepEqual(inspection.record, {
    id: "media-campus-main",
    decision: "review-required",
    checkProfile: "campus-media",
  });
});

test("prepares responsive derivatives transactionally and removes embedded metadata", async (context) => {
  const { directory, inputPath } = await createMaster();
  const outputPath = path.join(stagingRoot, `media-campus-main-test-${process.pid}-${Date.now()}`);
  context.after(async () => {
    await removeDirectory(directory);
    await removeDirectory(outputPath);
  });

  const inputMetadata = await sharp(inputPath).metadata();
  assert.ok(inputMetadata.exif, "Fixture must contain metadata so stripping is meaningfully tested");

  const result = await prepareCampusMedia({
    recordId: "media-campus-main",
    inputPath,
    outputPath,
  });

  assert.equal(result.receipt.mode, "staging");
  assert.equal(result.receipt.decisionAtPreparation, "review-required");
  assert.equal(result.receipt.output.crop, "none");
  assert.equal(result.receipt.output.variants.length, 15);
  assert.ok(result.receipt.output.variants.every((variant) => variant.embeddedMetadataRemoved));
  assert.ok(result.receipt.output.variants.every((variant) => variant.bytes <= 500_000));

  const files = await readdir(outputPath);
  assert.equal(files.length, 16);
  assert.ok(files.includes("intake-receipt.json"));
  for (const variant of result.receipt.output.variants) {
    const details = await stat(path.join(outputPath, variant.filename));
    assert.equal(details.size, variant.bytes);
    const metadata = await sharp(path.join(outputPath, variant.filename)).metadata();
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.xmp, undefined);
    assert.equal(metadata.iptc, undefined);
  }

  const receiptText = await readFile(path.join(outputPath, "intake-receipt.json"), "utf8");
  assert.doesNotMatch(receiptText, /approved-campus-master/i);
  assert.doesNotMatch(receiptText, /[a-z]:\\|file:\/\//i);
  assert.doesNotMatch(receiptText, /guardian|approver identity|consent form/i);
  await assert.rejects(
    prepareCampusMedia({ recordId: "media-campus-main", inputPath, outputPath }),
    /not empty[\s\S]*?explicit replacement/i,
  );
});

test("refuses public derivatives until the exact media record is approved", async (context) => {
  const { directory, inputPath } = await createMaster();
  context.after(() => removeDirectory(directory));
  const manifest = await loadApprovalManifest();

  await assert.rejects(
    prepareCampusMedia({ recordId: "media-campus-main", inputPath, publish: true, manifest }),
    /not approved[\s\S]*?refused/i,
  );
  await assert.rejects(
    prepareCampusMedia({
      recordId: "media-campus-main",
      inputPath,
      outputPath: path.join(campusMediaProjectRoot, "work", "outside-approved-root"),
      manifest,
    }),
    /must remain inside work\/media-intake/i,
  );
});

test("does not expose source paths in the pipeline documentation or receipt contract", async () => {
  const guide = await readFile(path.join(campusMediaProjectRoot, "docs", "campus-media-ingestion.md"), "utf8");
  const packageJson = JSON.parse(await readFile(path.join(campusMediaProjectRoot, "package.json"), "utf8"));
  assert.match(guide, /never stores[\s\S]*?source filename or path/i);
  assert.match(guide, /refused unless[\s\S]*?manifest record is approved/i);
  assert.match(packageJson.scripts["media:inspect"], /--inspect/);
  assert.match(packageJson.scripts["media:publish"], /--publish/);
  assert.equal(packageJson.devDependencies.sharp, "0.34.5");
});
