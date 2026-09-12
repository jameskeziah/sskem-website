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
  "migration-31d7cfe9b2187420",
  "migration-285838132ad09bae",
  "migration-f3dfcc0f172a767c",
  "migration-ad39aa3124e82a9e",
  "migration-593e5c80a327f34f",
  "migration-7bdf9d1295a69aaa",
  "migration-401b36ded2742646",
  "migration-c6806a6f67019b84",
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
    row[column.proposed_owner_role] = record.area === "admissions" ? "admissions-office"
      : record.area === "disclosure" ? "compliance-owner"
        : record.area === "academics" ? "academic-office"
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
  const [matrix, wave1Value, wave2Value, wave3Value] = await Promise.all([
    json("content/legacy-content-migration-matrix.json"),
    json("content/legacy-migration-wave-1.json"),
    json("content/legacy-migration-wave-2.json"),
    json("content/legacy-migration-wave-3.json"),
  ]);
  return {
    matrix,
    wave1: parseLegacyMigrationWaveManifest(wave1Value),
    wave2: parseLegacyMigrationWaveManifest(wave2Value),
    wave3: parseLegacyMigrationWaveManifest(wave3Value),
  };
}

test("defines Wave 3 as eight mapped academic and compliance records", async () => {
  const [{ matrix, wave1, wave2, wave3 }, schema] = await Promise.all([
    fixtures(),
    json("content/legacy-migration-wave.schema.json"),
  ]);
  assert.deepEqual(validateLegacyContentMigrationMatrix(matrix), []);
  assert.deepEqual(wave3.recordIds, expectedRecordIds);
  assert.deepEqual(wave3.prerequisiteWaveIds, [wave1.waveId, wave2.waveId]);
  assert.equal(new Set([...wave1.recordIds, ...wave2.recordIds, ...wave3.recordIds]).size, 26);
  assert.deepEqual(Object.values(wave3.policy), [false, false, false, false]);
  assert.match(schema.properties.prerequisiteWaveIds.description, /Cumulative IDs for every earlier wave/);
  assert.throws(() => parseLegacyMigrationWaveManifest({ ...wave3, prerequisiteWaveIds: [wave2.waveId] }), /closed schema contract/);
  assert.throws(() => parseLegacyMigrationWaveManifest({ ...wave3, prerequisiteWaveIds: [wave2.waveId, wave1.waveId] }), /closed schema contract/);

  const recordsById = new Map(matrix.records.map((record) => [record.id, record]));
  const records = wave3.recordIds.map((recordId) => recordsById.get(recordId));
  assert.ok(records.every(Boolean));
  assert.ok(records.every((record) => record.sourceVisibility === "public"));
  assert.ok(records.every((record) => record.sourceKind === "page"));
  assert.ok(records.every((record) => record.identityProtected === false));
  assert.ok(records.every((record) => ["academics", "admissions", "disclosure"].includes(record.area)));
  assert.ok(records.every((record) => record.routeContinuity.status === "implemented"));
  assert.ok(records.every((record) => record.contentDecision.decision === "unselected"));
  assert.ok(records.every((record) => record.implementationStatus === "not-started"));
  assert.ok(records.every((record) => ["accuracy", "currency", "editorial", "management-approval"]
    .every((review) => record.requiredReviews.includes(review))));
  assert.doesNotMatch(JSON.stringify(wave3), /source-html|source-wordpress|SSKEMS-BACKUP|[A-Za-z]:\\\\|\/Users\//i);
});

test("exports only the eight digest-bound Wave 3 rows", async () => {
  const { matrix, wave3 } = await fixtures();
  const csv = await legacyContentMigrationWaveCsv(matrix, wave3.recordIds);
  const lines = csv.replace(/^\uFEFF/, "").split("\r\n").filter(Boolean);
  assert.equal(lines.length, 9);
  assert.equal(lines[0], legacyMigrationDecisionWorksheetHeaders.map((value) => `"${value}"`).join(","));
  for (const recordId of expectedRecordIds) assert.match(csv, new RegExp(`"${recordId}"`));
  assert.doesNotMatch(csv, /Archived page text|source-html|source-wordpress|[A-Za-z]:\\\\|\/Users\//i);
});

test("requires the complete cumulative Wave 1 and Wave 2 master", async () => {
  const { matrix, wave1, wave2, wave3 } = await fixtures();
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const prerequisiteRecordIds = [...wave1.recordIds, ...wave2.recordIds];
  const [masterCsv, wave1Template, wave3Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave1.recordIds),
    legacyContentMigrationWaveCsv(matrix, wave3.recordIds),
  ]);
  const wave3Csv = completeWaveWorksheet(wave3Template, matrix, reviewedOn);

  const blankPlan = await mergeWave({ matrix, wave: wave3, waveName: "Wave 3", waveCsv: wave3Csv, masterCsv, prerequisiteRecordIds, now });
  assert.equal(blankPlan.status, "blocked");
  assert.equal(blankPlan.mergedCsv, null);
  assert.equal(blankPlan.summary.prerequisiteRecordsPresent, 0);
  assert.equal(blankPlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 18);

  const wave1Plan = await mergeWave({
    matrix,
    wave: wave1,
    waveName: "Wave 1",
    waveCsv: completeWaveWorksheet(wave1Template, matrix, reviewedOn),
    masterCsv,
    prerequisiteRecordIds: [],
    now,
  });
  assert.equal(wave1Plan.status, "ready-for-download");
  const wave1OnlyPlan = await mergeWave({
    matrix,
    wave: wave3,
    waveName: "Wave 3",
    waveCsv: wave3Csv,
    masterCsv: wave1Plan.mergedCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(wave1OnlyPlan.status, "blocked");
  assert.equal(wave1OnlyPlan.summary.prerequisiteRecordsPresent, 10);
  assert.equal(wave1OnlyPlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 8);
});

test("merges Wave 3 after both prior waves and preserves all eighteen earlier decisions", async () => {
  const { matrix, wave1, wave2, wave3 } = await fixtures();
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
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

  const recordColumn = legacyMigrationDecisionWorksheetHeaders.indexOf("record_id");
  const earlierRecordIds = [...wave1.recordIds, ...wave2.recordIds];
  const earlierRowsBefore = new Map(parseLegacyMigrationDecisionCsv(wave2Plan.mergedCsv).rows.slice(1)
    .filter((row) => earlierRecordIds.includes(row[recordColumn]))
    .map((row) => [row[recordColumn], row.slice(-8)]));
  const wave3Plan = await mergeWave({
    matrix,
    wave: wave3,
    waveName: "Wave 3",
    waveCsv: completeWaveWorksheet(wave3Template, matrix, reviewedOn),
    masterCsv: wave2Plan.mergedCsv,
    prerequisiteRecordIds: earlierRecordIds,
    now,
  });
  assert.equal(wave3Plan.status, "ready-for-download", JSON.stringify(wave3Plan.issues));
  assert.equal(wave3Plan.summary.acceptedWaveRecords, 8);
  assert.equal(wave3Plan.summary.prerequisiteRecordsRequired, 18);
  assert.equal(wave3Plan.summary.prerequisiteRecordsPresent, 18);
  assert.equal(wave3Plan.summary.masterRecords, 115);
  assert.equal(wave3Plan.summary.carriedContentDecisions, 26);
  assert.equal(wave3Plan.summary.remainingContentDecisions, 89);
  assert.equal(wave3Plan.summary.remainingRouteDecisions, 79);
  assert.ok(wave3Plan.mergedCsv);
  const wave3Rows = parseLegacyMigrationDecisionCsv(wave3Plan.mergedCsv).rows.slice(1);
  for (const recordId of earlierRecordIds) {
    assert.deepEqual(wave3Rows.find((row) => row[recordColumn] === recordId).slice(-8), earlierRowsBefore.get(recordId));
  }
  assert.ok(Object.values(wave3Plan.guardrails).every((value) => value === false));

  const canonicalPlan = await createLegacyMigrationDecisionPlan({ csv: wave3Plan.mergedCsv, matrix, now });
  const decidedIds = new Set([...earlierRecordIds, ...wave3.recordIds]);
  assert.ok(canonicalPlan.issues.every((issue) => !issue.row || !decidedIds.has(wave3Rows[issue.row - 2]?.[recordColumn])));
});

test("blocks unsafe Wave 3 prerequisites and conflicting current-wave decisions", async () => {
  const { matrix, wave1, wave2, wave3 } = await fixtures();
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const [masterCsv, wave3Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave3.recordIds),
  ]);
  const wave3Csv = completeWaveWorksheet(wave3Template, matrix, reviewedOn);
  const overlapPlan = await mergeWave({
    matrix,
    wave: wave3,
    waveName: "Wave 3",
    waveCsv: wave3Csv,
    masterCsv,
    prerequisiteRecordIds: [...wave1.recordIds, ...wave2.recordIds, wave3.recordIds[0]],
    now,
  });
  assert.equal(overlapPlan.status, "blocked");
  assert.ok(overlapPlan.issues.some((issue) => issue.code === "prerequisite-record-invalid"));

  for (const invalidPrerequisiteRecordIds of [
    [...wave1.recordIds, ...wave2.recordIds, wave1.recordIds[0]],
    [...wave1.recordIds, ...wave2.recordIds, "migration-0000000000000000"],
  ]) {
    const invalidPlan = await mergeWave({
      matrix,
      wave: wave3,
      waveName: "Wave 3",
      waveCsv: wave3Csv,
      masterCsv,
      prerequisiteRecordIds: invalidPrerequisiteRecordIds,
      now,
    });
    assert.equal(invalidPlan.status, "blocked");
    assert.ok(invalidPlan.issues.some((issue) => issue.code === "prerequisite-record-invalid"));
  }

  const rows = parseLegacyMigrationDecisionCsv(masterCsv).rows;
  const header = rows[0];
  const firstWave3Row = rows.find((row) => row[header.indexOf("record_id")] === wave3.recordIds[0]);
  firstWave3Row[header.indexOf("proposed_content_decision")] = "archive";
  const conflictPlan = await mergeWave({
    matrix,
    wave: wave3,
    waveName: "Wave 3",
    waveCsv: wave3Csv,
    masterCsv: serializeLegacyMigrationDecisionCsv(rows),
    prerequisiteRecordIds: [...wave1.recordIds, ...wave2.recordIds],
    now,
  });
  assert.equal(conflictPlan.status, "blocked");
  assert.ok(conflictPlan.issues.some((issue) => issue.code === "wave-decision-conflict"));
});

