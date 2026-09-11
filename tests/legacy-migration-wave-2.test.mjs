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
  "migration-d48577eec84a1738",
  "migration-beb7efe0fa999ead",
  "migration-ee7347abe582effd",
  "migration-548562883ea96ae3",
  "migration-3f491a7dece252d2",
  "migration-3b5cee90ab0dea7c",
  "migration-d7aee3c336bdc9b2",
  "migration-4cacdb25890096ea",
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
    row[column.proposed_owner_role] = record.area === "admissions" ? "admissions-office" : "school-management";
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

test("defines Wave 2 as eight mapped leadership, governance and service pages", async () => {
  const [matrix, wave1Value, wave2Value, schema] = await Promise.all([
    json("content/legacy-content-migration-matrix.json"),
    json("content/legacy-migration-wave-1.json"),
    json("content/legacy-migration-wave-2.json"),
    json("content/legacy-migration-wave.schema.json"),
  ]);
  const wave1 = parseLegacyMigrationWaveManifest(wave1Value);
  const wave2 = parseLegacyMigrationWaveManifest(wave2Value);
  assert.deepEqual(validateLegacyContentMigrationMatrix(matrix), []);
  assert.deepEqual(wave2.recordIds, expectedRecordIds);
  assert.deepEqual(wave2.prerequisiteWaveIds, [wave1.waveId]);
  assert.equal(new Set([...wave1.recordIds, ...wave2.recordIds]).size, 18);
  assert.deepEqual(Object.values(wave2.policy), [false, false, false, false]);
  assert.ok(schema.required.includes("prerequisiteWaveIds"));

  const recordsById = new Map(matrix.records.map((record) => [record.id, record]));
  const records = wave2.recordIds.map((recordId) => recordsById.get(recordId));
  assert.ok(records.every(Boolean));
  assert.ok(records.every((record) => record.sourceVisibility === "public"));
  assert.ok(records.every((record) => record.sourceKind === "page"));
  assert.ok(records.every((record) => record.identityProtected === false));
  assert.ok(records.every((record) => ["about", "admissions"].includes(record.area)));
  assert.ok(records.every((record) => record.routeContinuity.status === "implemented"));
  assert.ok(records.every((record) => record.contentDecision.decision === "unselected"));
  assert.ok(records.every((record) => record.implementationStatus === "not-started"));
  assert.ok(records.filter((record) => record.area === "admissions").every((record) => record.requiredReviews.includes("data-protection")));
  assert.doesNotMatch(JSON.stringify(wave2), /source-html|source-wordpress|SSKEMS-BACKUP|[A-Za-z]:\\\\|\/Users\//i);
});

test("rejects malformed or authority-expanding wave manifests at runtime", async () => {
  const value = await json("content/legacy-migration-wave-2.json");
  assert.equal(parseLegacyMigrationWaveManifest(value).waveId, value.waveId);
  assert.throws(() => parseLegacyMigrationWaveManifest({ ...value, unexpected: true }), /closed schema contract/);
  assert.throws(() => parseLegacyMigrationWaveManifest({ ...value, policy: {} }), /closed schema contract/);
  assert.throws(() => parseLegacyMigrationWaveManifest({ ...value, policy: { ...value.policy, publicationAuthorized: true } }), /closed schema contract/);
  assert.throws(() => parseLegacyMigrationWaveManifest({ ...value, recordIds: ["migration-invalid"] }), /closed schema contract/);
  assert.throws(() => parseLegacyMigrationWaveManifest({ ...value, prerequisiteWaveIds: [value.waveId] }), /closed schema contract/);
  assert.throws(() => parseLegacyMigrationWaveManifest({ ...value, matrixBuiltOn: "2026-99-99" }), /closed schema contract/);
});

test("exports only the eight digest-bound Wave 2 rows", async () => {
  const [matrix, wave] = await Promise.all([
    json("content/legacy-content-migration-matrix.json"),
    json("content/legacy-migration-wave-2.json"),
  ]);
  const csv = await legacyContentMigrationWaveCsv(matrix, wave.recordIds);
  const lines = csv.replace(/^\uFEFF/, "").split("\r\n").filter(Boolean);
  assert.equal(lines.length, 9);
  assert.equal(lines[0], legacyMigrationDecisionWorksheetHeaders.map((value) => `"${value}"`).join(","));
  for (const recordId of expectedRecordIds) assert.match(csv, new RegExp(`"${recordId}"`));
  assert.doesNotMatch(csv, /Archived page text|source-html|source-wordpress|[A-Za-z]:\\\\|\/Users\//i);
});

test("enforces Wave 1 before merging Wave 2 and preserves all eighteen decisions", async () => {
  const [matrix, wave1, wave2] = await Promise.all([
    json("content/legacy-content-migration-matrix.json"),
    json("content/legacy-migration-wave-1.json"),
    json("content/legacy-migration-wave-2.json"),
  ]);
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const [masterCsv, wave1Template, wave2Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave1.recordIds),
    legacyContentMigrationWaveCsv(matrix, wave2.recordIds),
  ]);
  const wave1Csv = completeWaveWorksheet(wave1Template, matrix, reviewedOn);
  const wave2Csv = completeWaveWorksheet(wave2Template, matrix, reviewedOn);

  const skipped = await mergeWave({ matrix, wave: wave2, waveName: "Wave 2", waveCsv: wave2Csv, masterCsv, prerequisiteRecordIds: wave1.recordIds, now });
  assert.equal(skipped.status, "blocked");
  assert.equal(skipped.mergedCsv, null);
  assert.equal(skipped.summary.prerequisiteRecordsPresent, 0);
  assert.equal(skipped.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 10);

  const wave1Plan = await mergeWave({ matrix, wave: wave1, waveName: "Wave 1", waveCsv: wave1Csv, masterCsv, prerequisiteRecordIds: [], now });
  assert.equal(wave1Plan.status, "ready-for-download", JSON.stringify(wave1Plan.issues));
  const recordColumn = legacyMigrationDecisionWorksheetHeaders.indexOf("record_id");
  const wave1RowsBefore = new Map(parseLegacyMigrationDecisionCsv(wave1Plan.mergedCsv).rows.slice(1).map((row) => [row[recordColumn], row.slice(-8)]));
  const wave2Plan = await mergeWave({ matrix, wave: wave2, waveName: "Wave 2", waveCsv: wave2Csv, masterCsv: wave1Plan.mergedCsv, prerequisiteRecordIds: wave1.recordIds, now });
  assert.equal(wave2Plan.status, "ready-for-download", JSON.stringify(wave2Plan.issues));
  assert.equal(wave2Plan.summary.acceptedWaveRecords, 8);
  assert.equal(wave2Plan.summary.prerequisiteRecordsRequired, 10);
  assert.equal(wave2Plan.summary.prerequisiteRecordsPresent, 10);
  assert.equal(wave2Plan.summary.masterRecords, 115);
  assert.equal(wave2Plan.summary.carriedContentDecisions, 18);
  assert.equal(wave2Plan.summary.remainingContentDecisions, 97);
  assert.equal(wave2Plan.summary.remainingRouteDecisions, 79);
  assert.ok(wave2Plan.mergedCsv);
  const wave2Rows = parseLegacyMigrationDecisionCsv(wave2Plan.mergedCsv).rows.slice(1);
  for (const recordId of wave1.recordIds) {
    assert.deepEqual(wave2Rows.find((row) => row[recordColumn] === recordId).slice(-8), wave1RowsBefore.get(recordId));
  }
  assert.ok(Object.values(wave2Plan.guardrails).every((value) => value === false));

  const canonicalPlan = await createLegacyMigrationDecisionPlan({ csv: wave2Plan.mergedCsv, matrix, now });
  const decidedIds = new Set([...wave1.recordIds, ...wave2.recordIds]);
  assert.ok(canonicalPlan.issues.every((issue) => !issue.row || !decidedIds.has(wave2Rows[issue.row - 2]?.[recordColumn])));
});

