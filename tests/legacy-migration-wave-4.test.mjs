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
  "migration-a1e6df122be75213",
  "migration-e03d63929f41f8d5",
  "migration-b4d793ad2989b588",
  "migration-8bad5d06e8da4be2",
  "migration-8eb86dc3ec04ad61",
  "migration-8375600ceb777a8a",
  "migration-6c35e494ef66e80b",
  "migration-5314ee0461284f1e",
  "migration-68a35bb8f30dd722",
  "migration-8d40923c2b35ca38",
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
    const target = record.routeContinuity.targetPath ?? "/about";
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
  const [matrix, wave1Value, wave2Value, wave3Value, wave4Value] = await Promise.all([
    json("content/legacy-content-migration-matrix.json"),
    json("content/legacy-migration-wave-1.json"),
    json("content/legacy-migration-wave-2.json"),
    json("content/legacy-migration-wave-3.json"),
    json("content/legacy-migration-wave-4.json"),
  ]);
  return {
    matrix,
    wave1: parseLegacyMigrationWaveManifest(wave1Value),
    wave2: parseLegacyMigrationWaveManifest(wave2Value),
    wave3: parseLegacyMigrationWaveManifest(wave3Value),
    wave4: parseLegacyMigrationWaveManifest(wave4Value),
  };
}

async function mergeThroughWave3({ matrix, wave1, wave2, wave3, reviewedOn, now }) {
  const [masterCsv, wave1Template, wave2Template, wave3Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave1.recordIds),
    legacyContentMigrationWaveCsv(matrix, wave2.recordIds),
    legacyContentMigrationWaveCsv(matrix, wave3.recordIds),
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
  return { masterCsv, wave1Plan, wave2Plan, wave3Plan };
}

