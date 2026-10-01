import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assessHeroPublication,
  getPublicHeroPublication,
  heroPublicationConfig,
} from "../lib/home-zentry-publication.ts";

const ids = ["campus", "entrance", "science", "skating", "digital", "culture", "sports"];
const sourceDigest = "c".repeat(64);
const fullDigest = "a".repeat(64);
const previewDigest = "b".repeat(64);

function fixture() {
  const config = {
    schemaVersion: 1,
    slides: ids.map((id) => ({
      id,
      recordId: `media-hero-${id}`,
      decision: "approved",
      visualReviewStatus: "approved",
      approvedAlt: true,
      sourceSha256: sourceDigest,
      fullSha256: fullDigest,
      previewSha256: previewDigest,
      full: `/media/home/production/hero/${id}/full-${fullDigest.slice(0, 12)}.webp`,
      preview: `/media/home/production/hero/${id}/preview-${previewDigest.slice(0, 12)}.webp`,
      receiptRef: `approved-receipt-${id}`,
    })),
  };
  const approvals = ids.map((id) => ({
    id: `media-hero-${id}`,
    kind: "media",
    decision: "approved",
    publicTargets: ["/"],
    checks: { accuracy: "verified", rights: "verified", privacy: "verified", "management-approval": "verified" },
    evidenceReferences: [`approved-receipt-${id}`],
    approvedByRole: "School Management",
    approvedAt: "2026-09-30T12:00:00Z",
  }));
  return { config, approvals };
}

test("current publication manifest fails closed; private photos cannot become public by flag alone", () => {
  const result = getPublicHeroPublication();
  assert.equal(heroPublicationConfig.slides.length, 7);
  assert.equal(result.ready, false);
  assert.equal(result.slides.length, 0);
  assert.ok(result.issues.length > 0);
});

test("publishes exactly seven ordered scenes only with individually approved records and paths", () => {
  const { config, approvals } = fixture();
  const result = assessHeroPublication(config, approvals);
  assert.equal(result.ready, true, result.issues.join("; "));
  assert.deepEqual(result.slides.map((slide) => slide.id), ids);
  assert.ok(result.slides.every((slide) => slide.visualReviewStatus === "approved"));
  assert.ok(result.slides.every((slide) => slide.image.startsWith("/media/home/production/hero/")));
  assert.ok(result.slides.every((slide) => !slide.image.includes("hero-drafts")));
});

test("rejects unapproved records, unauthorized paths, missing visual review and partial scenes", () => {
  for (const change of [
    ({ config }) => { config.slides[2].visualReviewStatus = "pending"; },
    ({ config }) => { config.slides[4].approvedAlt = false; },
    ({ config }) => { config.slides[5].full = "/media/home/hero-drafts/culture.webp"; },
    ({ config }) => { config.slides[3].previewSha256 = "unverified"; },
    ({ config }) => { config.slides[0].receiptRef = ""; },
    ({ config }) => { config.slides.pop(); },
    ({ config }) => { [config.slides[0], config.slides[1]] = [config.slides[1], config.slides[0]]; },
    ({ approvals }) => { approvals[6].decision = "review-required"; },
    ({ approvals }) => { approvals[0].expiresAt = "2020-01-01"; },
    ({ approvals }) => { approvals[0].checks.rights = "pending"; },
    ({ approvals }) => { approvals[2].evidenceReferences = []; },
    ({ approvals }) => { approvals[4].approvedByRole = null; },
    ({ approvals }) => { approvals[5].approvedAt = null; },
    ({ approvals }) => { approvals[1].publicTargets = ["/private-review"]; },
  ]) {
    const data = fixture();
    change(data);
    const result = assessHeroPublication(data.config, data.approvals);
    assert.equal(result.ready, false);
    assert.deepEqual(result.slides, []);
    assert.ok(result.issues.length);
  }
});

test("public activation is separately gated and Vercel audits actual production files", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const script = await readFile(new URL("../scripts/audit-home-zentry-publication.mjs", import.meta.url), "utf8");
  const ignore = await readFile(new URL("../.gitignore", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(page, /!privateHomepageReview && process.env.HOMEPAGE_PUBLIC_ZENTRY_HERO === "true"/);
  assert.match(page, /getPublicHeroPublication\(\)/);
  assert.match(page, /publishedHero\?\.ready/);
  assert.match(script, /createHash\("sha256"\)/);
  assert.match(script, /sharp\(contents\)\.metadata\(\)/);
  assert.match(script, /auditPublicReleaseReadiness\(\)/);
  assert.match(ignore, /\/public\/media\/home\/hero-drafts\//);
  assert.match(packageJson.scripts["prebuild:vercel"], /audit-home-zentry-publication/);
});
