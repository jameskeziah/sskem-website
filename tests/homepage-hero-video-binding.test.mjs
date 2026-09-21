import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  HOMEPAGE_HERO_VIDEO_APPROVAL_CHECKS,
  HOMEPAGE_HERO_VIDEO_APPROVAL_PROFILE,
  HOMEPAGE_HERO_VIDEO_RECORD_IDS,
  homepageHeroVideoBindingRegistry,
  selectHomepageHeroVideo,
  validateHomepageHeroVideoBinding,
} from "../lib/homepage-hero-video.server.ts";

const NOW = "2026-09-19T10:00:00.000Z";
const ACTIVATED_ON = "2026-09-18T12:00:00.000Z";
const APPROVED_ON = "2026-09-18T11:00:00.000Z";
const publicDirectory = "media/home/production/homepage-hero-video";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function bindingId(videoSha256, posterSha256, captionsSha256) {
  const digest = sha256(`${videoSha256}:${posterSha256}:${captionsSha256}`);
  return `homepage-hero-video-${digest.slice(0, 12)}`;
}

function approvalRecord(id, publicPath, evidenceReference) {
  return {
    id,
    kind: "media",
    title: id.replaceAll("-", " "),
    sourcePointer: `public${publicPath}`,
    publicTargets: ["/"],
    checkProfile: HOMEPAGE_HERO_VIDEO_APPROVAL_PROFILE,
    checks: Object.fromEntries(HOMEPAGE_HERO_VIDEO_APPROVAL_CHECKS.map((check) => [check, "verified"])),
    decision: "approved",
    evidenceReferences: [evidenceReference],
    approvedByRole: "school-content-owner",
    approvedAt: APPROVED_ON,
    expiresAt: null,
    notes: "Approved only against the exact controlled hero media file.",
  };
}

async function createFixture(context) {
  const rootDir = await mkdtemp(path.join(tmpdir(), "sskem-home-hero-video-"));
  context.after(() => rm(rootDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }));
  const outputDirectory = path.join(rootDir, "public", ...publicDirectory.split("/"));
  await mkdir(outputDirectory, { recursive: true });

  const videoBytes = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x18]),
    Buffer.from("ftypmp42", "ascii"),
    Buffer.alloc(128, 0x2a),
  ]);
  const posterBytes = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.alloc(96, 0x18),
    Buffer.from([0xff, 0xd9]),
  ]);
  const captionsBytes = Buffer.from(
    "WEBVTT\n\n00:00.000 --> 00:02.000\nThe SSKEMS campus exterior is shown.\n",
    "utf8",
  );
  const paths = {
    video: `/${publicDirectory}/campus-film.mp4`,
    poster: `/${publicDirectory}/campus-film-poster.jpg`,
    captions: `/${publicDirectory}/campus-film.en.vtt`,
  };
  const filePaths = {
    video: path.join(outputDirectory, "campus-film.mp4"),
    poster: path.join(outputDirectory, "campus-film-poster.jpg"),
    captions: path.join(outputDirectory, "campus-film.en.vtt"),
  };
  await Promise.all([
    writeFile(filePaths.video, videoBytes),
    writeFile(filePaths.poster, posterBytes),
    writeFile(filePaths.captions, captionsBytes),
  ]);

  const digests = {
    video: sha256(videoBytes),
    poster: sha256(posterBytes),
    captions: sha256(captionsBytes),
  };
  const binding = {
    bindingId: bindingId(digests.video, digests.poster, digests.captions),
    title: "SSKEMS campus film",
    activatedOn: ACTIVATED_ON,
    video: {
      recordId: HOMEPAGE_HERO_VIDEO_RECORD_IDS.video,
      publicPath: paths.video,
      type: "video/mp4",
      sha256: digests.video,
      bytes: videoBytes.length,
      width: 1920,
      height: 1080,
      durationMs: 20_000,
    },
    poster: {
      recordId: HOMEPAGE_HERO_VIDEO_RECORD_IDS.poster,
      publicPath: paths.poster,
      format: "jpeg",
      sha256: digests.poster,
      bytes: posterBytes.length,
      width: 1600,
      height: 900,
    },
    captions: {
      recordId: HOMEPAGE_HERO_VIDEO_RECORD_IDS.captions,
      publicPath: paths.captions,
      sha256: digests.captions,
      bytes: captionsBytes.length,
      srcLang: "en",
      label: "English",
    },
  };
  const registry = structuredClone(homepageHeroVideoBindingRegistry);
  registry.binding = binding;
  const manifest = {
    checkProfiles: {
      [HOMEPAGE_HERO_VIDEO_APPROVAL_PROFILE]: [...HOMEPAGE_HERO_VIDEO_APPROVAL_CHECKS],
    },
    records: [
      approvalRecord(HOMEPAGE_HERO_VIDEO_RECORD_IDS.video, paths.video, "MEDIA/HERO-VIDEO"),
      approvalRecord(HOMEPAGE_HERO_VIDEO_RECORD_IDS.poster, paths.poster, "MEDIA/HERO-POSTER"),
      approvalRecord(HOMEPAGE_HERO_VIDEO_RECORD_IDS.captions, paths.captions, "MEDIA/HERO-CAPTIONS"),
    ],
  };

  return {
    rootDir,
    registry,
    manifest,
    binding,
    filePaths,
    bytes: { video: videoBytes, poster: posterBytes, captions: captionsBytes },
  };
}

