import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  legacyContentMigrationCsv,
  legacyContentMigrationWaveCsv,
  legacyMigrationDecisionWorksheetHeaders,
  validateLegacyContentMigrationMatrix,
} from "../lib/legacy-content-migration.ts";
import {
  createLegacyMigrationDecisionPlan,
  parseLegacyMigrationDecisionCsv,
} from "../lib/legacy-migration-decision-intake.ts";
import { parseLegacyMigrationWaveManifest } from "../lib/legacy-migration-wave-manifest.ts";
import {
  createLegacyMigrationWaveMergePlan,
  serializeLegacyMigrationDecisionCsv,
} from "../lib/legacy-migration-wave-merge.ts";

const root = process.cwd();
const source = (relativePath) => readFile(path.join(root, relativePath), "utf8");
const json = async (relativePath) => JSON.parse(await source(relativePath));
const expectedRecordIds = [
  "migration-a6854dddb8e5e119",
  "migration-aab602585bce5529",
  "migration-0962f7a5e13423a8",
  "migration-7fa25739598a6571",
  "migration-9bb6e10a106c1ba0",
];
const requiredMediaReviews = [
  "accuracy",
  "currency",
  "editorial",
  "management-approval",
  "privacy",
  "rights",
  "retention",
  "accessibility",
];

function completeWaveWorksheet(csv, matrix, reviewedOn) {
  const parsed = parseLegacyMigrationDecisionCsv(csv);
  assert.equal(parsed.error, false);
  const [header, ...rows] = parsed.rows;
  const column = Object.fromEntries(header.map((name, index) => [name, index]));
  const recordsById = new Map(matrix.records.map((record) => [record.id, record]));
  for (const row of rows) {
    const record = recordsById.get(row[column.record_id]);
    assert.ok(record);
    const target = record.routeContinuity.targetPath
      ?? (record.label === "Electronic Media" ? "/about/news" : "/student-life/gallery");
    if (record.routeContinuity.status === "decision-required") {
      row[column.proposed_route_action] = "redirect";
      row[column.proposed_route_target] = target;
    }
    row[column.proposed_content_decision] = "rewrite";
    row[column.proposed_content_target] = target;
    row[column.proposed_merge_into_record_id] = "";
    row[column.proposed_reason_code] = "replace-with-current-information";
    row[column.proposed_owner_role] = record.area === "media" ? "media-owner"
      : record.area === "admissions" ? "admissions-office"
        : record.area === "academics" ? "academic-office"
          : record.area === "disclosure" ? "compliance-owner"
            : "school-management";
    row[column.proposed_reviewed_on] = reviewedOn;
  }
  return serializeLegacyMigrationDecisionCsv([header, ...rows]);
}

function mergeWave({ matrix, wave, waveName, waveCsv, masterCsv, prerequisiteRecordIds, now }) {
  return createLegacyMigrationWaveMergePlan({
    waveCsv,
    masterCsv,
    matrix,
    waveId: wave.waveId,
    waveName,
    waveRecordIds: wave.recordIds,
    prerequisiteRecordIds,
    now,
  });
}

async function fixtures() {
  const [matrix, wave1Value, wave2Value, wave3Value, wave4Value, wave5Value] = await Promise.all([
    json("content/legacy-content-migration-matrix.json"),
    json("content/legacy-migration-wave-1.json"),
    json("content/legacy-migration-wave-2.json"),
    json("content/legacy-migration-wave-3.json"),
    json("content/legacy-migration-wave-4.json"),
    json("content/legacy-migration-wave-5.json"),
  ]);
  return {
    matrix,
    wave1: parseLegacyMigrationWaveManifest(wave1Value),
    wave2: parseLegacyMigrationWaveManifest(wave2Value),
    wave3: parseLegacyMigrationWaveManifest(wave3Value),
    wave4: parseLegacyMigrationWaveManifest(wave4Value),
    wave5: parseLegacyMigrationWaveManifest(wave5Value),
  };
}