test("blocks an invalid nonempty decision in the Wave 2 prerequisite", async () => {
  const { matrix, wave1, wave2, wave3 } = await fixtures();
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
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
  const wave2Plan = await mergeWave({
    matrix,
    wave: wave2,
    waveName: "Wave 2",
    waveCsv: completeWaveWorksheet(wave2Template, matrix, reviewedOn),
    masterCsv: wave1Plan.mergedCsv,
    prerequisiteRecordIds: wave1.recordIds,
    now,
  });
  assert.equal(wave2Plan.status, "ready-for-download");
  const rows = parseLegacyMigrationDecisionCsv(wave2Plan.mergedCsv).rows;
  const header = rows[0];
  const firstWave2Row = rows.find((row) => row[header.indexOf("record_id")] === wave2.recordIds[0]);
  firstWave2Row[header.indexOf("proposed_content_decision")] = " ";

  const plan = await mergeWave({
    matrix,
    wave: wave3,
    waveName: "Wave 3",
    waveCsv: completeWaveWorksheet(wave3Template, matrix, reviewedOn),
    masterCsv: serializeLegacyMigrationDecisionCsv(rows),
    prerequisiteRecordIds: [...wave1.recordIds, ...wave2.recordIds],
    now,
  });
  assert.equal(plan.status, "blocked");
  assert.equal(plan.mergedCsv, null);
  assert.ok(plan.issues.some((issue) => issue.source === "decision-contract" && issue.code === "content-decision-missing"));
});