test("blocks a conflicting Wave 2 decision already present in the master", async () => {
  const [matrix, wave1, wave2] = await Promise.all([
    json("content/legacy-content-migration-matrix.json"),
    json("content/legacy-migration-wave-1.json"),
    json("content/legacy-migration-wave-2.json"),
  ]);
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const [masterCsv, wave1Template, wave2Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave1.recordIds),
    legacyContentMigrationWaveCsv(matrix, wave2.recordIds),
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
  assert.equal(wave1Plan.status, "ready-for-download");
  const conflictingRows = parseLegacyMigrationDecisionCsv(wave1Plan.mergedCsv).rows;
  const header = conflictingRows[0];
  const firstWave2Row = conflictingRows.find((row) => row[header.indexOf("record_id")] === wave2.recordIds[0]);
  firstWave2Row[header.indexOf("proposed_content_decision")] = "archive";
  const plan = await mergeWave({
    matrix,
    wave: wave2,
    waveName: "Wave 2",
    waveCsv: completeWaveWorksheet(wave2Template, matrix, reviewedOn),
    masterCsv: serializeLegacyMigrationDecisionCsv(conflictingRows),
    prerequisiteRecordIds: wave1.recordIds,
    now,
  });
  assert.equal(plan.status, "blocked");
  assert.equal(plan.mergedCsv, null);
  assert.ok(plan.issues.some((issue) => issue.code === "wave-decision-conflict"));
});

