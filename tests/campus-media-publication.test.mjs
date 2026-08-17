import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  campusMediaPublicationRegistry,
  campusMediaPublicationSummary,
  createCampusMediaBindingProposal,
  createCampusMediaPublicationIndex,
  resolveCampusMedia,
  validateCampusMediaPublicationRegistry,
} from "../lib/campus-media-publication.ts";

const projectRoot = new URL("../", import.meta.url);
const NOW = "2026-08-17T06:00:00.000Z";
const widths = [480, 768, 1200, 1600, 2000];
const formats = ["avif", "webp", "jpeg"];

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function publicReceipt(recordId = "media-campus-main") {
  return {
    schemaVersion: 1,
    pipelineId: "sskem-campus-media",
    recordId,
    decisionAtPreparation: "approved",
    mode: "public",
    generatedAt: NOW,
    source: { sha256: digest(`${recordId}-source`) },
    output: {
      profile: "campus-responsive",
      crop: "none",
      embeddedMetadataPolicy: "EXIF, XMP and IPTC removed",
      variants: widths.flatMap((width) => formats.map((format) => ({
        filename: `${recordId}-${width}.${format === "jpeg" ? "jpg" : format}`,
        format,
        width,
        height: Math.round(width * 9 / 16),
        bytes: 100_000,
        quality: 80,
        sha256: digest(`${recordId}-${width}-${format}`),
        embeddedMetadataRemoved: true,
        colourSpace: "srgb",
      }))),
    },
  };
}

function approvedManifest(recordId = "media-campus-main") {
  return { records: [{ id: recordId, kind: "media", decision: "approved", expiresAt: null }] };
}

test("keeps the current homepage on its private prototype fallback with zero speculative bindings", () => {
  assert.deepEqual(validateCampusMediaPublicationRegistry({ now: NOW }), []);
  assert.equal(campusMediaPublicationRegistry.bindings.length, 0);
  assert.deepEqual(campusMediaPublicationSummary({ now: NOW }), {
    recorded: 0,
    valid: 0,
    required: 4,
    releaseReady: false,
    issues: [],
  });

  const media = resolveCampusMedia({
    recordId: "media-campus-main",
    fallbackSrc: "/media/home/campus-main.jpeg",
    now: NOW,
  });
  assert.deepEqual(media, {
    mode: "prototype-review",
    recordId: "media-campus-main",
    fallbackSrc: "/media/home/campus-main.jpeg",
  });
});

test("turns an exact approved public receipt into a deterministic binding proposal", () => {
  const proposal = createCampusMediaBindingProposal(publicReceipt());

  assert.equal(proposal.recordId, "media-campus-main");
  assert.equal(proposal.role, "home-hero");
  assert.equal(proposal.profile, "campus-responsive");
  assert.match(proposal.bindingId, /^campus-media-campus-main-[a-f0-9]{12}$/);
  assert.equal(proposal.variants.length, 15);
  assert.doesNotMatch(JSON.stringify(proposal), /sourcePath|approver|consent|token/i);
});

test("activates AVIF, WebP and JPEG sources only for a current approved exact binding", () => {
  const proposal = createCampusMediaBindingProposal(publicReceipt());
  const registry = { ...campusMediaPublicationRegistry, bindings: [proposal] };
  const manifest = approvedManifest();

  assert.deepEqual(validateCampusMediaPublicationRegistry({ registry, manifest, now: NOW }), []);
  assert.equal(createCampusMediaPublicationIndex({ registry, manifest, now: NOW }).size, 1);
  const media = resolveCampusMedia({
    recordId: "media-campus-main",
    fallbackSrc: "/media/home/campus-main.jpeg",
    registry,
    manifest,
    now: NOW,
  });
  assert.equal(media.mode, "production");
  assert.match(media.sources.avif, /media-campus-main-480\.avif 480w/);
  assert.match(media.sources.webp, /media-campus-main-2000\.webp 2000w/);
  assert.match(media.sources.jpeg, /media-campus-main-1200\.jpg 1200w/);
  assert.equal(media.fallback.src, "/media/home/production/media-campus-main/media-campus-main-2000.jpg");
  assert.deepEqual(media.fallback, { src: media.fallback.src, width: 2000, height: 1125 });
});

test("fails closed for unapproved, incomplete, duplicated or hash-invalid bindings", () => {
  const proposal = createCampusMediaBindingProposal(publicReceipt());
  const registry = { ...campusMediaPublicationRegistry, bindings: [proposal] };
  const unapproved = { records: [{ id: "media-campus-main", kind: "media", decision: "review-required", expiresAt: null }] };
  assert.ok(validateCampusMediaPublicationRegistry({ registry, manifest: unapproved, now: NOW }).some((issue) => issue.includes("current approved media record")));
  assert.equal(createCampusMediaPublicationIndex({ registry, manifest: unapproved, now: NOW }).size, 0);

  const incomplete = structuredClone(registry);
  incomplete.bindings[0].variants.pop();
  assert.ok(validateCampusMediaPublicationRegistry({ registry: incomplete, manifest: approvedManifest(), now: NOW }).some((issue) => issue.includes("exact 15-file")));

  const invalidHash = structuredClone(registry);
  invalidHash.bindings[0].variants[0].sha256 = "not-a-digest";
  assert.ok(validateCampusMediaPublicationRegistry({ registry: invalidHash, manifest: approvedManifest(), now: NOW }).some((issue) => issue.includes("sha256")));

  const duplicate = { ...campusMediaPublicationRegistry, bindings: [proposal, structuredClone(proposal)] };
  assert.ok(validateCampusMediaPublicationRegistry({ registry: duplicate, manifest: approvedManifest(), now: NOW }).some((issue) => issue.includes("duplicated")));
});

test("publishes the registry schema and wires the exact binding audit into prebuild", async () => {
  const [schemaText, packageText, componentSource, homepageSource] = await Promise.all([
    readFile(new URL("content/campus-media-publication-bindings.schema.json", projectRoot), "utf8"),
    readFile(new URL("package.json", projectRoot), "utf8"),
    readFile(new URL("components/campus-picture.tsx", projectRoot), "utf8"),
    readFile(new URL("app/page.tsx", projectRoot), "utf8"),
  ]);
  const schema = JSON.parse(schemaText);
  const packageJson = JSON.parse(packageText);

  assert.equal(schema.properties.registryId.const, "sskem-campus-media-publication-bindings");
  assert.equal(schema.properties.policy.properties.exactVariantHashesRequired.const, true);
  assert.match(packageJson.scripts.prebuild, /media:bindings:audit/);
  assert.match(packageJson.scripts["media:activate"], /activate-campus-media/);
  assert.match(componentSource, /<source type="image\/avif"/);
  assert.match(componentSource, /<source type="image\/webp"/);
  assert.match(componentSource, /<source type="image\/jpeg"/);
  for (const recordId of Object.keys({
    "media-campus-main": true,
    "media-campus-grounds": true,
    "media-campus-entrance": true,
    "media-campus-courtyard": true,
  })) assert.match(homepageSource, new RegExp(`recordId=["']${recordId}["']`));
});
