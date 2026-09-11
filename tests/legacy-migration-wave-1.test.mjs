import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  legacyContentMigrationWaveCsv,
  legacyContentMigrationCsv,
  legacyMigrationDecisionWorksheetHeaders,
  validateLegacyContentMigrationMatrix,
} from "../lib/legacy-content-migration.ts";
import {
  createLegacyMigrationDecisionPlan,
  parseLegacyMigrationDecisionCsv,
} from "../lib/legacy-migration-decision-intake.ts";
import {
  createLegacyMigrationWaveMergePlan,
  serializeLegacyMigrationDecisionCsv,
} from "../lib/legacy-migration-wave-merge.ts";

const root = process.cwd();
const source = (relativePath) => readFile(path.join(root, relativePath), "utf8");
const json = async (relativePath) => JSON.parse(await source(relativePath));

const expectedRecordIds = [
  "migration-8a8cfc64190a0285",
  "migration-5bd82d2a895ec993",
  "migration-e8a256da646a4053",
  "migration-08d1d6599f0af1c0",
  "migration-ea844261827415c3",
  "migration-1838310754bcadae",
  "migration-2ced57ca7af57656",
  "migration-f04a657513398549",
  "migration-1c86da4771879da4",
  "migration-bf6e1be8e9a1aecf",
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
    row[column.proposed_owner_role] = "content-editor";
    row[column.proposed_reviewed_on] = reviewedOn;
  }
  return serializeLegacyMigrationDecisionCsv([header, ...rows]);
}