test("defines Wave 4 as ten mapped media index pages with runtime review gates", async () => {
  const { matrix, wave1, wave2, wave3, wave4 } = await fixtures();
  assert.deepEqual(validateLegacyContentMigrationMatrix(matrix), []);
  assert.deepEqual(wave4.recordIds, expectedRecordIds);
  assert.deepEqual(wave4.prerequisiteWaveIds, [wave1.waveId, wave2.waveId, wave3.waveId]);
  assert.equal(new Set([...wave1.recordIds, ...wave2.recordIds, ...wave3.recordIds, ...wave4.recordIds]).size, 36);
  assert.deepEqual(Object.values(wave4.policy), [false, false, false, false]);

  const recordsById = new Map(matrix.records.map((record) => [record.id, record]));
  const records = wave4.recordIds.map((recordId) => recordsById.get(recordId));
  assert.ok(records.every(Boolean));
  assert.ok(records.every((record) => record.sourceVisibility === "public"));
  assert.ok(records.every((record) => record.sourceKind === "page"));
  assert.ok(records.every((record) => record.identityProtected === false));
  assert.ok(records.every((record) => record.area === "media"));
  assert.ok(records.every((record) => record.routeContinuity.status === "implemented"));
  assert.ok(records.every((record) => record.contentDecision.decision === "unselected"));
  assert.ok(records.every((record) => record.implementationStatus === "not-started"));
  assert.ok(records.every((record) => requiredMediaReviews.every((review) => record.requiredReviews.includes(review))));
  assert.doesNotMatch(JSON.stringify(wave4), /source-html|source-wordpress|SSKEMS-BACKUP|[A-Za-z]:\\\\|\/Users\//i);
});

test("exports only the ten digest-bound Wave 4 rows", async () => {
  const { matrix, wave4 } = await fixtures();
  const csv = await legacyContentMigrationWaveCsv(matrix, wave4.recordIds);
  const lines = csv.replace(/^\uFEFF/, "").split("\r\n").filter(Boolean);
  assert.equal(lines.length, 11);
  assert.equal(lines[0], legacyMigrationDecisionWorksheetHeaders.map((value) => `"${value}"`).join(","));
  for (const recordId of expectedRecordIds) assert.match(csv, new RegExp(`"${recordId}"`));
  assert.doesNotMatch(csv, /Archived page text|source-html|source-wordpress|[A-Za-z]:\\\\|\/Users\//i);
});

test("requires the complete cumulative Wave 1, Wave 2 and Wave 3 master", async () => {
  const { matrix, wave1, wave2, wave3, wave4 } = await fixtures();
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const prerequisiteRecordIds = [...wave1.recordIds, ...wave2.recordIds, ...wave3.recordIds];
  const [masterCsv, wave4Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave4.recordIds),
  ]);
  const wave4Csv = completeWaveWorksheet(wave4Template, matrix, reviewedOn);
  const blankPlan = await mergeWave({ matrix, wave: wave4, waveName: "Wave 4", waveCsv: wave4Csv, masterCsv, prerequisiteRecordIds, now });
  assert.equal(blankPlan.status, "blocked");
  assert.equal(blankPlan.mergedCsv, null);
  assert.equal(blankPlan.summary.prerequisiteRecordsPresent, 0);
  assert.equal(blankPlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 26);

  const { wave2Plan } = await mergeThroughWave3({ matrix, wave1, wave2, wave3, reviewedOn, now });
  const wave2OnlyPlan = await mergeWave({
    matrix,
    wave: wave4,
    waveName: "Wave 4",
    waveCsv: wave4Csv,
    masterCsv: wave2Plan.mergedCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(wave2OnlyPlan.status, "blocked");
  assert.equal(wave2OnlyPlan.summary.prerequisiteRecordsPresent, 18);
  assert.equal(wave2OnlyPlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 8);
});

test("merges Wave 4 after all prior waves without changing any earlier row", async () => {
  const { matrix, wave1, wave2, wave3, wave4 } = await fixtures();
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const prerequisiteRecordIds = [...wave1.recordIds, ...wave2.recordIds, ...wave3.recordIds];
  const { wave3Plan } = await mergeThroughWave3({ matrix, wave1, wave2, wave3, reviewedOn, now });
  const beforeRows = parseLegacyMigrationDecisionCsv(wave3Plan.mergedCsv).rows;
  const header = beforeRows[0];
  const recordColumn = header.indexOf("record_id");
  const previousRows = new Map(beforeRows.slice(1)
    .filter((row) => prerequisiteRecordIds.includes(row[recordColumn]))
    .map((row) => [row[recordColumn], [...row]]));
  const previousOrder = beforeRows.slice(1).map((row) => row[recordColumn]);
  const wave4Template = await legacyContentMigrationWaveCsv(matrix, wave4.recordIds);
  const wave4Plan = await mergeWave({
    matrix,
    wave: wave4,
    waveName: "Wave 4",
    waveCsv: completeWaveWorksheet(wave4Template, matrix, reviewedOn),
    masterCsv: wave3Plan.mergedCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(wave4Plan.status, "ready-for-download", JSON.stringify(wave4Plan.issues));
  assert.equal(wave4Plan.summary.acceptedWaveRecords, 10);
  assert.equal(wave4Plan.summary.prerequisiteRecordsRequired, 26);
  assert.equal(wave4Plan.summary.prerequisiteRecordsPresent, 26);
  assert.equal(wave4Plan.summary.masterRecords, 115);
  assert.equal(wave4Plan.summary.carriedContentDecisions, 36);
  assert.equal(wave4Plan.summary.remainingContentDecisions, 79);
  assert.equal(wave4Plan.summary.remainingRouteDecisions, 79);
  assert.ok(wave4Plan.mergedCsv);
  const afterRows = parseLegacyMigrationDecisionCsv(wave4Plan.mergedCsv).rows.slice(1);
  assert.deepEqual(afterRows.map((row) => row[recordColumn]), previousOrder);
  for (const recordId of prerequisiteRecordIds) {
    assert.deepEqual(afterRows.find((row) => row[recordColumn] === recordId), previousRows.get(recordId));
  }
  assert.ok(Object.values(wave4Plan.guardrails).every((value) => value === false));

  const canonicalPlan = await createLegacyMigrationDecisionPlan({ csv: wave4Plan.mergedCsv, matrix, now });
  const decidedIds = new Set([...prerequisiteRecordIds, ...wave4.recordIds]);
  assert.ok(canonicalPlan.issues.every((issue) => !issue.row || !decidedIds.has(afterRows[issue.row - 2]?.[recordColumn])));
});

test("blocks altered prerequisites and conflicting current-wave decisions", async () => {
  const { matrix, wave1, wave2, wave3, wave4 } = await fixtures();
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const prerequisiteRecordIds = [...wave1.recordIds, ...wave2.recordIds, ...wave3.recordIds];
  const { wave3Plan } = await mergeThroughWave3({ matrix, wave1, wave2, wave3, reviewedOn, now });
  const wave4Template = await legacyContentMigrationWaveCsv(matrix, wave4.recordIds);
  const wave4Csv = completeWaveWorksheet(wave4Template, matrix, reviewedOn);

  const alteredRows = parseLegacyMigrationDecisionCsv(wave3Plan.mergedCsv).rows;
  const alteredHeader = alteredRows[0];
  const firstWave3Row = alteredRows.find((row) => row[alteredHeader.indexOf("record_id")] === wave3.recordIds[0]);
  firstWave3Row[alteredHeader.indexOf("proposed_content_decision")] = " ";
  const alteredPlan = await mergeWave({
    matrix,
    wave: wave4,
    waveName: "Wave 4",
    waveCsv: wave4Csv,
    masterCsv: serializeLegacyMigrationDecisionCsv(alteredRows),
    prerequisiteRecordIds,
    now,
  });
  assert.equal(alteredPlan.status, "blocked");
  assert.ok(alteredPlan.issues.some((issue) => issue.source === "decision-contract" && issue.code === "content-decision-missing"));

  const conflictRows = parseLegacyMigrationDecisionCsv(wave3Plan.mergedCsv).rows;
  const conflictHeader = conflictRows[0];
  const firstWave4Row = conflictRows.find((row) => row[conflictHeader.indexOf("record_id")] === wave4.recordIds[0]);
  firstWave4Row[conflictHeader.indexOf("proposed_content_decision")] = "archive";
  const conflictPlan = await mergeWave({
    matrix,
    wave: wave4,
    waveName: "Wave 4",
    waveCsv: wave4Csv,
    masterCsv: serializeLegacyMigrationDecisionCsv(conflictRows),
    prerequisiteRecordIds,
    now,
  });
  assert.equal(conflictPlan.status, "blocked");
  assert.ok(conflictPlan.issues.some((issue) => issue.code === "wave-decision-conflict"));
});

test("blocks invalid cumulative prerequisite sets", async () => {
  const { matrix, wave1, wave2, wave3, wave4 } = await fixtures();
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const [masterCsv, wave4Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave4.recordIds),
  ]);
  const wave4Csv = completeWaveWorksheet(wave4Template, matrix, reviewedOn);
  const base = [...wave1.recordIds, ...wave2.recordIds, ...wave3.recordIds];
  for (const invalidPrerequisiteRecordIds of [
    [...base, wave1.recordIds[0]],
    [...base, "migration-0000000000000000"],
    [...base, wave4.recordIds[0]],
  ]) {
    const plan = await mergeWave({
      matrix,
      wave: wave4,
      waveName: "Wave 4",
      waveCsv: wave4Csv,
      masterCsv,
      prerequisiteRecordIds: invalidPrerequisiteRecordIds,
      now,
    });
    assert.equal(plan.status, "blocked");
    assert.ok(plan.issues.some((issue) => issue.code === "prerequisite-record-invalid"));
  }
});

test("ships Wave 4 as an authenticated noindex browser-only workspace", async () => {
  const [page, workspace, form, exportRoute, dataModule, waveEngine, dashboard, sitemap, guide] = await Promise.all([
    source("app/publication-review/migration-wave-4/page.tsx"),
    source("app/publication-review/migration-wave-workspace.tsx"),
    source("app/publication-review/migration-wave-merge-form.tsx"),
    source("app/publication-review/migration-wave-4/export/route.ts"),
    source("app/data/legacy-migration-wave-4.ts"),
    source("app/data/legacy-migration-wave.ts"),
    source("app/publication-review/page.tsx"),
    source("app/sitemap.ts"),
    source("docs/legacy-content-migration.md"),
  ]);
  assert.match(page, /HOMEPAGE_REVIEW_MODE !== "private"/);
  assert.match(page, /requireChatGPTUser\("\/publication-review\/migration-wave-4"\)/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(page, /all twenty-six earlier decisions/);
  assert.match(page, /does not import or approve photographs, videos, captions, pupil identities, achievement claims, consent records, rights evidence or archival copy/);
  assert.match(workspace, /No archived copy is approved or published/);
  assert.match(form, /Promise\.all\(\[waveFile\.text\(\), masterFile\.text\(\)\]\)/);
  assert.match(form, /URL\.createObjectURL\(new Blob/);
  assert.doesNotMatch(`${page}\n${workspace}\n${form}`, /\bfetch\s*\(|FormData|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|\bcaches\b|document\.cookie|serviceWorker|use server/);
  assert.match(exportRoute, /requireChatGPTUser\("\/publication-review\/migration-wave-4\/export"\)/);
  assert.match(exportRoute, /"cache-control": "private, no-store"/);
  assert.match(exportRoute, /"x-content-type-options": "nosniff"/);
  assert.match(dataModule, /allowedAreas: \["media"\]/);
  assert.match(dataModule, /prerequisiteWaves: \[legacyMigrationWave1, legacyMigrationWave2, legacyMigrationWave3\]/);
  assert.match(dataModule, /requireMappedRoutes: true/);
  for (const review of requiredMediaReviews) assert.match(dataModule, new RegExp(`"${review}"`));
  assert.match(waveEngine, /requiredReviews\.some\(\(review\) => !record\.requiredReviews\.includes\(review\)\)/);
  assert.match(dashboard, /href="\/publication-review\/migration-wave-4"/);
  assert.doesNotMatch(sitemap, /migration-wave-4/);
  assert.match(guide, /independent media inspection, approval, derivative-binding and publication gates remain mandatory/);
});
