import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  auditProgrammesPerformanceBudget,
  programmesPerformanceBudget,
  validateProgrammesPerformanceBudget,
} from "../lib/programmes-performance-budget.ts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

test("defines strict Programme budgets for media, page weight, fonts, motion and Web Vitals", () => {
  assert.deepEqual(validateProgrammesPerformanceBudget(), []);
  assert.deepEqual(programmesPerformanceBudget.scope.routes, [
    "/school/academics",
    "/junior-college",
    "/programmes/jee-neet",
  ]);
  assert.equal(programmesPerformanceBudget.heroMedia.maximumImageBytes, 250000);
  assert.equal(programmesPerformanceBudget.heroMedia.maximumVideoBytes, 3000000);
  assert.equal(programmesPerformanceBudget.heroMedia.maximumInitialVideoTransferBytes, 0);
  assert.equal(programmesPerformanceBudget.pageWeight.maximumInitialTransferBytes, 1500000);
  assert.equal(programmesPerformanceBudget.fonts.maximumTransferBytes, 0);
  assert.equal(programmesPerformanceBudget.animations.maximumSingleDurationMs, 700);
  assert.equal(programmesPerformanceBudget.webVitals.maximumLcpMs, 2500);
  assert.equal(programmesPerformanceBudget.webVitals.maximumCls, 0.1);
});

test("fails closed on unknown fields and relaxed limits", () => {
  const unknown = structuredClone(programmesPerformanceBudget);
  unknown.unreviewedOverride = true;
  assert.match(validateProgrammesPerformanceBudget(unknown).join("\n"), /unknown top-level fields/i);

  const relaxed = structuredClone(programmesPerformanceBudget);
  relaxed.heroMedia.maximumImageBytes = 300000;
  relaxed.pageWeight.maximumInitialTransferBytes = 1600000;
  relaxed.webVitals.maximumCls = 0.2;
  const errors = validateProgrammesPerformanceBudget(relaxed).join("\n");
  assert.match(errors, /hero-media limits exceed/i);
  assert.match(errors, /page-weight limits exceed/i);
  assert.match(errors, /Web Vitals limits exceed/i);
});

test("audits current hero assets, system fonts and motion tokens without modifying files", async () => {
  const report = await auditProgrammesPerformanceBudget({ rootDir: projectRoot });
  assert.deepEqual(report.issues, []);
  assert.equal(report.measurements.length, 3);
  assert.equal(report.measurements.every((asset) => asset.bytes <= asset.maximumBytes), true);
  assert.equal(report.fontFamilies, 2);
  assert.equal(report.fontFiles, 0);
  assert.equal(report.longestMotionMs, 700);
  assert.equal(report.ready, true);
});

test("wires static and runtime Programme performance gates into private review", async () => {
  const [packageText, scriptText, browserSpec] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/audit-programmes-performance.mjs", import.meta.url), "utf8"),
    readFile(new URL("./browser/programmes-performance.spec.ts", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageText);

  assert.match(packageJson.scripts.prebuild, /programmes:performance:audit/);
  assert.match(packageJson.scripts["test:qa:programmes:review"], /programmes-performance\.spec\.ts/);
  assert.match(packageJson.scripts["test:contract"], /programmes-performance-budget\.test\.mjs/);
  assert.match(browserSpec, /largest-contentful-paint/);
  assert.match(browserSpec, /layout-shift/);
  assert.doesNotMatch(scriptText, /writeFile|rename|unlink|rm\(/);
});
