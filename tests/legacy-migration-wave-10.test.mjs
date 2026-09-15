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
  "migration-8017c7111b34dc24",
  "migration-6a65852e6dfb1e53",
];
const deliberatelyDeferredRecordIds = [
  "migration-451aa3a00981e822",
  "migration-623cb73099e23e2b",
  "migration-ff4442710c786ba9",
  "migration-dff685d52f8e1907",
  "migration-e05e308e89b5f8dc",
  "migration-6e4f9569b06409ff",
  "migration-1541dd1a501d62d7",
];
const requiredVisitorReviews = [
  "accuracy",
  "currency",
  "editorial",
  "management-approval",
  "privacy",
  "rights",
  "retention",
  "accessibility",
  "evidence",
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
  const [matrix, ...waveValues] = await Promise.all([
    json("content/legacy-content-migration-matrix.json"),
    ...Array.from({ length: 10 }, (_, index) => json(`content/legacy-migration-wave-${index + 1}.json`)),
  ]);
  return {
    matrix,
    waves: waveValues.map((value) => parseLegacyMigrationWaveManifest(value)),
  };
}

async function mergeThrough({ matrix, waves, count, reviewedOn, now }) {
  let masterCsv = await legacyContentMigrationCsv(matrix);
  const prerequisiteRecordIds = [];
  const plans = [];
  for (let index = 0; index < count; index += 1) {
    const wave = waves[index];
    const template = await legacyContentMigrationWaveCsv(matrix, wave.recordIds);
    const plan = await mergeWave({
      matrix,
      wave,
      waveName: `Wave ${index + 1}`,
      waveCsv: completeWaveWorksheet(template, matrix, reviewedOn),
      masterCsv,
      prerequisiteRecordIds: [...prerequisiteRecordIds],
      now,
    });
    assert.equal(plan.status, "ready-for-download", JSON.stringify(plan.issues));
    masterCsv = plan.mergedCsv;
    prerequisiteRecordIds.push(...wave.recordIds);
    plans.push(plan);
  }
  return { masterCsv, plans, prerequisiteRecordIds };
}