test("ships Wave 3 as an authenticated noindex browser-only workspace", async () => {
  const [page, workspace, form, exportRoute, dataModule, dashboard, sitemap, guide] = await Promise.all([
    source("app/publication-review/migration-wave-3/page.tsx"),
    source("app/publication-review/migration-wave-workspace.tsx"),
    source("app/publication-review/migration-wave-merge-form.tsx"),
    source("app/publication-review/migration-wave-3/export/route.ts"),
    source("app/data/legacy-migration-wave-3.ts"),
    source("app/publication-review/page.tsx"),
    source("app/sitemap.ts"),
    source("docs/legacy-content-migration.md"),
  ]);
  assert.match(page, /HOMEPAGE_REVIEW_MODE !== "private"/);
  assert.match(page, /requireChatGPTUser\("\/publication-review\/migration-wave-3"\)/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(page, /all eighteen earlier decisions/);
  assert.match(workspace, /No archived copy is approved or published/);
  assert.match(form, /Promise\.all\(\[waveFile\.text\(\), masterFile\.text\(\)\]\)/);
  assert.match(form, /URL\.createObjectURL\(new Blob/);
  assert.doesNotMatch(`${page}\n${workspace}\n${form}`, /\bfetch\s*\(|FormData|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|\bcaches\b|document\.cookie|serviceWorker|use server/);
  assert.match(exportRoute, /requireChatGPTUser\("\/publication-review\/migration-wave-3\/export"\)/);
  assert.match(exportRoute, /"cache-control": "private, no-store"/);
  assert.match(exportRoute, /"x-content-type-options": "nosniff"/);
  assert.match(dataModule, /prerequisiteWaves: \[legacyMigrationWave1, legacyMigrationWave2\]/);
  assert.match(dataModule, /requireMappedRoutes: true/);
  assert.match(dashboard, /href="\/publication-review\/migration-wave-3"/);
  assert.doesNotMatch(sitemap, /migration-wave-3/);
  assert.match(guide, /Wave prerequisites are cumulative and chronological/);
});
