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
  "migration-732d9eec031f3e31",
  "migration-32c060053d25e1b5",
  "migration-ad5ee72ea935364d",
  "migration-4806caba914dfeaa",
  "migration-4e4ca7fcedc88a05",
];
const requiredTaxonomyReviews = [
  "accuracy",
  "currency",
  "editorial",
  "management-approval",
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
    const target = record.routeContinuity.targetPath ?? "/student-life/gallery";
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
    ...Array.from({ length: 13 }, (_, index) => json(`content/legacy-migration-wave-${index + 1}.json`)),
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

test("defines Wave 13 as the five remaining public taxonomy archive indexes", async () => {
  const { matrix, waves } = await fixtures();
  const wave13 = waves[12];
  assert.deepEqual(validateLegacyContentMigrationMatrix(matrix), []);
  assert.deepEqual(wave13.recordIds, expectedRecordIds);
  assert.deepEqual(wave13.prerequisiteWaveIds, waves.slice(0, 12).map((wave) => wave.waveId));
  assert.equal(new Set(waves.flatMap((wave) => wave.recordIds)).size, 76);
  assert.deepEqual(Object.values(wave13.policy), [false, false, false, false]);

  const recordsById = new Map(matrix.records.map((record) => [record.id, record]));
  const records = wave13.recordIds.map((recordId) => recordsById.get(recordId));
  assert.ok(records.every(Boolean));
  assert.deepEqual(records.map((record) => record.sourceKind), ["category", "category", "category", "category", "post_format"]);
  assert.ok(records.every((record) => record.sourceVisibility === "public"));
  assert.ok(records.every((record) => record.sourceStatus === "public-index"));
  assert.ok(records.every((record) => record.area === "taxonomy"));
  assert.ok(records.every((record) => record.identityProtected === false));
  assert.ok(records.every((record) => record.routeContinuity.status === "decision-required"));
  assert.ok(records.every((record) => record.routeContinuity.action === "unselected"));
  assert.ok(records.every((record) => record.routeContinuity.targetPath === null));
  assert.ok(records.every((record) => record.contentDecision.decision === "unselected"));
  assert.ok(records.every((record) => record.implementationStatus === "not-started"));
  assert.ok(records.every((record) => record.publicationEligible === false));
  assert.ok(records.every((record) => record.publicationReason === "decision-and-approval-required"));
  for (const record of records) assert.deepEqual(record.requiredReviews, requiredTaxonomyReviews);

  const packetizedIds = new Set(waves.flatMap((wave) => wave.recordIds));
  assert.equal(matrix.records.filter((record) => record.area === "taxonomy").length, 5);
  assert.deepEqual(matrix.records
    .filter((record) => record.area === "taxonomy" && !packetizedIds.has(record.id))
    .map((record) => record.id), []);
  assert.doesNotMatch(JSON.stringify(wave13), /source-html|source-wordpress|SSKEMS-BACKUP|[A-Za-z]:\\\\|\/Users\//i);
});

test("exports only five digest-bound Wave 13 rows with no proposed decisions or source-content fields", async () => {
  const { matrix, waves } = await fixtures();
  const wave13 = waves[12];
  const csv = await legacyContentMigrationWaveCsv(matrix, wave13.recordIds);
  const lines = csv.replace(/^\uFEFF/, "").split("\r\n").filter(Boolean);
  assert.equal(lines.length, 6);
  assert.equal(lines[0], legacyMigrationDecisionWorksheetHeaders.map((value) => `"${value}"`).join(","));
  for (const recordId of expectedRecordIds) assert.match(csv, new RegExp(`"${recordId}"`));
  const parsed = parseLegacyMigrationDecisionCsv(csv);
  assert.equal(parsed.error, false);
  const [header, ...rows] = parsed.rows;
  assert.equal(rows.length, 5);
  const proposedStart = header.indexOf("proposed_route_action");
  assert.ok(rows.every((row) => row.slice(proposedStart).every((value) => value === "")));
  for (const forbiddenHeader of [
    "term_id",
    "parent_term",
    "post_count",
    "post_ids",
    "post_title",
    "post_body",
    "post_excerpt",
    "category_description",
    "source_content",
    "media_url",
    "author_name",
    "user_id",
  ]) assert.ok(!header.includes(forbiddenHeader));
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

test("requires the complete cumulative Wave 1 through Wave 12 master", async () => {
  const { matrix, waves } = await fixtures();
  const wave13 = waves[12];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const prerequisiteRecordIds = waves.slice(0, 12).flatMap((wave) => wave.recordIds);
  const [masterCsv, wave13Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave13.recordIds),
  ]);
  const wave13Csv = completeWaveWorksheet(wave13Template, matrix, reviewedOn);
  const blankPlan = await mergeWave({ matrix, wave: wave13, waveName: "Wave 13", waveCsv: wave13Csv, masterCsv, prerequisiteRecordIds, now });
  assert.equal(blankPlan.status, "blocked");
  assert.equal(blankPlan.mergedCsv, null);
  assert.equal(blankPlan.summary.prerequisiteRecordsPresent, 0);
  assert.equal(blankPlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 71);

  const throughWave11 = await mergeThrough({ matrix, waves, count: 11, reviewedOn, now });
  const incompletePlan = await mergeWave({
    matrix,
    wave: wave13,
    waveName: "Wave 13",
    waveCsv: wave13Csv,
    masterCsv: throughWave11.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(incompletePlan.status, "blocked");
  assert.equal(incompletePlan.summary.prerequisiteRecordsPresent, 69);
  assert.equal(incompletePlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 2);
});

test("merges Wave 13 after all prior waves without changing any earlier row", async () => {
  const { matrix, waves } = await fixtures();
  const wave13 = waves[12];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const throughWave12 = await mergeThrough({ matrix, waves, count: 12, reviewedOn, now });
  const prerequisiteRecordIds = throughWave12.prerequisiteRecordIds;
  const beforeRows = parseLegacyMigrationDecisionCsv(throughWave12.masterCsv).rows;
  const header = beforeRows[0];
  const recordColumn = header.indexOf("record_id");
  const previousRows = new Map(beforeRows.slice(1)
    .filter((row) => prerequisiteRecordIds.includes(row[recordColumn]))
    .map((row) => [row[recordColumn], [...row]]));
  const previousOrder = beforeRows.slice(1).map((row) => row[recordColumn]);
  const wave13Template = await legacyContentMigrationWaveCsv(matrix, wave13.recordIds);
  const wave13Plan = await mergeWave({
    matrix,
    wave: wave13,
    waveName: "Wave 13",
    waveCsv: completeWaveWorksheet(wave13Template, matrix, reviewedOn),
    masterCsv: throughWave12.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(wave13Plan.status, "ready-for-download", JSON.stringify(wave13Plan.issues));
  assert.equal(wave13Plan.summary.acceptedWaveRecords, 5);
  assert.equal(wave13Plan.summary.prerequisiteRecordsRequired, 71);
  assert.equal(wave13Plan.summary.prerequisiteRecordsPresent, 71);
  assert.equal(wave13Plan.summary.masterRecords, 115);
  assert.equal(wave13Plan.summary.carriedContentDecisions, 76);
  assert.equal(wave13Plan.summary.remainingContentDecisions, 39);
  assert.equal(wave13Plan.summary.remainingRouteDecisions, 39);
  assert.ok(wave13Plan.mergedCsv);
  const afterRows = parseLegacyMigrationDecisionCsv(wave13Plan.mergedCsv).rows.slice(1);
  assert.deepEqual(afterRows.map((row) => row[recordColumn]), previousOrder);
  for (const recordId of prerequisiteRecordIds) {
    assert.deepEqual(afterRows.find((row) => row[recordColumn] === recordId), previousRows.get(recordId));
  }
  assert.ok(Object.values(wave13Plan.guardrails).every((value) => value === false));

  const canonicalPlan = await createLegacyMigrationDecisionPlan({ csv: wave13Plan.mergedCsv, matrix, now });
  const decidedIds = new Set([...prerequisiteRecordIds, ...wave13.recordIds]);
  assert.ok(canonicalPlan.issues.every((issue) => !issue.row || !decidedIds.has(afterRows[issue.row - 2]?.[recordColumn])));
});

test("blocks altered prerequisites, conflicting decisions and unsafe Wave 13 input", async () => {
  const { matrix, waves } = await fixtures();
  const wave13 = waves[12];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const throughWave12 = await mergeThrough({ matrix, waves, count: 12, reviewedOn, now });
  const prerequisiteRecordIds = throughWave12.prerequisiteRecordIds;
  const wave13Template = await legacyContentMigrationWaveCsv(matrix, wave13.recordIds);
  const wave13Csv = completeWaveWorksheet(wave13Template, matrix, reviewedOn);

  const alteredRows = parseLegacyMigrationDecisionCsv(throughWave12.masterCsv).rows;
  const alteredHeader = alteredRows[0];
  const firstWave12Row = alteredRows.find((row) => row[alteredHeader.indexOf("record_id")] === waves[11].recordIds[0]);
  firstWave12Row[alteredHeader.indexOf("proposed_content_decision")] = " ";
  const alteredPlan = await mergeWave({
    matrix,
    wave: wave13,
    waveName: "Wave 13",
    waveCsv: wave13Csv,
    masterCsv: serializeLegacyMigrationDecisionCsv(alteredRows),
    prerequisiteRecordIds,
    now,
  });
  assert.equal(alteredPlan.status, "blocked");
  assert.ok(alteredPlan.issues.some((issue) => issue.source === "decision-contract" && issue.code === "content-decision-missing"));

  const conflictRows = parseLegacyMigrationDecisionCsv(throughWave12.masterCsv).rows;
  const conflictHeader = conflictRows[0];
  const firstWave13Row = conflictRows.find((row) => row[conflictHeader.indexOf("record_id")] === wave13.recordIds[0]);
  firstWave13Row[conflictHeader.indexOf("proposed_route_action")] = "retire";
  firstWave13Row[conflictHeader.indexOf("proposed_content_decision")] = "archive";
  const conflictPlan = await mergeWave({
    matrix,
    wave: wave13,
    waveName: "Wave 13",
    waveCsv: wave13Csv,
    masterCsv: serializeLegacyMigrationDecisionCsv(conflictRows),
    prerequisiteRecordIds,
    now,
  });
  assert.equal(conflictPlan.status, "blocked");
  assert.ok(conflictPlan.issues.some((issue) => issue.code === "wave-decision-conflict"));

  const unsafeRows = parseLegacyMigrationDecisionCsv(wave13Csv).rows;
  const unsafeHeader = unsafeRows[0];
  const column = Object.fromEntries(unsafeHeader.map((name, index) => [name, index]));
  unsafeRows[1][column.proposed_route_action] = "";
  unsafeRows[2][column.proposed_route_target] = unsafeRows[2][column.legacy_path];
  unsafeRows[3][column.proposed_reason_code] = "=SUM(1,1)";
  unsafeRows[4][column.proposed_owner_role] = "named-editor";
  unsafeRows[5][column.proposed_reviewed_on] = "2999-12-31";
  const unsafePlan = await mergeWave({
    matrix,
    wave: wave13,
    waveName: "Wave 13",
    waveCsv: serializeLegacyMigrationDecisionCsv(unsafeRows),
    masterCsv: throughWave12.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  const unsafeCodes = new Set(unsafePlan.issues.map((issue) => issue.code));
  assert.equal(unsafePlan.status, "blocked");
  for (const code of ["route-decision-missing", "route-target-invalid", "formula-like-input", "owner-role-invalid", "review-date-invalid"]) {
    assert.ok(unsafeCodes.has(code), `Expected ${code}`);
  }

  const staleRows = parseLegacyMigrationDecisionCsv(wave13Csv).rows;
  const staleHeader = staleRows[0];
  staleRows[1][staleHeader.indexOf("source_digest")] = "0".repeat(64);
  const stalePlan = await mergeWave({
    matrix,
    wave: wave13,
    waveName: "Wave 13",
    waveCsv: serializeLegacyMigrationDecisionCsv(staleRows),
    masterCsv: throughWave12.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(stalePlan.status, "blocked");
  assert.ok(stalePlan.issues.some((issue) => issue.code === "wave-binding-stale"));
});

test("blocks invalid cumulative Wave 13 prerequisite sets", async () => {
  const { matrix, waves } = await fixtures();
  const wave13 = waves[12];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const [masterCsv, wave13Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave13.recordIds),
  ]);
  const wave13Csv = completeWaveWorksheet(wave13Template, matrix, reviewedOn);
  const base = waves.slice(0, 12).flatMap((wave) => wave.recordIds);
  for (const invalidPrerequisiteRecordIds of [
    [...base, waves[0].recordIds[0]],
    [...base, "migration-0000000000000000"],
    [...base, wave13.recordIds[0]],
  ]) {
    const plan = await mergeWave({
      matrix,
      wave: wave13,
      waveName: "Wave 13",
      waveCsv: wave13Csv,
      masterCsv,
      prerequisiteRecordIds: invalidPrerequisiteRecordIds,
      now,
    });
    assert.equal(plan.status, "blocked");
    assert.ok(plan.issues.some((issue) => issue.code === "prerequisite-record-invalid"));
  }
});

test("ships Wave 13 as an authenticated noindex browser-only taxonomy review workspace", async () => {
  const [page, workspace, form, exportRoute, dataModule, manifest, dashboard, wave12Page, sitemap, guide, packageJson] = await Promise.all([
    source("app/publication-review/migration-wave-13/page.tsx"),
    source("app/publication-review/migration-wave-workspace.tsx"),
    source("app/publication-review/migration-wave-merge-form.tsx"),
    source("app/publication-review/migration-wave-13/export/route.ts"),
    source("app/data/legacy-migration-wave-13.ts"),
    source("content/legacy-migration-wave-13.json"),
    source("app/publication-review/page.tsx"),
    source("app/publication-review/migration-wave-12/page.tsx"),
    source("app/sitemap.ts"),
    source("docs/legacy-content-migration.md"),
    source("package.json"),
  ]);
  assert.match(page, /HOMEPAGE_REVIEW_MODE !== "private"/);
  assert.match(page, /requireChatGPTUser\("\/publication-review\/migration-wave-13"\)/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(page, /all seventy-one earlier decisions/);
  assert.match(page, /observed archive metadata, not approved navigation/);
  assert.match(page, /A decision for an archive index does not decide, approve, merge, rewrite or publish any child post/);
  assert.match(page, /‘Activities 2016’ is a historic label/);
  assert.match(page, /‘Lunch’ does not establish a current meal, menu or nutrition programme/);
  assert.match(page, /‘School life’ is not automatically equivalent to the new Student Life section/);
  assert.match(page, /‘Uncategorized’ is a WordPress fallback classification/);
  assert.match(page, /‘Not Found’ label at \/type\/image is response-derived legacy metadata/);
  assert.match(page, /does not establish a meaningful title, active post-format archive, image collection or navigation item/);
  assert.match(page, /Do not redirect to Home or another generic page merely to avoid a 404/);
  assert.match(page, /No route, destination, merge, taxonomy name, canonical or noindex treatment, or content decision is preselected/);
  assert.match(page, /contains no term descriptions or assignments, post bodies, excerpts, author or user records/);
  assert.match(page, /All child posts and assets remain undecided and require their own bounded review/);
  assert.match(workspace, /No archived copy is approved or published/);
  assert.match(workspace, /No route treatment is preselected/);
  assert.match(workspace, /no legacy source content/);
  assert.match(form, /Promise\.all\(\[waveFile\.text\(\), masterFile\.text\(\)\]\)/);
  assert.match(form, /URL\.createObjectURL\(new Blob/);
  assert.doesNotMatch(`${page}\n${workspace}\n${form}`, /\bfetch\s*\(|FormData|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|\bcaches\b|document\.cookie|serviceWorker|use server/);
  assert.match(exportRoute, /requireChatGPTUser\("\/publication-review\/migration-wave-13\/export"\)/);
  assert.match(exportRoute, /"cache-control": "private, no-store"/);
  assert.match(exportRoute, /"x-content-type-options": "nosniff"/);
  assert.match(dataModule, /allowedAreas: \["taxonomy"\]/);
  assert.match(dataModule, /allowedSourceKinds: \["category", "post_format"\]/);
  assert.match(dataModule, /allowedSourceStatuses: \["public-index"\]/);
  assert.match(dataModule, /prerequisiteWaves: \[[\s\S]*legacyMigrationWave1,[\s\S]*legacyMigrationWave2,[\s\S]*legacyMigrationWave3,[\s\S]*legacyMigrationWave4,[\s\S]*legacyMigrationWave5,[\s\S]*legacyMigrationWave6,[\s\S]*legacyMigrationWave7,[\s\S]*legacyMigrationWave8,[\s\S]*legacyMigrationWave9,[\s\S]*legacyMigrationWave10,[\s\S]*legacyMigrationWave11,[\s\S]*legacyMigrationWave12,[\s\S]*\]/);
  assert.match(dataModule, /requireRouteDecisions: true/);
  assert.doesNotMatch(dataModule, /requireMappedRoutes: true/);
  for (const review of requiredTaxonomyReviews) assert.match(dataModule, new RegExp(`"${review}"`));
  assert.match(dashboard, /href="\/publication-review\/migration-wave-13"/);
  assert.match(wave12Page, /href: "\/publication-review\/migration-wave-13"/);
  assert.doesNotMatch(sitemap, /migration-wave-13/);
  assert.match(guide, /successful browser-only merge carries 76 decisions/);
  assert.match(guide, /leaving 39 content decisions and 39 route decisions/);
  assert.match(guide, /packetization does not record a decision, approve a taxonomy, implement a route, migrate a child post or authorize publication/);
  assert.equal(packageJson.match(/tests\/legacy-migration-wave-13\.test\.mjs/g)?.length, 2);
  assert.doesNotMatch(`${page}\n${dataModule}\n${exportRoute}\n${manifest}`, /<img\b|<video\b|<iframe\b|data:image|data:video|\.(?:jpe?g|png|webp|gif|mp4|webm)\b|source-html|source-wordpress|SSKEMS-BACKUP|[A-Za-z]:\\\\|\/Users\//i);
});
