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
  "migration-451aa3a00981e822",
  "migration-623cb73099e23e2b",
  "migration-ff4442710c786ba9",
  "migration-e05e308e89b5f8dc",
  "migration-6e4f9569b06409ff",
];
const deliberatelyDeferredRecordIds = [
  "migration-dff685d52f8e1907",
  "migration-1541dd1a501d62d7",
];
const requiredPupilResultReviews = [
  "accuracy",
  "currency",
  "editorial",
  "management-approval",
  "privacy",
  "rights",
  "retention",
  "accessibility",
  "evidence",
  "data-protection",
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
    ...Array.from({ length: 11 }, (_, index) => json(`content/legacy-migration-wave-${index + 1}.json`)),
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

test("defines Wave 11 as five pupil achievement and result galleries with evidence and data-protection gates", async () => {
  const { matrix, waves } = await fixtures();
  const wave11 = waves[10];
  assert.deepEqual(validateLegacyContentMigrationMatrix(matrix), []);
  assert.deepEqual(wave11.recordIds, expectedRecordIds);
  assert.deepEqual(wave11.prerequisiteWaveIds, waves.slice(0, 10).map((wave) => wave.waveId));
  assert.equal(new Set(waves.slice(0, 11).flatMap((wave) => wave.recordIds)).size, 69);
  assert.deepEqual(Object.values(wave11.policy), [false, false, false, false]);

  const recordsById = new Map(matrix.records.map((record) => [record.id, record]));
  const records = wave11.recordIds.map((recordId) => recordsById.get(recordId));
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
  for (const record of records) assert.deepEqual(record.requiredReviews, requiredPupilResultReviews);

  const packetizedGalleryIds = new Set(waves.slice(0, 11).flatMap((wave) => wave.recordIds));
  const remainingGalleryIds = matrix.records
    .filter((record) => record.sourceKind === "sk_igallery" && !packetizedGalleryIds.has(record.id))
    .map((record) => record.id);
  assert.deepEqual(remainingGalleryIds, deliberatelyDeferredRecordIds);
  assert.doesNotMatch(JSON.stringify(wave11), /source-html|source-wordpress|SSKEMS-BACKUP|[A-Za-z]:\\\\|\/Users\//i);
});

test("exports only the five digest-bound Wave 11 rows with no proposed decisions or pupil-detail fields", async () => {
  const { matrix, waves } = await fixtures();
  const wave11 = waves[10];
  const csv = await legacyContentMigrationWaveCsv(matrix, wave11.recordIds);
  const lines = csv.replace(/^\uFEFF/, "").split("\r\n").filter(Boolean);
  assert.equal(lines.length, 6);
  assert.equal(lines[0], legacyMigrationDecisionWorksheetHeaders.map((value) => `"${value}"`).join(","));
  for (const recordId of expectedRecordIds) assert.match(csv, new RegExp(`"${recordId}"`));
  for (const recordId of deliberatelyDeferredRecordIds) assert.doesNotMatch(csv, new RegExp(`"${recordId}"`));
  const parsed = parseLegacyMigrationDecisionCsv(csv);
  assert.equal(parsed.error, false);
  const [header, ...rows] = parsed.rows;
  assert.equal(rows.length, 5);
  const proposedStart = header.indexOf("proposed_route_action");
  assert.ok(rows.every((row) => row.slice(proposedStart).every((value) => value === "")));
  for (const forbiddenHeader of ["student_name", "marks", "score", "percentage", "certificate", "consent_reference", "evidence_reference"]) {
    assert.ok(!header.includes(forbiddenHeader));
  }
  const column = Object.fromEntries(header.map((name, index) => [name, index]));
  const recordsById = new Map(matrix.records.map((record) => [record.id, record]));
  for (const row of rows) {
    const record = recordsById.get(row[column.record_id]);
    assert.ok(record);
    assert.equal(row[column.label], record.label);
    assert.equal(row[column.legacy_path], record.legacyPath);
    assert.equal(row[column.source_digest], record.sourceDigest);
  }
  assert.doesNotMatch(csv, /Archived page text|data:image|data:video|source-html|source-wordpress|[A-Za-z]:\\\\|\/Users\//i);
});

test("requires the complete cumulative Wave 1 through Wave 10 master", async () => {
  const { matrix, waves } = await fixtures();
  const wave11 = waves[10];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const prerequisiteRecordIds = waves.slice(0, 10).flatMap((wave) => wave.recordIds);
  const [masterCsv, wave11Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave11.recordIds),
  ]);
  const wave11Csv = completeWaveWorksheet(wave11Template, matrix, reviewedOn);
  const blankPlan = await mergeWave({ matrix, wave: wave11, waveName: "Wave 11", waveCsv: wave11Csv, masterCsv, prerequisiteRecordIds, now });
  assert.equal(blankPlan.status, "blocked");
  assert.equal(blankPlan.mergedCsv, null);
  assert.equal(blankPlan.summary.prerequisiteRecordsPresent, 0);
  assert.equal(blankPlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 64);

  const throughWave9 = await mergeThrough({ matrix, waves, count: 9, reviewedOn, now });
  const wave9OnlyPlan = await mergeWave({
    matrix,
    wave: wave11,
    waveName: "Wave 11",
    waveCsv: wave11Csv,
    masterCsv: throughWave9.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(wave9OnlyPlan.status, "blocked");
  assert.equal(wave9OnlyPlan.summary.prerequisiteRecordsPresent, 62);
  assert.equal(wave9OnlyPlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 2);
});

test("merges Wave 11 after all prior waves without changing any earlier row", async () => {
  const { matrix, waves } = await fixtures();
  const wave11 = waves[10];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const throughWave10 = await mergeThrough({ matrix, waves, count: 10, reviewedOn, now });
  const prerequisiteRecordIds = throughWave10.prerequisiteRecordIds;
  const beforeRows = parseLegacyMigrationDecisionCsv(throughWave10.masterCsv).rows;
  const header = beforeRows[0];
  const recordColumn = header.indexOf("record_id");
  const previousRows = new Map(beforeRows.slice(1)
    .filter((row) => prerequisiteRecordIds.includes(row[recordColumn]))
    .map((row) => [row[recordColumn], [...row]]));
  const previousOrder = beforeRows.slice(1).map((row) => row[recordColumn]);
  const wave11Template = await legacyContentMigrationWaveCsv(matrix, wave11.recordIds);
  const wave11Plan = await mergeWave({
    matrix,
    wave: wave11,
    waveName: "Wave 11",
    waveCsv: completeWaveWorksheet(wave11Template, matrix, reviewedOn),
    masterCsv: throughWave10.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(wave11Plan.status, "ready-for-download", JSON.stringify(wave11Plan.issues));
  assert.equal(wave11Plan.summary.acceptedWaveRecords, 5);
  assert.equal(wave11Plan.summary.prerequisiteRecordsRequired, 64);
  assert.equal(wave11Plan.summary.prerequisiteRecordsPresent, 64);
  assert.equal(wave11Plan.summary.masterRecords, 115);
  assert.equal(wave11Plan.summary.carriedContentDecisions, 69);
  assert.equal(wave11Plan.summary.remainingContentDecisions, 46);
  assert.equal(wave11Plan.summary.remainingRouteDecisions, 46);
  assert.ok(wave11Plan.mergedCsv);
  const afterRows = parseLegacyMigrationDecisionCsv(wave11Plan.mergedCsv).rows.slice(1);
  assert.deepEqual(afterRows.map((row) => row[recordColumn]), previousOrder);
  for (const recordId of prerequisiteRecordIds) {
    assert.deepEqual(afterRows.find((row) => row[recordColumn] === recordId), previousRows.get(recordId));
  }
  assert.ok(Object.values(wave11Plan.guardrails).every((value) => value === false));

  const canonicalPlan = await createLegacyMigrationDecisionPlan({ csv: wave11Plan.mergedCsv, matrix, now });
  const decidedIds = new Set([...prerequisiteRecordIds, ...wave11.recordIds]);
  assert.ok(canonicalPlan.issues.every((issue) => !issue.row || !decidedIds.has(afterRows[issue.row - 2]?.[recordColumn])));
});

test("blocks altered prerequisites, conflicting decisions and unsafe Wave 11 input", async () => {
  const { matrix, waves } = await fixtures();
  const wave11 = waves[10];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const throughWave10 = await mergeThrough({ matrix, waves, count: 10, reviewedOn, now });
  const prerequisiteRecordIds = throughWave10.prerequisiteRecordIds;
  const wave11Template = await legacyContentMigrationWaveCsv(matrix, wave11.recordIds);
  const wave11Csv = completeWaveWorksheet(wave11Template, matrix, reviewedOn);

  const alteredRows = parseLegacyMigrationDecisionCsv(throughWave10.masterCsv).rows;
  const alteredHeader = alteredRows[0];
  const firstWave10Row = alteredRows.find((row) => row[alteredHeader.indexOf("record_id")] === waves[9].recordIds[0]);
  firstWave10Row[alteredHeader.indexOf("proposed_content_decision")] = " ";
  const alteredPlan = await mergeWave({
    matrix,
    wave: wave11,
    waveName: "Wave 11",
    waveCsv: wave11Csv,
    masterCsv: serializeLegacyMigrationDecisionCsv(alteredRows),
    prerequisiteRecordIds,
    now,
  });
  assert.equal(alteredPlan.status, "blocked");
  assert.ok(alteredPlan.issues.some((issue) => issue.source === "decision-contract" && issue.code === "content-decision-missing"));

  const conflictRows = parseLegacyMigrationDecisionCsv(throughWave10.masterCsv).rows;
  const conflictHeader = conflictRows[0];
  const firstWave11Row = conflictRows.find((row) => row[conflictHeader.indexOf("record_id")] === wave11.recordIds[0]);
  firstWave11Row[conflictHeader.indexOf("proposed_route_action")] = "retire";
  firstWave11Row[conflictHeader.indexOf("proposed_content_decision")] = "archive";
  const conflictPlan = await mergeWave({
    matrix,
    wave: wave11,
    waveName: "Wave 11",
    waveCsv: wave11Csv,
    masterCsv: serializeLegacyMigrationDecisionCsv(conflictRows),
    prerequisiteRecordIds,
    now,
  });
  assert.equal(conflictPlan.status, "blocked");
  assert.ok(conflictPlan.issues.some((issue) => issue.code === "wave-decision-conflict"));

  const unsafeRows = parseLegacyMigrationDecisionCsv(wave11Csv).rows;
  const unsafeHeader = unsafeRows[0];
  const unsafeColumn = Object.fromEntries(unsafeHeader.map((name, index) => [name, index]));
  unsafeRows[1][unsafeColumn.proposed_route_action] = "";
  unsafeRows[2][unsafeColumn.proposed_route_target] = unsafeRows[2][unsafeColumn.legacy_path];
  unsafeRows[2][unsafeColumn.proposed_reason_code] = "=SUM(1,1)";
  const unsafePlan = await mergeWave({
    matrix,
    wave: wave11,
    waveName: "Wave 11",
    waveCsv: serializeLegacyMigrationDecisionCsv(unsafeRows),
    masterCsv: throughWave10.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  const unsafeCodes = new Set(unsafePlan.issues.map((issue) => issue.code));
  assert.equal(unsafePlan.status, "blocked");
  for (const code of ["route-decision-missing", "route-target-invalid", "formula-like-input"]) {
    assert.ok(unsafeCodes.has(code), `Expected ${code}`);
  }

  const staleRows = parseLegacyMigrationDecisionCsv(wave11Csv).rows;
  const staleHeader = staleRows[0];
  staleRows[1][staleHeader.indexOf("label")] = "Changed immutable label";
  const stalePlan = await mergeWave({
    matrix,
    wave: wave11,
    waveName: "Wave 11",
    waveCsv: serializeLegacyMigrationDecisionCsv(staleRows),
    masterCsv: throughWave10.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(stalePlan.status, "blocked");
  assert.ok(stalePlan.issues.some((issue) => issue.code === "wave-binding-stale"));
});

test("blocks invalid cumulative prerequisite sets", async () => {
  const { matrix, waves } = await fixtures();
  const wave11 = waves[10];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const [masterCsv, wave11Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave11.recordIds),
  ]);
  const wave11Csv = completeWaveWorksheet(wave11Template, matrix, reviewedOn);
  const base = waves.slice(0, 10).flatMap((wave) => wave.recordIds);
  for (const invalidPrerequisiteRecordIds of [
    [...base, waves[0].recordIds[0]],
    [...base, "migration-0000000000000000"],
    [...base, wave11.recordIds[0]],
  ]) {
    const plan = await mergeWave({
      matrix,
      wave: wave11,
      waveName: "Wave 11",
      waveCsv: wave11Csv,
      masterCsv,
      prerequisiteRecordIds: invalidPrerequisiteRecordIds,
      now,
    });
    assert.equal(plan.status, "blocked");
    assert.ok(plan.issues.some((issue) => issue.code === "prerequisite-record-invalid"));
  }
});

test("ships Wave 11 as an authenticated noindex browser-only pupil result review workspace", async () => {
  const [page, workspace, form, exportRoute, dataModule, manifest, matrixBuilder, waveEngine, dashboard, wave10Page, sitemap, guide, packageJson] = await Promise.all([
    source("app/publication-review/migration-wave-11/page.tsx"),
    source("app/publication-review/migration-wave-workspace.tsx"),
    source("app/publication-review/migration-wave-merge-form.tsx"),
    source("app/publication-review/migration-wave-11/export/route.ts"),
    source("app/data/legacy-migration-wave-11.ts"),
    source("content/legacy-migration-wave-11.json"),
    source("scripts/build-legacy-content-migration-matrix.mjs"),
    source("app/data/legacy-migration-wave.ts"),
    source("app/publication-review/page.tsx"),
    source("app/publication-review/migration-wave-10/page.tsx"),
    source("app/sitemap.ts"),
    source("docs/legacy-content-migration.md"),
    source("package.json"),
  ]);
  assert.match(page, /HOMEPAGE_REVIEW_MODE !== "private"/);
  assert.match(page, /requireChatGPTUser\("\/publication-review\/migration-wave-11"\)/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(page, /all sixty-four earlier decisions/);
  assert.match(page, /A legacy label is unverified index metadata, not result evidence/);
  assert.match(page, /earlier public availability is not current guardian consent/);
  assert.match(page, /do not prove a pupil's identity or spelling, class or academic year, exam or award body, stage or level, rank or score, outcome, institutional attribution, endorsement, current standing or continuing permission to publish/);
  assert.match(page, /Verify authoritative result evidence, purpose-specific guardian consent for minors or data-subject consent where applicable, pupil assent where appropriate, media rights, approved public fields and captions, withdrawal handling, and a retention end date only in the controlled system/);
  assert.match(page, /Do not silently correct legacy wording/);
  assert.match(page, /No claim, title, route, destination, merge or content decision is preselected/);
  assert.match(page, /identityProtected: false does not prove that an image contains no child or personal data, or that consent and rights exist/);
  assert.match(page, /Historic publication, posters and certificates are not evidence of current consent/);
  assert.match(page, /contains no marksheets, certificates, pupil-level marks, roll numbers, guardian details, consent records, supporting evidence, private locations or source media/);
  assert.match(page, /Every eventual asset and caption still requires separate evidence and media approval, exact-byte binding and activation before public release/);
  assert.match(workspace, /No archived copy is approved or published/);
  assert.match(workspace, /No route treatment is preselected/);
  assert.match(workspace, /no legacy source content/);
  assert.match(form, /Promise\.all\(\[waveFile\.text\(\), masterFile\.text\(\)\]\)/);
  assert.match(form, /URL\.createObjectURL\(new Blob/);
  assert.doesNotMatch(`${page}\n${workspace}\n${form}`, /\bfetch\s*\(|FormData|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|\bcaches\b|document\.cookie|serviceWorker|use server/);
  assert.match(exportRoute, /requireChatGPTUser\("\/publication-review\/migration-wave-11\/export"\)/);
  assert.match(exportRoute, /"cache-control": "private, no-store"/);
  assert.match(exportRoute, /"x-content-type-options": "nosniff"/);
  assert.match(dataModule, /allowedAreas: \["media"\]/);
  assert.match(dataModule, /allowedSourceKinds: \["sk_igallery"\]/);
  assert.match(dataModule, /allowedSourceStatuses: \["public-index"\]/);
  assert.match(dataModule, /prerequisiteWaves: \[[\s\S]*legacyMigrationWave1,[\s\S]*legacyMigrationWave2,[\s\S]*legacyMigrationWave3,[\s\S]*legacyMigrationWave4,[\s\S]*legacyMigrationWave5,[\s\S]*legacyMigrationWave6,[\s\S]*legacyMigrationWave7,[\s\S]*legacyMigrationWave8,[\s\S]*legacyMigrationWave9,[\s\S]*legacyMigrationWave10,[\s\S]*\]/);
  assert.match(dataModule, /requireRouteDecisions: true/);
  assert.doesNotMatch(dataModule, /requireMappedRoutes: true/);
  for (const review of requiredPupilResultReviews) assert.match(dataModule, new RegExp(`"${review}"`));
  assert.match(matrixBuilder, /row\.route_type === "sk_igallery"/);
  assert.match(matrixBuilder, /achievement\|felicitation\|olympiad\|rank\|result/);
  assert.match(waveEngine, /requireMappedRoutes && requireRouteDecisions/);
  assert.match(waveEngine, /requireRouteDecisions && record\.routeContinuity\.status !== "decision-required"/);
  assert.match(waveEngine, /requiredReviews\.some\(\(review\) => !record\.requiredReviews\.includes\(review\)\)/);
  assert.match(waveEngine, /record\.publicationEligible !== false/);
  assert.match(dashboard, /href="\/publication-review\/migration-wave-11"/);
  assert.match(wave10Page, /href: "\/publication-review\/migration-wave-11"/);
  assert.doesNotMatch(sitemap, /migration-wave-11/);
  assert.match(guide, /Legacy labels are unverified index metadata, not publishable result evidence/);
  assert.match(guide, /Earlier public availability, a poster or a certificate is not evidence of current guardian consent/);
  assert.match(guide, /successful browser-only merge carries 69 decisions/);
  assert.match(guide, /two child-health event galleries for a later wave/);
  assert.match(packageJson, /tests\/legacy-migration-wave-11\.test\.mjs/);
  assert.doesNotMatch(`${page}\n${dataModule}\n${exportRoute}\n${manifest}`, /Rajveer|Sonawane|LogiQids/i);
  assert.doesNotMatch(`${page}\n${dataModule}\n${exportRoute}\n${manifest}`, /<img\b|<video\b|data:image|data:video|\.(?:jpe?g|png|webp|gif|mp4|webm)\b|source-html|source-wordpress|SSKEMS-BACKUP|[A-Za-z]:\\\\|\/Users\//i);
});