test("ships a schema-valid null binding and performs no speculative file read", async () => {
  assert.equal(homepageHeroVideoBindingRegistry.binding, null);
  assert.deepEqual(validateHomepageHeroVideoBinding({ now: NOW }), []);

  let reads = 0;
  const selected = await selectHomepageHeroVideo({
    mode: "private-review",
    now: NOW,
    readPublicFile: async () => {
      reads += 1;
      throw new Error("The null binding must not read a file.");
    },
  });
  assert.equal(selected, null);
  assert.equal(reads, 0);
});

test("returns the exact typed bundle only for private review after all three approvals and hashes match", async (context) => {
  const fixture = await createFixture(context);
  assert.deepEqual(validateHomepageHeroVideoBinding({
    registry: fixture.registry,
    manifest: fixture.manifest,
    now: NOW,
  }), []);

  const publicSelection = await selectHomepageHeroVideo({
    mode: "public",
    registry: fixture.registry,
    manifest: fixture.manifest,
    now: NOW,
    rootDir: fixture.rootDir,
  });
  assert.equal(publicSelection, null);

  const privateSelection = await selectHomepageHeroVideo({
    mode: "private-review",
    registry: fixture.registry,
    manifest: fixture.manifest,
    now: NOW,
    rootDir: fixture.rootDir,
  });
  assert.deepEqual(privateSelection, {
    title: fixture.binding.title,
    poster: fixture.binding.poster.publicPath,
    sources: [{ src: fixture.binding.video.publicPath, type: "video/mp4" }],
    captions: {
      src: fixture.binding.captions.publicPath,
      srcLang: "en",
      label: "English",
    },
  });
});

