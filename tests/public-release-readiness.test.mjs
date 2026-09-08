import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { auditPublicReleaseReadiness } from "../lib/public-release-readiness-audit.mjs";
import { createPublicReleaseReadiness } from "../lib/public-release-readiness.ts";

const projectRoot = new URL("../", import.meta.url);
const controlledInputs = [
  "content/approval-manifest.json",
  "content/homepage-achievement-publication-bindings.json",
  "content/campus-media-publication-bindings.json",
  "content/public-document-publication-bindings.json",
  "content/homepage-media-performance-budget.json",
  "content/legacy-cutover-inventory.json",
  "content/legacy-content-migration-matrix.json",
];

async function digest(path) {
  return createHash("sha256").update(await readFile(new URL(path, projectRoot))).digest("hex");
}

function readyGate(required = 1) {
  return { completed: required, required, ready: true, blocker: "Blocked." };
}

test("combines all seven independent release gates fail closed", () => {
  const report = createPublicReleaseReadiness({
    approvals: { completed: 0, required: 33, ready: false, blocker: "Approvals remain." },
    campusMedia: { completed: 0, required: 4, ready: false, blocker: "Bindings remain." },
    publicDocuments: { completed: 0, required: 12, ready: false, blocker: "Documents remain." },
    mediaPerformance: { completed: 4, required: 5, ready: false, blocker: "One overage remains." },
    legacyRoutes: readyGate(35),
    contentMigration: { completed: 0, required: 115, ready: false, blocker: "Migration remains." },
    reviewTreatment: { completed: 0, required: 1, ready: false, blocker: "Review treatment remains." },
  });

  assert.equal(report.readyGates, 1);
  assert.equal(report.blockedGates, 6);
  assert.equal(report.totalGates, 7);
  assert.equal(report.blockingItems, 166);
  assert.equal(report.privateReviewAllowed, true);
  assert.equal(report.releaseReady, false);
  assert.deepEqual(report.gates.map((gate) => gate.id), [
    "publication-approvals",
    "campus-media-bindings",
    "public-document-bindings",
    "homepage-media-performance",
    "legacy-route-cutover",
    "legacy-content-migration",
    "review-only-treatment",
  ]);
});

test("reports public release ready only when every gate passes", () => {
  const report = createPublicReleaseReadiness({
    approvals: readyGate(33),
    campusMedia: readyGate(4),
    publicDocuments: readyGate(12),
    mediaPerformance: readyGate(5),
    legacyRoutes: readyGate(35),
    contentMigration: readyGate(115),
    reviewTreatment: readyGate(1),
  });

  assert.equal(report.readyGates, 7);
  assert.equal(report.blockedGates, 0);
  assert.equal(report.blockingItems, 0);
  assert.equal(report.releaseReady, true);
});

test("treats malformed gate counts as integrity failures", () => {
  const report = createPublicReleaseReadiness({
    approvals: { ...readyGate(33), completed: -1 },
    campusMedia: readyGate(4),
    publicDocuments: readyGate(12),
    mediaPerformance: readyGate(5),
    legacyRoutes: readyGate(35),
    contentMigration: readyGate(115),
    reviewTreatment: readyGate(1),
  });

  assert.equal(report.releaseReady, false);
  assert.equal(report.privateReviewAllowed, false);
  assert.match(report.issues.join("\n"), /Publication approvals: Gate progress is invalid\./);
});

test("audits the current repository as one read-only launch decision", async () => {
  const before = await Promise.all(controlledInputs.map(digest));
  const report = await auditPublicReleaseReadiness();
  const after = await Promise.all(controlledInputs.map(digest));

  assert.deepEqual(after, before, "The composite audit must not mutate controlled release inputs");
  assert.equal(report.readyGates, 2);
  assert.equal(report.blockedGates, 5);
  assert.equal(report.totalGates, 7);
  assert.equal(report.blockingItems, 165);
  assert.deepEqual(report.issues, []);
  assert.equal(report.privateReviewAllowed, true);
  assert.equal(report.releaseReady, false);
  assert.deepEqual(
    report.gates.map(({ id, completed, required, ready }) => ({ id, completed, required, ready })),
    [
      { id: "publication-approvals", completed: 0, required: 33, ready: false },
      { id: "campus-media-bindings", completed: 0, required: 4, ready: false },
      { id: "public-document-bindings", completed: 0, required: 12, ready: false },
      { id: "homepage-media-performance", completed: 4, required: 5, ready: false },
      { id: "legacy-route-cutover", completed: 35, required: 35, ready: true },
      { id: "legacy-content-migration", completed: 0, required: 115, ready: false },
      { id: "review-only-treatment", completed: 1, required: 1, ready: true },
    ],
  );
});

test("runs the composite gate before the specialized public-mode blockers", async () => {
  const [packageText, auditSource] = await Promise.all([
    readFile(new URL("package.json", projectRoot), "utf8"),
    readFile(new URL("lib/public-release-readiness-audit.mjs", projectRoot), "utf8"),
  ]);
  const scripts = JSON.parse(packageText).scripts;

  assert.match(scripts.prebuild, /release:audit.*media:bindings:audit.*documents:bindings:audit.*performance:audit/);
  assert.doesNotMatch(auditSource, /\b(?:writeFile|appendFile|rename|unlink|rm|mkdir)\s*\(/);
});