test("blocks nonempty but invalid prerequisite decisions", async () => {
  const [matrix, wave1, wave2] = await Promise.all([
    json("content/legacy-content-migration-matrix.json"),
    json("content/legacy-migration-wave-1.json"),
    json("content/legacy-migration-wave-2.json"),
  ]);
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const [masterCsv, wave1Template, wave2Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave1.recordIds),
    legacyContentMigrationWaveCsv(matrix, wave2.recordIds),
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
  assert.equal(wave1Plan.status, "ready-for-download");
  const rows = parseLegacyMigrationDecisionCsv(wave1Plan.mergedCsv).rows;
  const header = rows[0];
  const recordColumn = header.indexOf("record_id");
  const firstPrerequisite = rows.find((row) => row[recordColumn] === wave1.recordIds[0]);
  firstPrerequisite[header.indexOf("proposed_content_decision")] = " ";
  const routePrerequisite = rows.find((row) => row[header.indexOf("current_route_status")] === "decision-required"
    && wave1.recordIds.includes(row[recordColumn]));
  assert.ok(routePrerequisite);
  routePrerequisite[header.indexOf("proposed_route_action")] = " ";

  const plan = await mergeWave({
    matrix,
    wave: wave2,
    waveName: "Wave 2",
    waveCsv: completeWaveWorksheet(wave2Template, matrix, reviewedOn),
    masterCsv: serializeLegacyMigrationDecisionCsv(rows),
    prerequisiteRecordIds: wave1.recordIds,
    now,
  });
  assert.equal(plan.status, "blocked");
  assert.equal(plan.mergedCsv, null);
  assert.ok(plan.issues.some((issue) => issue.source === "decision-contract"
    && ["content-decision-missing", "route-decision-missing"].includes(issue.code)));
});

test("ships Wave 2 as an authenticated noindex browser-only workspace", async () => {
  const [page, workspace, form, exportRoute, dataModule, manifestParser, dashboard, sitemap, guide] = await Promise.all([
    source("app/publication-review/migration-wave-2/page.tsx"),
    source("app/publication-review/migration-wave-workspace.tsx"),
    source("app/publication-review/migration-wave-merge-form.tsx"),
    source("app/publication-review/migration-wave-2/export/route.ts"),
    source("app/data/legacy-migration-wave-2.ts"),
    source("lib/legacy-migration-wave-manifest.ts"),
    source("app/publication-review/page.tsx"),
    source("app/sitemap.ts"),
    source("docs/legacy-content-migration.md"),
  ]);
  assert.match(page, /HOMEPAGE_REVIEW_MODE !== "private"/);
  assert.match(page, /requireChatGPTUser\("\/publication-review\/migration-wave-2"\)/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(page, /eight high-risk public pages/);
  assert.match(page, /refuses to merge Wave 2 until all ten prior-wave decisions/);
  assert.match(workspace, /No archived copy is approved or published/);
  assert.match(form, /prerequisiteRecordIds/);
  assert.match(form, /Promise\.all\(\[waveFile\.text\(\), masterFile\.text\(\)\]\)/);
  assert.match(form, /URL\.createObjectURL\(new Blob/);
  assert.doesNotMatch(`${page}\n${workspace}\n${form}`, /\bfetch\s*\(|FormData|localStorage|sessionStorage|use server/);
  assert.match(exportRoute, /requireChatGPTUser\("\/publication-review\/migration-wave-2\/export"\)/);
  assert.match(exportRoute, /"cache-control": "private, no-store"/);
  assert.match(dataModule, /requireMappedRoutes: true/);
  assert.match(manifestParser, /hasExactKeys/);
  assert.match(dashboard, /href="\/publication-review\/migration-wave-2"/);
  assert.doesNotMatch(sitemap, /migration-wave-2/);
  assert.match(guide, /must already contain all ten valid Wave 1 decisions/i);
});