test("fails closed for incomplete, stale or post-activation approval state", async (context) => {
  const fixture = await createFixture(context);

  const unapproved = structuredClone(fixture.manifest);
  unapproved.records.find((record) => record.id === HOMEPAGE_HERO_VIDEO_RECORD_IDS.video).decision = "review-required";
  assert.equal(await selectHomepageHeroVideo({
    mode: "private-review",
    registry: fixture.registry,
    manifest: unapproved,
    now: NOW,
    rootDir: fixture.rootDir,
  }), null);

  const expired = structuredClone(fixture.manifest);
  expired.records.find((record) => record.id === HOMEPAGE_HERO_VIDEO_RECORD_IDS.captions).expiresAt = "2026-09-17";
  assert.equal(await selectHomepageHeroVideo({
    mode: "private-review",
    registry: fixture.registry,
    manifest: expired,
    now: NOW,
    rootDir: fixture.rootDir,
  }), null);

  const approvedAfterActivation = structuredClone(fixture.manifest);
  approvedAfterActivation.records.find((record) => record.id === HOMEPAGE_HERO_VIDEO_RECORD_IDS.poster).approvedAt = "2026-09-18T13:00:00.000Z";
  assert.match(validateHomepageHeroVideoBinding({
    registry: fixture.registry,
    manifest: approvedAfterActivation,
    now: NOW,
  }).join("\n"), /approved after the bundle activation timestamp/i);

  const wrongSource = structuredClone(fixture.manifest);
  wrongSource.records.find((record) => record.id === HOMEPAGE_HERO_VIDEO_RECORD_IDS.poster).sourcePointer += ".replacement";
  assert.match(validateHomepageHeroVideoBinding({
    registry: fixture.registry,
    manifest: wrongSource,
    now: NOW,
  }).join("\n"), /does not point to the exact bound public file/i);
});

test("fails closed when any public byte changes, disappears or is not usable WebVTT", async (context) => {
  const fixture = await createFixture(context);

  await writeFile(fixture.filePaths.video, Buffer.concat([fixture.bytes.video, Buffer.from("tampered")]), "utf8");
  assert.equal(await selectHomepageHeroVideo({
    mode: "private-review",
    registry: fixture.registry,
    manifest: fixture.manifest,
    now: NOW,
    rootDir: fixture.rootDir,
  }), null);
  await writeFile(fixture.filePaths.video, fixture.bytes.video);

  await rm(fixture.filePaths.poster);
  assert.equal(await selectHomepageHeroVideo({
    mode: "private-review",
    registry: fixture.registry,
    manifest: fixture.manifest,
    now: NOW,
    rootDir: fixture.rootDir,
  }), null);
  await writeFile(fixture.filePaths.poster, fixture.bytes.poster);

  const invalidCaptions = Buffer.from("This is not WebVTT.\n", "utf8");
  const invalidRegistry = structuredClone(fixture.registry);
  invalidRegistry.binding.captions.bytes = invalidCaptions.length;
  invalidRegistry.binding.captions.sha256 = sha256(invalidCaptions);
  invalidRegistry.binding.bindingId = bindingId(
    invalidRegistry.binding.video.sha256,
    invalidRegistry.binding.poster.sha256,
    invalidRegistry.binding.captions.sha256,
  );
  await writeFile(fixture.filePaths.captions, invalidCaptions);
  assert.equal(await selectHomepageHeroVideo({
    mode: "private-review",
    registry: invalidRegistry,
    manifest: fixture.manifest,
    now: NOW,
    rootDir: fixture.rootDir,
  }), null);
});

test("publishes the closed schema and keeps the selector out of the client motion component", async () => {
  const [schemaText, bindingText, selectorText, motionText] = await Promise.all([
    readFile(new URL("../content/homepage-hero-video-binding.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../content/homepage-hero-video-binding.json", import.meta.url), "utf8"),
    readFile(new URL("../lib/homepage-hero-video.server.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/motion/home-hero-video-transition.tsx", import.meta.url), "utf8"),
  ]);
  const schema = JSON.parse(schemaText);
  const registry = JSON.parse(bindingText);

  assert.equal(schema.properties.binding.oneOf[0].type, "null");
  assert.equal(schema.properties.policy.properties.privateReviewOnly.const, true);
  assert.equal(schema.properties.policy.properties.publicActivationAllowed.const, false);
  assert.equal(schema.properties.policy.properties.maximumVideoBytes.const, 3_000_000);
  assert.equal(registry.binding, null);
  assert.match(selectorText, /readBoundPublicFile/);
  assert.match(selectorText, /sha256\(entry\.bytes\) !== entry\.binding\.sha256/);
  assert.doesNotMatch(motionText, /approval-manifest|homepage-hero-video-binding\.json|node:fs/);
});