async function mergeThroughWave4({ matrix, wave1, wave2, wave3, wave4, reviewedOn, now }) {
  const [masterCsv, wave1Template, wave2Template, wave3Template, wave4Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave1.recordIds),
    legacyContentMigrationWaveCsv(matrix, wave2.recordIds),
    legacyContentMigrationWaveCsv(matrix, wave3.recordIds),
    legacyContentMigrationWaveCsv(matrix, wave4.recordIds),
  ]);
  const wave1Plan = await mergeWave({
    matrix,
    wave: wave1,
    waveName: "Wave 1",
    waveCsv: completeWaveWorksheet(wave1Template, matrix, reviewedOn),
    masterCsv,
    prerequisiteRecordIds: [],
    now,
  });
  assert.equal(wave1Plan.status, "ready-for-download", JSON.stringify(wave1Plan.issues));
  const wave2Plan = await mergeWave({
    matrix,
    wave: wave2,
    waveName: "Wave 2",
    waveCsv: completeWaveWorksheet(wave2Template, matrix, reviewedOn),
    masterCsv: wave1Plan.mergedCsv,
    prerequisiteRecordIds: wave1.recordIds,
    now,
  });
  assert.equal(wave2Plan.status, "ready-for-download", JSON.stringify(wave2Plan.issues));
  const wave3Plan = await mergeWave({
    matrix,
    wave: wave3,
    waveName: "Wave 3",
    waveCsv: completeWaveWorksheet(wave3Template, matrix, reviewedOn),
    masterCsv: wave2Plan.mergedCsv,
    prerequisiteRecordIds: [...wave1.recordIds, ...wave2.recordIds],
    now,
  });
  assert.equal(wave3Plan.status, "ready-for-download", JSON.stringify(wave3Plan.issues));
  const wave4Plan = await mergeWave({
    matrix,
    wave: wave4,
    waveName: "Wave 4",
    waveCsv: completeWaveWorksheet(wave4Template, matrix, reviewedOn),
    masterCsv: wave3Plan.mergedCsv,
    prerequisiteRecordIds: [...wave1.recordIds, ...wave2.recordIds, ...wave3.recordIds],
    now,
  });
  assert.equal(wave4Plan.status, "ready-for-download", JSON.stringify(wave4Plan.issues));
  return { masterCsv, wave1Plan, wave2Plan, wave3Plan, wave4Plan };
}

