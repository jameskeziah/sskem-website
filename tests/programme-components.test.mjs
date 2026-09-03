import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentNames = [
  "ProgrammeHero",
  "ProgrammeSubjectsStreams",
  "ProgrammeEligibility",
  "ProgrammeSchedule",
  "ProgrammeFeeSummary",
  "ProgrammeFacultyProfiles",
  "ProgrammeFacilities",
  "ProgrammeResults",
  "ProgrammeDocuments",
  "ProgrammeAdmissionsCta",
];

test("ships all ten reusable Programme components behind one publication boundary", async () => {
  const source = await readFile(new URL("../components/programmes/programme-components.tsx", import.meta.url), "utf8");

  for (const componentName of componentNames) {
    assert.match(source, new RegExp(`export function ${componentName}\\(`), componentName);
  }

  const boundaryUses = source.match(/<ProgrammePublicationBoundary\b/g) ?? [];
  assert.equal(boundaryUses.length, componentNames.length);
  assert.match(source, /if \(!isApprovedProgrammeRenderGate\(gate\)\) return null/);
  assert.doesNotMatch(source, /publicationReady\s*[:=]/);
});

test("keeps private person fields and pupil-level result fields out of the public component API", async () => {
  const source = await readFile(new URL("../components/programmes/programme-components.tsx", import.meta.url), "utf8");

  for (const forbiddenField of ["email", "phone", "studentName", "rollNumber", "marksheet", "guardian"]) {
    assert.doesNotMatch(source, new RegExp(`\\b${forbiddenField}\\b`, "i"), forbiddenField);
  }
  for (const aggregateField of ["cohortDefinition", "aggregateMetric", "aggregateValue"]) {
    assert.match(source, new RegExp(`\\b${aggregateField}\\b`), aggregateField);
  }
});

test("fails document rendering closed outside the guarded pipeline and keeps CTA links safe", async () => {
  const source = await readFile(new URL("../components/programmes/programme-components.tsx", import.meta.url), "utf8");

  assert.match(source, /function hasSafePublicHref/);
  assert.match(source, /documents\.some\(\(document\) => !isPipelineApprovedProgrammeDocument\(document\)\)/);
  assert.match(source, /!hasSafePublicHref\(primaryAction\.href\)/);
  assert.match(source, /secondaryAction.*!hasSafePublicHref\(secondaryAction\.href\)/s);
});

test("binds render authority to validator-issued plans and digest-matched route receipts", async () => {
  const [gateSource, publicationSource, globals] = await Promise.all([
    readFile(new URL("../lib/programmes-render-gate.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/programmes-publication.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(gateSource, /isIssuedProgrammesImplementationPlan\(plan\)/);
  assert.match(gateSource, /receiptRouteDigest !== routeDigest/);
  assert.match(gateSource, /issuedRenderGates\.has\(value\)/);
  assert.match(publicationSource, /issuedImplementationPlans\.add\(plan\)/);
  assert.match(publicationSource, /const plan = cloneAndFreeze\(/);
  assert.match(globals, /@import "\.\/programmes\.css"/);
});
