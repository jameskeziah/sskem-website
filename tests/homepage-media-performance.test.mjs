import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { auditHomepageMediaPerformance } from "../lib/homepage-media-performance-audit.mjs";
import {
  homepageMediaPerformanceBudget,
  homepageMediaPerformanceSummary,
  validateHomepageMediaPerformanceBudget,
} from "../lib/homepage-media-performance.ts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

async function sha256(path) {
  return createHash("sha256").update(await readFile(new URL(path, import.meta.url))).digest("hex");
}

test("preloads hero images by default while respecting explicit image choices", async () => {
  const imageSource = await readFile(new URL("../components/media/SiteImage.tsx", import.meta.url), "utf8");

  assert.ok(imageSource.includes('const shouldPreload = preload ?? priority ?? (variant === "hero");'));
  assert.ok(!imageSource.includes("priority = false,"));
});

test("tracks the exact homepage poster and private campus prototype assets", () => {
  assert.deepEqual(validateHomepageMediaPerformanceBudget(), []);
  const summary = homepageMediaPerformanceSummary({
    campusSummary: { valid: 0, required: 4, releaseReady: false },
  });
  const poster = summary.assets.find((asset) => asset.id === "homepage-social-poster");

  assert.equal(summary.assets.length, 5);
  assert.equal(poster.observedBytes, 1446077);
  assert.equal(poster.maximumBytes, 400000);
  assert.equal(poster.overageBytes, 1046077);
  assert.equal(summary.privateReviewAllowed, true);
  assert.equal(summary.releaseReady, false);
  assert.deepEqual(summary.blockers.map((blocker) => blocker.code), ["asset-over-budget", "campus-bindings-incomplete"]);
});

test("can reach release readiness only when the budget and all campus bindings pass", () => {
  const budget = structuredClone(homepageMediaPerformanceBudget);
  const poster = budget.assets.find((asset) => asset.id === "homepage-social-poster");
  poster.observedBytes = 300000;
  const summary = homepageMediaPerformanceSummary({
    budget,
    campusSummary: { valid: 4, required: 4, releaseReady: true },
  });

  assert.deepEqual(summary.issues, []);
  assert.deepEqual(summary.blockers, []);
  assert.equal(summary.releaseReady, true);
});

test("fails closed on schema drift and a non-canonical asset path", () => {
  const unknownField = structuredClone(homepageMediaPerformanceBudget);
  unknownField.policy.unreviewedOverride = true;
  assert.match(validateHomepageMediaPerformanceBudget({ budget: unknownField }).join("\n"), /unknown fields/i);

  const traversal = structuredClone(homepageMediaPerformanceBudget);
  traversal.assets[0].path = "../og.png";
  assert.match(validateHomepageMediaPerformanceBudget({ budget: traversal }).join("\n"), /canonical homepage placement contract/i);
});

test("audits dimensions, formats and bytes without changing the artwork", async () => {
  const before = await sha256("../public/og.png");
  const report = await auditHomepageMediaPerformance({ rootDir: projectRoot });
  const after = await sha256("../public/og.png");

  assert.deepEqual(report.integrityIssues, []);
  assert.equal(report.measurements.length, 5);
  assert.equal(report.privateReviewAllowed, true);
  assert.equal(report.releaseReady, false);
  assert.equal(after, before);
});

test("rejects an unreviewed byte-count drift", async () => {
  const budget = structuredClone(homepageMediaPerformanceBudget);
  budget.assets[0].observedBytes -= 1;
  const report = await auditHomepageMediaPerformance({ rootDir: projectRoot, budget });

  assert.match(report.integrityIssues.join("\n"), /byte count drifted/i);
  assert.equal(report.privateReviewAllowed, false);
  assert.equal(report.releaseReady, false);
});

test("wires the read-only audit into every build", async () => {
  const [packageText, scriptText] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/audit-homepage-media-performance.mjs", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageText);

  assert.match(packageJson.scripts.prebuild, /performance:audit/);
  assert.match(packageJson.scripts["test:contract"], /homepage-media-performance\.test\.mjs/);
  assert.doesNotMatch(scriptText, /writeFile|rename|unlink|rm\(/);
});
