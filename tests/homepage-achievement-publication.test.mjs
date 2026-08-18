import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import manifestData from "../content/approval-manifest.json" with { type: "json" };
import {
  homepageAchievementArtwork,
  homepageAchievementPublicationSummary,
  selectHomepageAchievementArtwork,
} from "../lib/homepage-achievement-publication.ts";

const now = "2026-08-18T12:00:00.000Z";

function copyManifest() {
  return structuredClone(manifestData);
}

function approve(manifest, id) {
  const record = manifest.records.find((candidate) => candidate.id === id);
  assert.ok(record, `${id} must exist`);
  record.decision = "approved";
  record.checks = Object.fromEntries(Object.keys(record.checks).map((check) => [check, "verified"]));
  record.evidenceReferences = [`CTRL/${id.toUpperCase()}`];
  record.approvedByRole = "school-approver";
  record.approvedAt = "2026-08-17T09:30:00.000Z";
}

test("keeps all supplied artwork in private review while the public projection fails closed", () => {
  const privateArtwork = selectHomepageAchievementArtwork({ mode: "private-review", now });
  const publicArtwork = selectHomepageAchievementArtwork({ mode: "public", now });
  const summary = homepageAchievementPublicationSummary({ now });

  assert.equal(privateArtwork.length, 4);
  assert.deepEqual(privateArtwork, [...homepageAchievementArtwork]);
  assert.deepEqual(publicArtwork, []);
  assert.equal(summary.approved, 0);
  assert.equal(summary.required, 4);
  assert.equal(summary.publicProjectionSafe, true);
  assert.equal(summary.releaseReady, false);
  assert.deepEqual(summary.issues, []);
});

test("publishes an artwork only when its exact media and claim records are both current and approved", () => {
  const manifest = copyManifest();
  const artwork = homepageAchievementArtwork[0];

  approve(manifest, artwork.mediaRecordId);
  assert.deepEqual(selectHomepageAchievementArtwork({ mode: "public", manifest, now }), []);

  approve(manifest, artwork.claimRecordId);
  assert.deepEqual(selectHomepageAchievementArtwork({ mode: "public", manifest, now }), [artwork]);
  assert.equal(homepageAchievementPublicationSummary({ manifest, now }).approved, 1);

  const claim = manifest.records.find((record) => record.id === artwork.claimRecordId);
  claim.expiresAt = "2026-08-17";
  assert.deepEqual(selectHomepageAchievementArtwork({ mode: "public", manifest, now }), []);
});

test("rejects manifest drift instead of publishing a differently governed source", () => {
  const manifest = copyManifest();
  manifest.records.find((record) => record.id === homepageAchievementArtwork[0].mediaRecordId).sourcePointer = "public/media/home/other.jpeg";

  const summary = homepageAchievementPublicationSummary({ manifest, now });
  assert.equal(summary.publicProjectionSafe, false);
  assert.match(summary.issues.join("\n"), /no longer points to the exact governed artwork/);
  assert.deepEqual(selectHomepageAchievementArtwork({ mode: "public", manifest, now }), []);
});

test("the homepage consumes the dual-mode selector and omits an empty public projection", async () => {
  const [homepage, motion] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/motion/home-achievements-motion.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(homepage, /selectHomepageAchievementArtwork/);
  assert.match(homepage, /process\.env\.HOMEPAGE_REVIEW_MODE === ["']private["']/);
  assert.match(homepage, /mode:\s*privateAchievementReview \? ["']private-review["'] : ["']public["']/);
  assert.match(homepage, /achievementArtwork\.length \?/);
  assert.match(motion, /publicationMode === ["']private-review["'] \? ["']required["'] : ["']approved["']/);
});