test("defines Wave 5 as five unresolved historic media pages with runtime review gates", async () => {
  const { matrix, wave1, wave2, wave3, wave4, wave5 } = await fixtures();
  assert.deepEqual(validateLegacyContentMigrationMatrix(matrix), []);
  assert.deepEqual(wave5.recordIds, expectedRecordIds);
  assert.deepEqual(wave5.prerequisiteWaveIds, [wave1.waveId, wave2.waveId, wave3.waveId, wave4.waveId]);
  assert.equal(new Set([...wave1.recordIds, ...wave2.recordIds, ...wave3.recordIds, ...wave4.recordIds, ...wave5.recordIds]).size, 41);
  assert.deepEqual(Object.values(wave5.policy), [false, false, false, false]);

  const recordsById = new Map(matrix.records.map((record) => [record.id, record]));
  const records = wave5.recordIds.map((recordId) => recordsById.get(recordId));
  assert.ok(records.every(Boolean));
  assert.ok(records.every((record) => record.sourceVisibility === "public"));
  assert.ok(records.every((record) => record.sourceKind === "page"));
  assert.ok(records.every((record) => record.sourceStatus === "publish"));
  assert.ok(records.every((record) => record.identityProtected === false));
  assert.ok(records.every((record) => record.area === "media"));
  assert.ok(records.every((record) => record.routeContinuity.status === "decision-required"));
  assert.ok(records.every((record) => record.routeContinuity.action === "unselected"));
  assert.ok(records.every((record) => record.routeContinuity.targetPath === null));
  assert.ok(records.every((record) => record.contentDecision.decision === "unselected"));
  assert.ok(records.every((record) => record.implementationStatus === "not-started"));
  assert.ok(records.every((record) => record.publicationEligible === false));
  assert.ok(records.every((record) => record.publicationReason === "decision-and-approval-required"));
  for (const record of records) assert.deepEqual(record.requiredReviews, requiredMediaReviews);
  assert.doesNotMatch(JSON.stringify(wave5), /source-html|source-wordpress|SSKEMS-BACKUP|[A-Za-z]:\\\\|\/Users\//i);
});

test("exports only the five digest-bound Wave 5 rows", async () => {
  const { matrix, wave5 } = await fixtures();
  const csv = await legacyContentMigrationWaveCsv(matrix, wave5.recordIds);
  const lines = csv.replace(/^\uFEFF/, "").split("\r\n").filter(Boolean);
  assert.equal(lines.length, 6);
  assert.equal(lines[0], legacyMigrationDecisionWorksheetHeaders.map((value) => `"${value}"`).join(","));
  for (const recordId of expectedRecordIds) assert.match(csv, new RegExp(`"${recordId}"`));
  assert.doesNotMatch(csv, /Archived page text|source-html|source-wordpress|[A-Za-z]:\\\\|\/Users\//i);
});

test("requires the complete cumulative Wave 1 through Wave 4 master", async () => {
  const { matrix, wave1, wave2, wave3, wave4, wave5 } = await fixtures();
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const prerequisiteRecordIds = [...wave1.recordIds, ...wave2.recordIds, ...wave3.recordIds, ...wave4.recordIds];
  const [masterCsv, wave5Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave5.recordIds),
  ]);
  const wave5Csv = completeWaveWorksheet(wave5Template, matrix, reviewedOn);
  const blankPlan = await mergeWave({ matrix, wave: wave5, waveName: "Wave 5", waveCsv: wave5Csv, masterCsv, prerequisiteRecordIds, now });
  assert.equal(blankPlan.status, "blocked");
  assert.equal(blankPlan.mergedCsv, null);
  assert.equal(blankPlan.summary.prerequisiteRecordsPresent, 0);
  assert.equal(blankPlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 36);

  const { wave3Plan } = await mergeThroughWave4({ matrix, wave1, wave2, wave3, wave4, reviewedOn, now });
  const wave3OnlyPlan = await mergeWave({
    matrix,
    wave: wave5,
    waveName: "Wave 5",
    waveCsv: wave5Csv,
    masterCsv: wave3Plan.mergedCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(wave3OnlyPlan.status, "blocked");
  assert.equal(wave3OnlyPlan.summary.prerequisiteRecordsPresent, 26);
  assert.equal(wave3OnlyPlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 10);
});

test("merges Wave 5 after all prior waves without changing any earlier row", async () => {
  const { matrix, wave1, wave2, wave3, wave4, wave5 } = await fixtures();
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const prerequisiteRecordIds = [...wave1.recordIds, ...wave2.recordIds, ...wave3.recordIds, ...wave4.recordIds];
  const { wave4Plan } = await mergeThroughWave4({ matrix, wave1, wave2, wave3, wave4, reviewedOn, now });
  const beforeRows = parseLegacyMigrationDecisionCsv(wave4Plan.mergedCsv).rows;
  const header = beforeRows[0];
  const recordColumn = header.indexOf("record_id");
  const previousRows = new Map(beforeRows.slice(1)
    .filter((row) => prerequisiteRecordIds.includes(row[recordColumn]))
    .map((row) => [row[recordColumn], [...row]]));
  const previousOrder = beforeRows.slice(1).map((row) => row[recordColumn]);
  const wave5Template = await legacyContentMigrationWaveCsv(matrix, wave5.recordIds);
  const wave5Plan = await mergeWave({
    matrix,
    wave: wave5,
    waveName: "Wave 5",
    waveCsv: completeWaveWorksheet(wave5Template, matrix, reviewedOn),
    masterCsv: wave4Plan.mergedCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(wave5Plan.status, "ready-for-download", JSON.stringify(wave5Plan.issues));
  assert.equal(wave5Plan.summary.acceptedWaveRecords, 5);
  assert.equal(wave5Plan.summary.prerequisiteRecordsRequired, 36);
  assert.equal(wave5Plan.summary.prerequisiteRecordsPresent, 36);
  assert.equal(wave5Plan.summary.masterRecords, 115);
  assert.equal(wave5Plan.summary.carriedContentDecisions, 41);
  assert.equal(wave5Plan.summary.remainingContentDecisions, 74);
  assert.equal(wave5Plan.summary.remainingRouteDecisions, 74);
  assert.ok(wave5Plan.mergedCsv);
  const afterRows = parseLegacyMigrationDecisionCsv(wave5Plan.mergedCsv).rows.slice(1);
  assert.deepEqual(afterRows.map((row) => row[recordColumn]), previousOrder);
  for (const recordId of prerequisiteRecordIds) {
    assert.deepEqual(afterRows.find((row) => row[recordColumn] === recordId), previousRows.get(recordId));
  }
  assert.ok(Object.values(wave5Plan.guardrails).every((value) => value === false));

  const canonicalPlan = await createLegacyMigrationDecisionPlan({ csv: wave5Plan.mergedCsv, matrix, now });
  const decidedIds = new Set([...prerequisiteRecordIds, ...wave5.recordIds]);
  assert.ok(canonicalPlan.issues.every((issue) => !issue.row || !decidedIds.has(afterRows[issue.row - 2]?.[recordColumn])));
});

test("blocks altered prerequisites and conflicting current-wave decisions", async () => {
  const { matrix, wave1, wave2, wave3, wave4, wave5 } = await fixtures();
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const prerequisiteRecordIds = [...wave1.recordIds, ...wave2.recordIds, ...wave3.recordIds, ...wave4.recordIds];
  const { wave4Plan } = await mergeThroughWave4({ matrix, wave1, wave2, wave3, wave4, reviewedOn, now });
  const wave5Template = await legacyContentMigrationWaveCsv(matrix, wave5.recordIds);
  const wave5Csv = completeWaveWorksheet(wave5Template, matrix, reviewedOn);

  const alteredRows = parseLegacyMigrationDecisionCsv(wave4Plan.mergedCsv).rows;
  const alteredHeader = alteredRows[0];
  const firstWave4Row = alteredRows.find((row) => row[alteredHeader.indexOf("record_id")] === wave4.recordIds[0]);
  firstWave4Row[alteredHeader.indexOf("proposed_content_decision")] = " ";
  const alteredPlan = await mergeWave({
    matrix,
    wave: wave5,
    waveName: "Wave 5",
    waveCsv: wave5Csv,
    masterCsv: serializeLegacyMigrationDecisionCsv(alteredRows),
    prerequisiteRecordIds,
    now,
  });
  assert.equal(alteredPlan.status, "blocked");
  assert.ok(alteredPlan.issues.some((issue) => issue.source === "decision-contract" && issue.code === "content-decision-missing"));

  const conflictRows = parseLegacyMigrationDecisionCsv(wave4Plan.mergedCsv).rows;
  const conflictHeader = conflictRows[0];
  const firstWave5Row = conflictRows.find((row) => row[conflictHeader.indexOf("record_id")] === wave5.recordIds[0]);
  firstWave5Row[conflictHeader.indexOf("proposed_route_action")] = "retire";
  firstWave5Row[conflictHeader.indexOf("proposed_content_decision")] = "archive";
  const conflictPlan = await mergeWave({
    matrix,
    wave: wave5,
    waveName: "Wave 5",
    waveCsv: wave5Csv,
    masterCsv: serializeLegacyMigrationDecisionCsv(conflictRows),
    prerequisiteRecordIds,
    now,
  });
  assert.equal(conflictPlan.status, "blocked");
  assert.ok(conflictPlan.issues.some((issue) => issue.code === "wave-decision-conflict"));

  const unsafeRows = parseLegacyMigrationDecisionCsv(wave5Csv).rows;
  const unsafeHeader = unsafeRows[0];
  const unsafeColumn = Object.fromEntries(unsafeHeader.map((name, index) => [name, index]));
  unsafeRows[1][unsafeColumn.proposed_route_action] = "";
  unsafeRows[2][unsafeColumn.proposed_route_action] = "private-only";
  unsafeRows[2][unsafeColumn.proposed_route_target] = "";
  unsafeRows[3][unsafeColumn.proposed_reason_code] = "=SUM(1,1)";
  unsafeRows[4][unsafeColumn.proposed_route_target] = unsafeRows[4][unsafeColumn.legacy_path];
  const unsafePlan = await mergeWave({
    matrix,
    wave: wave5,
    waveName: "Wave 5",
    waveCsv: serializeLegacyMigrationDecisionCsv(unsafeRows),
    masterCsv: wave4Plan.mergedCsv,
    prerequisiteRecordIds,
    now,
  });
  const unsafeCodes = new Set(unsafePlan.issues.map((issue) => issue.code));
  assert.equal(unsafePlan.status, "blocked");
  for (const code of ["route-decision-missing", "route-target-invalid", "formula-like-input"]) {
    assert.ok(unsafeCodes.has(code), `Expected ${code}`);
  }

  const staleRows = parseLegacyMigrationDecisionCsv(wave5Csv).rows;
  const staleHeader = staleRows[0];
  staleRows[1][staleHeader.indexOf("label")] = "Changed immutable label";
  const stalePlan = await mergeWave({
    matrix,
    wave: wave5,
    waveName: "Wave 5",
    waveCsv: serializeLegacyMigrationDecisionCsv(staleRows),
    masterCsv: wave4Plan.mergedCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(stalePlan.status, "blocked");
  assert.ok(stalePlan.issues.some((issue) => issue.code === "wave-binding-stale"));
});

test("blocks invalid cumulative prerequisite sets", async () => {
  const { matrix, wave1, wave2, wave3, wave4, wave5 } = await fixtures();
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const [masterCsv, wave5Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave5.recordIds),
  ]);
  const wave5Csv = completeWaveWorksheet(wave5Template, matrix, reviewedOn);
  const base = [...wave1.recordIds, ...wave2.recordIds, ...wave3.recordIds, ...wave4.recordIds];
  for (const invalidPrerequisiteRecordIds of [
    [...base, wave1.recordIds[0]],
    [...base, "migration-0000000000000000"],
    [...base, wave5.recordIds[0]],
  ]) {
    const plan = await mergeWave({
      matrix,
      wave: wave5,
      waveName: "Wave 5",
      waveCsv: wave5Csv,
      masterCsv,
      prerequisiteRecordIds: invalidPrerequisiteRecordIds,
      now,
    });
    assert.equal(plan.status, "blocked");
    assert.ok(plan.issues.some((issue) => issue.code === "prerequisite-record-invalid"));
  }
});

test("ships Wave 5 as an authenticated noindex browser-only workspace", async () => {
  const [page, workspace, form, exportRoute, dataModule, waveEngine, dashboard, sitemap, guide] = await Promise.all([
    source("app/publication-review/migration-wave-5/page.tsx"),
    source("app/publication-review/migration-wave-workspace.tsx"),
    source("app/publication-review/migration-wave-merge-form.tsx"),
    source("app/publication-review/migration-wave-5/export/route.ts"),
    source("app/data/legacy-migration-wave-5.ts"),
    source("app/data/legacy-migration-wave.ts"),
    source("app/publication-review/page.tsx"),
    source("app/sitemap.ts"),
    source("docs/legacy-content-migration.md"),
  ]);
  assert.match(page, /HOMEPAGE_REVIEW_MODE !== "private"/);
  assert.match(page, /requireChatGPTUser\("\/publication-review\/migration-wave-5"\)/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(page, /all thirty-six earlier decisions/);
  assert.match(page, /No destination is preselected/);
  assert.match(page, /does not import or approve photographs, videos, captions, names, pupil identities, achievement claims, consent records, rights evidence or archival copy/);
  assert.match(page, /cannot authorize an asset or public release/);
  assert.match(workspace, /No archived copy is approved or published/);
  assert.match(workspace, /No route treatment is preselected/);
  assert.match(form, /Promise\.all\(\[waveFile\.text\(\), masterFile\.text\(\)\]\)/);
  assert.match(form, /URL\.createObjectURL\(new Blob/);
  assert.doesNotMatch(`${page}\n${workspace}\n${form}`, /\bfetch\s*\(|FormData|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|\bcaches\b|document\.cookie|serviceWorker|use server/);
  assert.match(exportRoute, /requireChatGPTUser\("\/publication-review\/migration-wave-5\/export"\)/);
  assert.match(exportRoute, /"cache-control": "private, no-store"/);
  assert.match(exportRoute, /"x-content-type-options": "nosniff"/);
  assert.match(dataModule, /allowedAreas: \["media"\]/);
  assert.match(dataModule, /prerequisiteWaves: \[[\s\S]*legacyMigrationWave1,[\s\S]*legacyMigrationWave2,[\s\S]*legacyMigrationWave3,[\s\S]*legacyMigrationWave4,[\s\S]*\]/);
  assert.match(dataModule, /requireRouteDecisions: true/);
  assert.doesNotMatch(dataModule, /requireMappedRoutes: true/);
  for (const review of requiredMediaReviews) assert.match(dataModule, new RegExp(`"${review}"`));
  assert.match(waveEngine, /requireMappedRoutes && requireRouteDecisions/);
  assert.match(waveEngine, /requireRouteDecisions && record\.routeContinuity\.status !== "decision-required"/);
  assert.match(waveEngine, /requiredReviews\.some\(\(review\) => !record\.requiredReviews\.includes\(review\)\)/);
  assert.match(dashboard, /href="\/publication-review\/migration-wave-5"/);
  assert.doesNotMatch(sitemap, /migration-wave-5/);
  assert.match(guide, /The 30 event-level gallery records are deliberately deferred/);
  assert.match(guide, /successful browser-only merge carries 41 decisions/);
});