test("defines Wave 10 as two named-visitor gallery records with evidence-aware runtime gates", async () => {
  const { matrix, waves } = await fixtures();
  const wave10 = waves[9];
  assert.deepEqual(validateLegacyContentMigrationMatrix(matrix), []);
  assert.deepEqual(wave10.recordIds, expectedRecordIds);
  assert.deepEqual(wave10.prerequisiteWaveIds, waves.slice(0, 9).map((wave) => wave.waveId));
  assert.equal(new Set(waves.slice(0, 10).flatMap((wave) => wave.recordIds)).size, 64);
  assert.deepEqual(Object.values(wave10.policy), [false, false, false, false]);

  const recordsById = new Map(matrix.records.map((record) => [record.id, record]));
  const records = wave10.recordIds.map((recordId) => recordsById.get(recordId));
  assert.ok(records.every(Boolean));
  assert.ok(records.every((record) => record.sourceVisibility === "public"));
  assert.ok(records.every((record) => record.sourceKind === "sk_igallery"));
  assert.ok(records.every((record) => record.sourceStatus === "public-index"));
  assert.ok(records.every((record) => record.identityProtected === false));
  assert.ok(records.every((record) => record.area === "media"));
  assert.ok(records.every((record) => record.routeContinuity.status === "decision-required"));
  assert.ok(records.every((record) => record.routeContinuity.action === "unselected"));
  assert.ok(records.every((record) => record.routeContinuity.targetPath === null));
  assert.ok(records.every((record) => record.contentDecision.decision === "unselected"));
  assert.ok(records.every((record) => record.implementationStatus === "not-started"));
  assert.ok(records.every((record) => record.publicationEligible === false));
  assert.ok(records.every((record) => record.publicationReason === "decision-and-approval-required"));
  for (const record of records) assert.deepEqual(record.requiredReviews, requiredVisitorReviews);

  const packetizedGalleryIds = new Set(waves.slice(0, 10).flatMap((wave) => wave.recordIds));
  const remainingGalleryIds = matrix.records
    .filter((record) => record.sourceKind === "sk_igallery" && !packetizedGalleryIds.has(record.id))
    .map((record) => record.id);
  assert.deepEqual(remainingGalleryIds, deliberatelyDeferredRecordIds);
  assert.doesNotMatch(JSON.stringify(wave10), /source-html|source-wordpress|SSKEMS-BACKUP|[A-Za-z]:\\\\|\/Users\//i);
});

test("exports only the two digest-bound Wave 10 rows with no proposed decisions", async () => {
  const { matrix, waves } = await fixtures();
  const wave10 = waves[9];
  const csv = await legacyContentMigrationWaveCsv(matrix, wave10.recordIds);
  const lines = csv.replace(/^\uFEFF/, "").split("\r\n").filter(Boolean);
  assert.equal(lines.length, 3);
  assert.equal(lines[0], legacyMigrationDecisionWorksheetHeaders.map((value) => `"${value}"`).join(","));
  for (const recordId of expectedRecordIds) assert.match(csv, new RegExp(`"${recordId}"`));
  for (const recordId of deliberatelyDeferredRecordIds) assert.doesNotMatch(csv, new RegExp(`"${recordId}"`));
  const parsed = parseLegacyMigrationDecisionCsv(csv);
  assert.equal(parsed.error, false);
  const [header, ...rows] = parsed.rows;
  const proposedStart = header.indexOf("proposed_route_action");
  assert.ok(rows.every((row) => row.slice(proposedStart).every((value) => value === "")));
  assert.doesNotMatch(csv, /Archived page text|data:image|data:video|source-html|source-wordpress|[A-Za-z]:\\\\|\/Users\//i);
});

test("requires the complete cumulative Wave 1 through Wave 9 master", async () => {
  const { matrix, waves } = await fixtures();
  const wave10 = waves[9];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const prerequisiteRecordIds = waves.slice(0, 9).flatMap((wave) => wave.recordIds);
  const [masterCsv, wave10Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave10.recordIds),
  ]);
  const wave10Csv = completeWaveWorksheet(wave10Template, matrix, reviewedOn);
  const blankPlan = await mergeWave({ matrix, wave: wave10, waveName: "Wave 10", waveCsv: wave10Csv, masterCsv, prerequisiteRecordIds, now });
  assert.equal(blankPlan.status, "blocked");
  assert.equal(blankPlan.mergedCsv, null);
  assert.equal(blankPlan.summary.prerequisiteRecordsPresent, 0);
  assert.equal(blankPlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 62);

  const throughWave8 = await mergeThrough({ matrix, waves, count: 8, reviewedOn, now });
  const wave8OnlyPlan = await mergeWave({
    matrix,
    wave: wave10,
    waveName: "Wave 10",
    waveCsv: wave10Csv,
    masterCsv: throughWave8.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(wave8OnlyPlan.status, "blocked");
  assert.equal(wave8OnlyPlan.summary.prerequisiteRecordsPresent, 60);
  assert.equal(wave8OnlyPlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 2);
});

test("merges Wave 10 after all prior waves without changing any earlier row", async () => {
  const { matrix, waves } = await fixtures();
  const wave10 = waves[9];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const throughWave9 = await mergeThrough({ matrix, waves, count: 9, reviewedOn, now });
  const prerequisiteRecordIds = throughWave9.prerequisiteRecordIds;
  const beforeRows = parseLegacyMigrationDecisionCsv(throughWave9.masterCsv).rows;
  const header = beforeRows[0];
  const recordColumn = header.indexOf("record_id");
  const previousRows = new Map(beforeRows.slice(1)
    .filter((row) => prerequisiteRecordIds.includes(row[recordColumn]))
    .map((row) => [row[recordColumn], [...row]]));
  const previousOrder = beforeRows.slice(1).map((row) => row[recordColumn]);
  const wave10Template = await legacyContentMigrationWaveCsv(matrix, wave10.recordIds);
  const wave10Plan = await mergeWave({
    matrix,
    wave: wave10,
    waveName: "Wave 10",
    waveCsv: completeWaveWorksheet(wave10Template, matrix, reviewedOn),
    masterCsv: throughWave9.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(wave10Plan.status, "ready-for-download", JSON.stringify(wave10Plan.issues));
  assert.equal(wave10Plan.summary.acceptedWaveRecords, 2);
  assert.equal(wave10Plan.summary.prerequisiteRecordsRequired, 62);
  assert.equal(wave10Plan.summary.prerequisiteRecordsPresent, 62);
  assert.equal(wave10Plan.summary.masterRecords, 115);
  assert.equal(wave10Plan.summary.carriedContentDecisions, 64);
  assert.equal(wave10Plan.summary.remainingContentDecisions, 51);
  assert.equal(wave10Plan.summary.remainingRouteDecisions, 51);
  assert.ok(wave10Plan.mergedCsv);
  const afterRows = parseLegacyMigrationDecisionCsv(wave10Plan.mergedCsv).rows.slice(1);
  assert.deepEqual(afterRows.map((row) => row[recordColumn]), previousOrder);
  for (const recordId of prerequisiteRecordIds) {
    assert.deepEqual(afterRows.find((row) => row[recordColumn] === recordId), previousRows.get(recordId));
  }
  assert.ok(Object.values(wave10Plan.guardrails).every((value) => value === false));

  const canonicalPlan = await createLegacyMigrationDecisionPlan({ csv: wave10Plan.mergedCsv, matrix, now });
  const decidedIds = new Set([...prerequisiteRecordIds, ...wave10.recordIds]);
  assert.ok(canonicalPlan.issues.every((issue) => !issue.row || !decidedIds.has(afterRows[issue.row - 2]?.[recordColumn])));
});

test("blocks altered prerequisites, conflicting decisions and unsafe Wave 10 input", async () => {
  const { matrix, waves } = await fixtures();
  const wave10 = waves[9];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const throughWave9 = await mergeThrough({ matrix, waves, count: 9, reviewedOn, now });
  const prerequisiteRecordIds = throughWave9.prerequisiteRecordIds;
  const wave10Template = await legacyContentMigrationWaveCsv(matrix, wave10.recordIds);
  const wave10Csv = completeWaveWorksheet(wave10Template, matrix, reviewedOn);

  const alteredRows = parseLegacyMigrationDecisionCsv(throughWave9.masterCsv).rows;
  const alteredHeader = alteredRows[0];
  const firstWave9Row = alteredRows.find((row) => row[alteredHeader.indexOf("record_id")] === waves[8].recordIds[0]);
  firstWave9Row[alteredHeader.indexOf("proposed_content_decision")] = " ";
  const alteredPlan = await mergeWave({
    matrix,
    wave: wave10,
    waveName: "Wave 10",
    waveCsv: wave10Csv,
    masterCsv: serializeLegacyMigrationDecisionCsv(alteredRows),
    prerequisiteRecordIds,
    now,
  });
  assert.equal(alteredPlan.status, "blocked");
  assert.ok(alteredPlan.issues.some((issue) => issue.source === "decision-contract" && issue.code === "content-decision-missing"));

  const conflictRows = parseLegacyMigrationDecisionCsv(throughWave9.masterCsv).rows;
  const conflictHeader = conflictRows[0];
  const firstWave10Row = conflictRows.find((row) => row[conflictHeader.indexOf("record_id")] === wave10.recordIds[0]);
  firstWave10Row[conflictHeader.indexOf("proposed_route_action")] = "retire";
  firstWave10Row[conflictHeader.indexOf("proposed_content_decision")] = "archive";
  const conflictPlan = await mergeWave({
    matrix,
    wave: wave10,
    waveName: "Wave 10",
    waveCsv: wave10Csv,
    masterCsv: serializeLegacyMigrationDecisionCsv(conflictRows),
    prerequisiteRecordIds,
    now,
  });
  assert.equal(conflictPlan.status, "blocked");
  assert.ok(conflictPlan.issues.some((issue) => issue.code === "wave-decision-conflict"));

  const unsafeRows = parseLegacyMigrationDecisionCsv(wave10Csv).rows;
  const unsafeHeader = unsafeRows[0];
  const unsafeColumn = Object.fromEntries(unsafeHeader.map((name, index) => [name, index]));
  unsafeRows[1][unsafeColumn.proposed_route_action] = "";
  unsafeRows[2][unsafeColumn.proposed_route_target] = unsafeRows[2][unsafeColumn.legacy_path];
  unsafeRows[2][unsafeColumn.proposed_reason_code] = "=SUM(1,1)";
  const unsafePlan = await mergeWave({
    matrix,
    wave: wave10,
    waveName: "Wave 10",
    waveCsv: serializeLegacyMigrationDecisionCsv(unsafeRows),
    masterCsv: throughWave9.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  const unsafeCodes = new Set(unsafePlan.issues.map((issue) => issue.code));
  assert.equal(unsafePlan.status, "blocked");
  for (const code of ["route-decision-missing", "route-target-invalid", "formula-like-input"]) {
    assert.ok(unsafeCodes.has(code), `Expected ${code}`);
  }

  const staleRows = parseLegacyMigrationDecisionCsv(wave10Csv).rows;
  const staleHeader = staleRows[0];
  staleRows[1][staleHeader.indexOf("label")] = "Changed immutable label";
  const stalePlan = await mergeWave({
    matrix,
    wave: wave10,
    waveName: "Wave 10",
    waveCsv: serializeLegacyMigrationDecisionCsv(staleRows),
    masterCsv: throughWave9.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(stalePlan.status, "blocked");
  assert.ok(stalePlan.issues.some((issue) => issue.code === "wave-binding-stale"));
});

test("blocks invalid cumulative prerequisite sets", async () => {
  const { matrix, waves } = await fixtures();
  const wave10 = waves[9];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const [masterCsv, wave10Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave10.recordIds),
  ]);
  const wave10Csv = completeWaveWorksheet(wave10Template, matrix, reviewedOn);
  const base = waves.slice(0, 9).flatMap((wave) => wave.recordIds);
  for (const invalidPrerequisiteRecordIds of [
    [...base, waves[0].recordIds[0]],
    [...base, "migration-0000000000000000"],
    [...base, wave10.recordIds[0]],
  ]) {
    const plan = await mergeWave({
      matrix,
      wave: wave10,
      waveName: "Wave 10",
      waveCsv: wave10Csv,
      masterCsv,
      prerequisiteRecordIds: invalidPrerequisiteRecordIds,
      now,
    });
    assert.equal(plan.status, "blocked");
    assert.ok(plan.issues.some((issue) => issue.code === "prerequisite-record-invalid"));
  }
});

test("ships Wave 10 as an authenticated noindex browser-only visitor review workspace", async () => {
  const [page, workspace, form, exportRoute, dataModule, matrixBuilder, waveEngine, dashboard, wave9Page, sitemap, guide, packageJson] = await Promise.all([
    source("app/publication-review/migration-wave-10/page.tsx"),
    source("app/publication-review/migration-wave-workspace.tsx"),
    source("app/publication-review/migration-wave-merge-form.tsx"),
    source("app/publication-review/migration-wave-10/export/route.ts"),
    source("app/data/legacy-migration-wave-10.ts"),
    source("scripts/build-legacy-content-migration-matrix.mjs"),
    source("app/data/legacy-migration-wave.ts"),
    source("app/publication-review/page.tsx"),
    source("app/publication-review/migration-wave-9/page.tsx"),
    source("app/sitemap.ts"),
    source("docs/legacy-content-migration.md"),
    source("package.json"),
  ]);
  assert.match(page, /HOMEPAGE_REVIEW_MODE !== "private"/);
  assert.match(page, /requireChatGPTUser\("\/publication-review\/migration-wave-10"\)/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(page, /all sixty-two earlier decisions/);
  assert.match(page, /does not prove the visitor.s identity, exact office, jurisdiction, official capacity, event date, purpose or authority/);
  assert.match(page, /does not establish a full identity, professional title or credentials, organisation, event purpose, date or any endorsement relationship/);
  assert.match(page, /must not be used to imply a current role, partnership, recommendation or endorsement/);
  assert.match(page, /Verify identity, role at the time of the event, spelling, event context and publication rights only in the controlled system/);
  assert.match(page, /No identity, title, role, claim, route, destination, merge or content decision is preselected/);
  assert.match(page, /contains no supporting documents or private evidence locations/);
  assert.match(page, /does not retrieve or display underlying gallery content/);
  assert.match(page, /cannot validate a visitor or event claim or permit public release/);
  assert.match(workspace, /No archived copy is approved or published/);
  assert.match(workspace, /No route treatment is preselected/);
  assert.match(workspace, /no legacy source content/);
  assert.match(form, /Promise\.all\(\[waveFile\.text\(\), masterFile\.text\(\)\]\)/);
  assert.match(form, /URL\.createObjectURL\(new Blob/);
  assert.doesNotMatch(`${page}\n${workspace}\n${form}`, /\bfetch\s*\(|FormData|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|\bcaches\b|document\.cookie|serviceWorker|use server/);
  assert.match(exportRoute, /requireChatGPTUser\("\/publication-review\/migration-wave-10\/export"\)/);
  assert.match(exportRoute, /"cache-control": "private, no-store"/);
  assert.match(exportRoute, /"x-content-type-options": "nosniff"/);
  assert.match(dataModule, /allowedAreas: \["media"\]/);
  assert.match(dataModule, /allowedSourceKinds: \["sk_igallery"\]/);
  assert.match(dataModule, /allowedSourceStatuses: \["public-index"\]/);
  assert.match(dataModule, /prerequisiteWaves: \[[\s\S]*legacyMigrationWave1,[\s\S]*legacyMigrationWave2,[\s\S]*legacyMigrationWave3,[\s\S]*legacyMigrationWave4,[\s\S]*legacyMigrationWave5,[\s\S]*legacyMigrationWave6,[\s\S]*legacyMigrationWave7,[\s\S]*legacyMigrationWave8,[\s\S]*legacyMigrationWave9,[\s\S]*\]/);
  assert.match(dataModule, /requireRouteDecisions: true/);
  assert.doesNotMatch(dataModule, /requireMappedRoutes: true/);
  for (const review of requiredVisitorReviews) assert.match(dataModule, new RegExp(`"${review}"`));
  assert.match(matrixBuilder, /\/\\bvisit\\b\/\.test\(searchable\)/);
  assert.match(waveEngine, /requireMappedRoutes && requireRouteDecisions/);
  assert.match(waveEngine, /requireRouteDecisions && record\.routeContinuity\.status !== "decision-required"/);
  assert.match(waveEngine, /requiredReviews\.some\(\(review\) => !record\.requiredReviews\.includes\(review\)\)/);
  assert.match(waveEngine, /record\.publicationEligible !== false/);
  assert.match(dashboard, /href="\/publication-review\/migration-wave-10"/);
  assert.match(wave9Page, /href: "\/publication-review\/migration-wave-10"/);
  assert.doesNotMatch(sitemap, /migration-wave-10/);
  assert.match(guide, /legacy labels do not prove a visitor.s identity, role, credentials, event context or endorsement/);
  assert.match(guide, /successful browser-only merge carries 64 decisions/);
  assert.match(guide, /seven event-gallery records for later waves/);
  assert.match(packageJson, /tests\/legacy-migration-wave-10\.test\.mjs/);
});
