import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import {
  CAMPUS_MEDIA_ACTIVATION_ACKNOWLEDGEMENT,
  createCampusMediaActivationPlan,
  executeCampusMediaActivation,
} from "../lib/campus-media-activation.ts";
import { campusMediaPublicationRegistry } from "../lib/campus-media-publication.ts";

const NOW = "2026-08-17T08:00:00.000Z";
const recordId = "media-campus-main";
const widths = [480, 768, 1200, 1600, 2000];
const formats = ["avif", "webp", "jpeg"];
const manifest = { records: [{ id: recordId, kind: "media", decision: "approved", expiresAt: null }] };

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function encodeVariant(width, format) {
  const height = Math.round(width * 9 / 16);
  const image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 205, g: 44, b: 118 },
    },
  });
  if (format === "avif") image.avif({ quality: 50, effort: 1 });
  else if (format === "webp") image.webp({ quality: 76, effort: 1 });
  else image.jpeg({ quality: 82 });
  return { buffer: await image.toBuffer(), height };
}

async function createFixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sskem-campus-activation-"));
  const publicRoot = path.join(root, "public-media");
  const outputDirectory = path.join(publicRoot, recordId);
  const registryPath = path.join(root, "campus-media-publication-bindings.json");
  await mkdir(outputDirectory, { recursive: true });
  const variants = [];

  for (const width of widths) {
    for (const format of formats) {
      const { buffer, height } = await encodeVariant(width, format);
      const filename = `${recordId}-${width}.${format === "jpeg" ? "jpg" : format}`;
      await writeFile(path.join(outputDirectory, filename), buffer);
      variants.push({
        filename,
        format,
        width,
        height,
        bytes: buffer.length,
        quality: format === "avif" ? 50 : format === "webp" ? 76 : 82,
        sha256: digest(buffer),
        embeddedMetadataRemoved: true,
        colourSpace: "srgb",
      });
    }
  }

  const receipt = {
    schemaVersion: 1,
    pipelineId: "sskem-campus-media",
    recordId,
    decisionAtPreparation: "approved",
    mode: "public",
    generatedAt: NOW,
    source: { sha256: digest("first-approved-master") },
    output: {
      profile: "campus-responsive",
      crop: "none",
      embeddedMetadataPolicy: "EXIF, XMP and IPTC removed",
      variants,
    },
  };
  const receiptPath = path.join(outputDirectory, "intake-receipt.json");
  await Promise.all([
    writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8"),
    writeFile(registryPath, `${JSON.stringify(campusMediaPublicationRegistry, null, 2)}\n`, "utf8"),
  ]);
  context.after(() => rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }));
  return { outputDirectory, publicRoot, receipt, receiptPath, registryPath };
}

test("plans locally, requires acknowledgement and activates the exact verified binding atomically", async (context) => {
  const fixture = await createFixture(context);
  const options = { recordId, publicRoot: fixture.publicRoot, registryPath: fixture.registryPath, manifest, now: NOW };

  const planned = await executeCampusMediaActivation(options);
  assert.equal(planned.mode, "local-plan");
  assert.equal(planned.plan.status, "ready-for-explicit-write");
  assert.equal(planned.plan.proposal.variants.length, 15);
  assert.doesNotMatch(JSON.stringify(planned), /"(?:sourcePath|approver|consent|token)"\s*:/i);
  assert.equal(JSON.parse(await readFile(fixture.registryPath, "utf8")).bindings.length, 0);

  await assert.rejects(
    executeCampusMediaActivation({ ...options, apply: true, acknowledgement: "wrong" }),
    /requires --acknowledge-local-write.*?No registry write/i,
  );
  assert.equal(JSON.parse(await readFile(fixture.registryPath, "utf8")).bindings.length, 0);

  const applied = await executeCampusMediaActivation({
    ...options,
    apply: true,
    acknowledgement: CAMPUS_MEDIA_ACTIVATION_ACKNOWLEDGEMENT,
  });
  assert.equal(applied.mode, "local-registry-write");
  assert.equal(applied.receipt.variants, 15);
  const registry = JSON.parse(await readFile(fixture.registryPath, "utf8"));
  assert.equal(registry.bindings.length, 1);
  assert.equal(registry.bindings[0].bindingId, applied.receipt.bindingId);

  assert.equal((await createCampusMediaActivationPlan(options)).status, "already-active");
  assert.equal((await executeCampusMediaActivation({ ...options, apply: true })).mode, "no-change");
});

test("blocks silent replacement and refuses tampered derivatives without changing the active registry", async (context) => {
  const fixture = await createFixture(context);
  const options = { recordId, publicRoot: fixture.publicRoot, registryPath: fixture.registryPath, manifest, now: NOW };
  await executeCampusMediaActivation({
    ...options,
    apply: true,
    acknowledgement: CAMPUS_MEDIA_ACTIVATION_ACKNOWLEDGEMENT,
  });
  const activeRegistry = await readFile(fixture.registryPath, "utf8");

  const replacementReceipt = structuredClone(fixture.receipt);
  replacementReceipt.source.sha256 = digest("replacement-approved-master");
  await writeFile(fixture.receiptPath, `${JSON.stringify(replacementReceipt, null, 2)}\n`, "utf8");
  const blocked = await createCampusMediaActivationPlan(options);
  assert.equal(blocked.status, "blocked");
  assert.match(blocked.blockers.join(" "), /different binding.*?--replace/i);

  const firstVariant = replacementReceipt.output.variants[0];
  const wrongFormat = await sharp({
    create: {
      width: firstVariant.width,
      height: firstVariant.height,
      channels: 3,
      background: { r: 12, g: 34, b: 56 },
    },
  }).webp({ quality: 70 }).toBuffer();
  await writeFile(path.join(fixture.outputDirectory, firstVariant.filename), wrongFormat);
  await assert.rejects(
    createCampusMediaActivationPlan({ ...options, replace: true }),
    /artifact verification failed.*?encoded format/i,
  );
  assert.equal(await readFile(fixture.registryPath, "utf8"), activeRegistry);
});