test("defines a bounded, public-safe Wave 1 without selecting migration decisions", async () => {
  const [matrix, wave, schema] = await Promise.all([
    json("content/legacy-content-migration-matrix.json"),
    json("content/legacy-migration-wave-1.json"),
    json("content/legacy-migration-wave.schema.json"),
  ]);
  assert.deepEqual(validateLegacyContentMigrationMatrix(matrix), []);
  assert.deepEqual(wave.recordIds, expectedRecordIds);
  assert.equal(new Set(wave.recordIds).size, 10);
  assert.equal(wave.matrixId, matrix.matrixId);
  assert.equal(wave.matrixBuiltOn, matrix.builtOn);
  assert.deepEqual(wave.prerequisiteWaveIds, []);
  assert.deepEqual(Object.values(wave.policy), [false, false, false, false]);
  assert.equal(schema.additionalProperties, false);
  assert.ok(schema.required.includes("prerequisiteWaveIds"));
  assert.equal(schema.properties.recordIds.maxItems, 12);
  assert.equal(schema.properties.recordIds.uniqueItems, true);

  const recordsById = new Map(matrix.records.map((record) => [record.id, record]));
  const records = wave.recordIds.map((recordId) => recordsById.get(recordId));
  assert.ok(records.every(Boolean));
  assert.ok(records.every((record) => record.sourceVisibility === "public"));
  assert.ok(records.every((record) => record.sourceKind === "page"));
  assert.ok(records.every((record) => record.identityProtected === false));
  assert.ok(records.every((record) => record.contentDecision.decision === "unselected"));
  assert.ok(records.every((record) => record.implementationStatus === "not-started"));
  assert.equal(records.filter((record) => record.routeContinuity.status === "implemented").length, 9);
  assert.equal(records.filter((record) => record.routeContinuity.status === "decision-required").length, 1);
  assert.ok(records.every((record) => !["media", "news", "disclosure", "identity"].includes(record.area)));
  assert.doesNotMatch(JSON.stringify(wave), /source-html|source-wordpress|SSKEMS-BACKUP|[A-Za-z]:\\\\|\/Users\//i);
});

test("exports only the ten digest-bound Wave 1 rows using the canonical decision columns", async () => {
  const [matrix, wave] = await Promise.all([
    json("content/legacy-content-migration-matrix.json"),
    json("content/legacy-migration-wave-1.json"),
  ]);
  const csv = await legacyContentMigrationWaveCsv(matrix, wave.recordIds);
  const lines = csv.replace(/^\uFEFF/, "").split("\r\n").filter(Boolean);
  assert.equal(lines.length, 11);
  assert.equal(lines[0], legacyMigrationDecisionWorksheetHeaders.map((value) => `"${value}"`).join(","));
  for (const recordId of expectedRecordIds) assert.match(csv, new RegExp(`"${recordId}"`));
  assert.doesNotMatch(csv, /Archived page text|source-html|source-wordpress|[A-Za-z]:\\\\|\/Users\//i);
  await assert.rejects(
    legacyContentMigrationWaveCsv(matrix, [expectedRecordIds[0], expectedRecordIds[0]]),
    /Duplicate legacy migration wave record/,
  );
  await assert.rejects(
    legacyContentMigrationWaveCsv(matrix, ["migration-0000000000000000"]),
    /Unknown legacy migration wave record/,
  );
});

test("validates and merges Wave 1 into a complete master without recording or publishing it", async () => {
  const [matrix, wave] = await Promise.all([
    json("content/legacy-content-migration-matrix.json"),
    json("content/legacy-migration-wave-1.json"),
  ]);
  const now = new Date().toISOString();
  const [waveTemplate, masterCsv] = await Promise.all([
    legacyContentMigrationWaveCsv(matrix, wave.recordIds),
    legacyContentMigrationCsv(matrix),
  ]);
  const waveCsv = completeWaveWorksheet(waveTemplate, matrix, now.slice(0, 10));
  const plan = await createLegacyMigrationWaveMergePlan({
    waveCsv,
    masterCsv,
    matrix,
    waveId: wave.waveId,
    waveName: "Wave 1",
    waveRecordIds: wave.recordIds,
    prerequisiteRecordIds: [],
    now,
  });

  assert.equal(plan.status, "ready-for-download", JSON.stringify(plan.issues));
  assert.match(plan.planId, /^legacy-wave-merge-[a-f0-9]{24}$/);
  assert.equal(plan.summary.acceptedWaveRecords, 10);
  assert.equal(plan.summary.prerequisiteRecordsRequired, 0);
  assert.equal(plan.summary.prerequisiteRecordsPresent, 0);
  assert.equal(plan.summary.masterRecords, 115);
  assert.equal(plan.summary.carriedContentDecisions, 10);
  assert.equal(plan.summary.remainingContentDecisions, 105);
  assert.equal(plan.summary.remainingRouteDecisions, 79);
  assert.equal(plan.summary.issueCount, 0);
  assert.ok(plan.mergedCsv);
  assert.equal(parseLegacyMigrationDecisionCsv(plan.mergedCsv).rows.length, 116);
  assert.equal(plan.guardrails.repositoryWritePerformed, false);
  assert.equal(plan.guardrails.networkRequestPerformed, false);
  assert.equal(plan.guardrails.publicationAuthorized, false);

  const canonicalPlan = await createLegacyMigrationDecisionPlan({ csv: plan.mergedCsv, matrix, now });
  assert.equal(canonicalPlan.status, "blocked");
  assert.ok(canonicalPlan.issues.every((issue) => ["content-decision-missing", "route-decision-missing"].includes(issue.code)));
  const mergedRows = parseLegacyMigrationDecisionCsv(plan.mergedCsv).rows.slice(1);
  const recordColumn = legacyMigrationDecisionWorksheetHeaders.indexOf("record_id");
  const waveRows = new Set(mergedRows.map((row, index) => expectedRecordIds.includes(row[recordColumn]) ? index + 2 : null).filter(Boolean));
  assert.ok(canonicalPlan.issues.every((issue) => !issue.row || !waveRows.has(issue.row)));
});

test("blocks stale Wave 1 bindings and unsafe decision targets without creating a download", async () => {
  const [matrix, wave] = await Promise.all([
    json("content/legacy-content-migration-matrix.json"),
    json("content/legacy-migration-wave-1.json"),
  ]);
  const now = new Date().toISOString();
  const [waveTemplate, masterCsv] = await Promise.all([
    legacyContentMigrationWaveCsv(matrix, wave.recordIds),
    legacyContentMigrationCsv(matrix),
  ]);
  const reviewed = completeWaveWorksheet(waveTemplate, matrix, now.slice(0, 10));

  const staleRows = parseLegacyMigrationDecisionCsv(reviewed).rows;
  const sourceDigestColumn = legacyMigrationDecisionWorksheetHeaders.indexOf("source_digest");
  staleRows[1][sourceDigestColumn] = "0".repeat(64);
  const stale = await createLegacyMigrationWaveMergePlan({
    waveCsv: serializeLegacyMigrationDecisionCsv(staleRows),
    masterCsv,
    matrix,
    waveId: wave.waveId,
    waveName: "Wave 1",
    waveRecordIds: wave.recordIds,
    prerequisiteRecordIds: [],
    now,
  });
  assert.equal(stale.status, "blocked");
  assert.equal(stale.mergedCsv, null);
  assert.ok(stale.issues.some((issue) => issue.code === "wave-binding-stale"));

  const unsafeRows = parseLegacyMigrationDecisionCsv(reviewed).rows;
  const contentTargetColumn = legacyMigrationDecisionWorksheetHeaders.indexOf("proposed_content_target");
  unsafeRows[1][contentTargetColumn] = "/wp-admin";
  const unsafe = await createLegacyMigrationWaveMergePlan({
    waveCsv: serializeLegacyMigrationDecisionCsv(unsafeRows),
    masterCsv,
    matrix,
    waveId: wave.waveId,
    waveName: "Wave 1",
    waveRecordIds: wave.recordIds,
    prerequisiteRecordIds: [],
    now,
  });
  assert.equal(unsafe.status, "blocked");
  assert.equal(unsafe.mergedCsv, null);
  assert.ok(unsafe.issues.some((issue) => issue.code === "content-target-invalid" && issue.source === "decision-contract"));

  const strayMasterRows = parseLegacyMigrationDecisionCsv(masterCsv).rows;
  const recordIdColumn = legacyMigrationDecisionWorksheetHeaders.indexOf("record_id");
  const decisionColumn = legacyMigrationDecisionWorksheetHeaders.indexOf("proposed_content_decision");
  const strayRow = strayMasterRows.slice(1).find((row) => !wave.recordIds.includes(row[recordIdColumn]));
  assert.ok(strayRow);
  strayRow[decisionColumn] = " ";
  const stray = await createLegacyMigrationWaveMergePlan({
    waveCsv: reviewed,
    masterCsv: serializeLegacyMigrationDecisionCsv(strayMasterRows),
    matrix,
    waveId: wave.waveId,
    waveName: "Wave 1",
    waveRecordIds: wave.recordIds,
    prerequisiteRecordIds: [],
    now,
  });
  assert.equal(stray.status, "blocked");
  assert.equal(stray.mergedCsv, null);
  assert.ok(stray.issues.some((issue) => issue.code === "content-decision-missing" && issue.source === "decision-contract"));
});

test("ships Wave 1 as a private noindex browser-only validation and merge workspace", async () => {
  const [page, workspace, form, mergeLibrary, exportRoute, dataModule, waveDataModule, dashboard, sitemap, guide] = await Promise.all([
    source("app/publication-review/migration-wave-1/page.tsx"),
    source("app/publication-review/migration-wave-workspace.tsx"),
    source("app/publication-review/migration-wave-merge-form.tsx"),
    source("lib/legacy-migration-wave-merge.ts"),
    source("app/publication-review/migration-wave-1/export/route.ts"),
    source("app/data/legacy-migration-wave-1.ts"),
    source("app/data/legacy-migration-wave.ts"),
    source("app/publication-review/page.tsx"),
    source("app/sitemap.ts"),
    source("docs/legacy-content-migration.md"),
  ]);
  assert.match(page, /HOMEPAGE_REVIEW_MODE !== "private"/);
  assert.match(page, /requireChatGPTUser\("\/publication-review\/migration-wave-1"\)/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(workspace, /No archived copy is approved or published/);
  assert.match(workspace, /MigrationWaveMergeForm/);
  assert.doesNotMatch(`${page}\n${workspace}`, /\bfetch\s*\(|FormData|localStorage|sessionStorage|use server/);
  assert.match(form, /Promise\.all\(\[waveFile\.text\(\), masterFile\.text\(\)\]\)/);
  assert.match(form, /URL\.createObjectURL\(new Blob/);
  assert.doesNotMatch(form, /\bfetch\s*\(|FormData|localStorage|sessionStorage|use server/);
  assert.match(mergeLibrary, /createLegacyMigrationDecisionPlan/);
  assert.match(mergeLibrary, /repositoryWritePerformed: false/);
  assert.match(mergeLibrary, /publicationAuthorized: false/);
  assert.match(exportRoute, /requireChatGPTUser\("\/publication-review\/migration-wave-1\/export"\)/);
  assert.match(exportRoute, /"cache-control": "private, no-store"/);
  assert.match(exportRoute, /legacyMigrationWave1WorksheetCsv\(\)/);
  assert.match(dataModule, /parseLegacyMigrationWaveManifest/);
  assert.match(waveDataModule, /contentDecision\.decision !== "unselected"/);
  assert.match(waveDataModule, /implementationStatus !== "not-started"/);
  assert.match(dashboard, /href="\/publication-review\/migration-wave-1"/);
  assert.doesNotMatch(sitemap, /migration-wave-1/);
  assert.match(guide, /existing full intake remains the authoritative validator/i);
});
