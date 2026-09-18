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
  "migration-e07c1358d270df2c",
  "migration-eac5819edaed31a2",
];
const requiredOpenSchoolPostReviews = [
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
    ...Array.from({ length: 15 }, (_, index) => json(`content/legacy-migration-wave-${index + 1}.json`)),
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

test("defines Wave 15 as two public Open School legacy news posts", async () => {
  const { matrix, waves } = await fixtures();
  const wave15 = waves[14];
  assert.deepEqual(validateLegacyContentMigrationMatrix(matrix), []);
  assert.deepEqual(wave15.recordIds, expectedRecordIds);
  assert.deepEqual(wave15.prerequisiteWaveIds, waves.slice(0, 14).map((wave) => wave.waveId));
  assert.equal(new Set(waves.flatMap((wave) => wave.recordIds)).size, 81);
  assert.deepEqual(Object.values(wave15.policy), [false, false, false, false]);

  const recordsById = new Map(matrix.records.map((record) => [record.id, record]));
  const records = wave15.recordIds.map((recordId) => recordsById.get(recordId));
  assert.ok(records.every(Boolean));
  assert.deepEqual(records.map((record) => record.label), [
    "Open School’s Institut",
    "Open School’s Institut Constructivism",
  ]);
  assert.deepEqual(records.map((record) => record.legacyPath), [
    "/2017/01/30/open-schools-institut",
    "/2017/02/22/open-schools-institut-constructivism-in-action",
  ]);
  assert.deepEqual(records.map((record) => record.sourceDigest), [
    "ff0d667950e91a37c83ef727a650642e430b4470eb2d961534fa832f17385544",
    "9e9fa84561585fc4a8ca82ae6c5d9c81de1c3984eee9905581d60bb1daf440f8",
  ]);
  assert.deepEqual(records.map((record) => record.sourceModifiedOn), [
    "2017-01-30T10:16:30",
    "2017-02-22T12:07:25",
  ]);
  assert.ok(records.every((record) => record.sourceKind === "post"));
  assert.ok(records.every((record) => record.sourceVisibility === "public"));
  assert.ok(records.every((record) => record.sourceStatus === "publish"));
  assert.ok(records.every((record) => record.area === "news"));
  assert.ok(records.every((record) => record.identityProtected === false));
  assert.ok(records.every((record) => record.routeContinuity.status === "decision-required"));
  assert.ok(records.every((record) => record.routeContinuity.action === "unselected"));
  assert.ok(records.every((record) => record.routeContinuity.targetPath === null));
  assert.ok(records.every((record) => record.contentDecision.decision === "unselected"));
  assert.ok(records.every((record) => record.implementationStatus === "not-started"));
  assert.ok(records.every((record) => record.publicationEligible === false));
  assert.ok(records.every((record) => record.publicationReason === "decision-and-approval-required"));
  for (const record of records) assert.deepEqual(record.requiredReviews, requiredOpenSchoolPostReviews);

  const packetizedIds = new Set(waves.flatMap((wave) => wave.recordIds));
  const openSchoolInstitutPosts = matrix.records.filter((record) => (
    record.sourceKind === "post"
    && record.area === "news"
    && record.label.startsWith("Open School’s Institut")
  ));
  assert.equal(openSchoolInstitutPosts.length, 2);
  assert.deepEqual(matrix.records
    .filter((record) => openSchoolInstitutPosts.some((candidate) => candidate.id === record.id) && !packetizedIds.has(record.id))
    .map((record) => record.id), []);
  assert.doesNotMatch(JSON.stringify(wave15), /source-html|source-wordpress|SSKEMS-BACKUP|[A-Za-z]:\\\\|\/Users\//i);
});
test("exports only two digest-bound Wave 15 rows with no proposed decisions or post-content fields", async () => {
  const { matrix, waves } = await fixtures();
  const wave15 = waves[14];
  const csv = await legacyContentMigrationWaveCsv(matrix, wave15.recordIds);
  const lines = csv.replace(/^\uFEFF/, "").split("\r\n").filter(Boolean);
  assert.equal(lines.length, 3);
  assert.equal(lines[0], legacyMigrationDecisionWorksheetHeaders.map((value) => `"${value}"`).join(","));
  for (const recordId of expectedRecordIds) assert.match(csv, new RegExp(`"${recordId}"`));
  const parsed = parseLegacyMigrationDecisionCsv(csv);
  assert.equal(parsed.error, false);
  const [header, ...rows] = parsed.rows;
  assert.equal(rows.length, 2);
  const proposedStart = header.indexOf("proposed_route_action");
  assert.ok(rows.every((row) => row.slice(proposedStart).every((value) => value === "")));
  for (const forbiddenHeader of [
    "post_title",
    "post_body",
    "post_excerpt",
    "programme_description",
    "teaching_method",
    "pedagogy",
    "curriculum",
    "source_content",
    "media_url",
    "caption",
    "author_name",
    "user_id",
    "comments",
    "links",
    "evidence_reference",
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

test("requires the complete cumulative Wave 1 through Wave 14 master", async () => {
  const { matrix, waves } = await fixtures();
  const wave15 = waves[14];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const prerequisiteRecordIds = waves.slice(0, 14).flatMap((wave) => wave.recordIds);
  const [masterCsv, wave15Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave15.recordIds),
  ]);
  const wave15Csv = completeWaveWorksheet(wave15Template, matrix, reviewedOn);
  const blankPlan = await mergeWave({ matrix, wave: wave15, waveName: "Wave 15", waveCsv: wave15Csv, masterCsv, prerequisiteRecordIds, now });
  assert.equal(blankPlan.status, "blocked");
  assert.equal(blankPlan.mergedCsv, null);
  assert.equal(blankPlan.summary.prerequisiteRecordsPresent, 0);
  assert.equal(blankPlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 79);

  const throughWave13 = await mergeThrough({ matrix, waves, count: 13, reviewedOn, now });
  const incompletePlan = await mergeWave({
    matrix,
    wave: wave15,
    waveName: "Wave 15",
    waveCsv: wave15Csv,
    masterCsv: throughWave13.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(incompletePlan.status, "blocked");
  assert.equal(incompletePlan.summary.prerequisiteRecordsPresent, 76);
  assert.equal(incompletePlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 3);
});

test("merges Wave 15 after all prior waves without changing any earlier row", async () => {
  const { matrix, waves } = await fixtures();
  const wave15 = waves[14];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const throughWave14 = await mergeThrough({ matrix, waves, count: 14, reviewedOn, now });
  const prerequisiteRecordIds = throughWave14.prerequisiteRecordIds;
  const beforeRows = parseLegacyMigrationDecisionCsv(throughWave14.masterCsv).rows;
  const header = beforeRows[0];
  const recordColumn = header.indexOf("record_id");
  const previousRows = new Map(beforeRows.slice(1)
    .filter((row) => prerequisiteRecordIds.includes(row[recordColumn]))
    .map((row) => [row[recordColumn], [...row]]));
  const previousOrder = beforeRows.slice(1).map((row) => row[recordColumn]);
  const wave15Template = await legacyContentMigrationWaveCsv(matrix, wave15.recordIds);
  const wave15Plan = await mergeWave({
    matrix,
    wave: wave15,
    waveName: "Wave 15",
    waveCsv: completeWaveWorksheet(wave15Template, matrix, reviewedOn),
    masterCsv: throughWave14.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(wave15Plan.status, "ready-for-download", JSON.stringify(wave15Plan.issues));
  assert.equal(wave15Plan.summary.acceptedWaveRecords, 2);
  assert.equal(wave15Plan.summary.prerequisiteRecordsRequired, 79);
  assert.equal(wave15Plan.summary.prerequisiteRecordsPresent, 79);
  assert.equal(wave15Plan.summary.masterRecords, 115);
  assert.equal(wave15Plan.summary.carriedContentDecisions, 81);
  assert.equal(wave15Plan.summary.remainingContentDecisions, 34);
  assert.equal(wave15Plan.summary.remainingRouteDecisions, 34);
  assert.ok(wave15Plan.mergedCsv);
  const afterRows = parseLegacyMigrationDecisionCsv(wave15Plan.mergedCsv).rows.slice(1);
  assert.deepEqual(afterRows.map((row) => row[recordColumn]), previousOrder);
  for (const recordId of prerequisiteRecordIds) {
    assert.deepEqual(afterRows.find((row) => row[recordColumn] === recordId), previousRows.get(recordId));
  }
  assert.ok(Object.values(wave15Plan.guardrails).every((value) => value === false));

  const canonicalPlan = await createLegacyMigrationDecisionPlan({ csv: wave15Plan.mergedCsv, matrix, now });
  const decidedIds = new Set([...prerequisiteRecordIds, ...wave15.recordIds]);
  assert.ok(canonicalPlan.issues.every((issue) => !issue.row || !decidedIds.has(afterRows[issue.row - 2]?.[recordColumn])));
});

test("blocks altered prerequisites, conflicting decisions and unsafe Wave 15 input", async () => {
  const { matrix, waves } = await fixtures();
  const wave15 = waves[14];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const throughWave14 = await mergeThrough({ matrix, waves, count: 14, reviewedOn, now });
  const prerequisiteRecordIds = throughWave14.prerequisiteRecordIds;
  const wave15Template = await legacyContentMigrationWaveCsv(matrix, wave15.recordIds);
  const wave15Csv = completeWaveWorksheet(wave15Template, matrix, reviewedOn);

  const alteredRows = parseLegacyMigrationDecisionCsv(throughWave14.masterCsv).rows;
  const alteredHeader = alteredRows[0];
  const firstWave14PrerequisiteRow = alteredRows.find((row) => row[alteredHeader.indexOf("record_id")] === waves[13].recordIds[0]);
  firstWave14PrerequisiteRow[alteredHeader.indexOf("proposed_content_decision")] = " ";
  const alteredPlan = await mergeWave({
    matrix,
    wave: wave15,
    waveName: "Wave 15",
    waveCsv: wave15Csv,
    masterCsv: serializeLegacyMigrationDecisionCsv(alteredRows),
    prerequisiteRecordIds,
    now,
  });
  assert.equal(alteredPlan.status, "blocked");
  assert.ok(alteredPlan.issues.some((issue) => issue.source === "decision-contract" && issue.code === "content-decision-missing"));

  const conflictRows = parseLegacyMigrationDecisionCsv(throughWave14.masterCsv).rows;
  const conflictHeader = conflictRows[0];
  const firstWave15Row = conflictRows.find((row) => row[conflictHeader.indexOf("record_id")] === wave15.recordIds[0]);
  firstWave15Row[conflictHeader.indexOf("proposed_route_action")] = "retire";
  firstWave15Row[conflictHeader.indexOf("proposed_content_decision")] = "archive";
  const conflictPlan = await mergeWave({
    matrix,
    wave: wave15,
    waveName: "Wave 15",
    waveCsv: wave15Csv,
    masterCsv: serializeLegacyMigrationDecisionCsv(conflictRows),
    prerequisiteRecordIds,
    now,
  });
  assert.equal(conflictPlan.status, "blocked");
  assert.ok(conflictPlan.issues.some((issue) => issue.code === "wave-decision-conflict"));

  const unsafeRows = parseLegacyMigrationDecisionCsv(wave15Csv).rows;
  const unsafeHeader = unsafeRows[0];
  const column = Object.fromEntries(unsafeHeader.map((name, index) => [name, index]));
  unsafeRows[1][column.proposed_route_action] = "";
  unsafeRows[1][column.proposed_owner_role] = "named-editor";
  unsafeRows[2][column.proposed_route_target] = unsafeRows[2][column.legacy_path];
  unsafeRows[2][column.proposed_reason_code] = "=SUM(1,1)";
  unsafeRows[2][column.proposed_reviewed_on] = "2999-12-31";
  const unsafePlan = await mergeWave({
    matrix,
    wave: wave15,
    waveName: "Wave 15",
    waveCsv: serializeLegacyMigrationDecisionCsv(unsafeRows),
    masterCsv: throughWave14.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  const unsafeCodes = new Set(unsafePlan.issues.map((issue) => issue.code));
  assert.equal(unsafePlan.status, "blocked");
  for (const code of ["route-decision-missing", "route-target-invalid", "formula-like-input", "owner-role-invalid", "review-date-invalid"]) {
    assert.ok(unsafeCodes.has(code), `Expected ${code}`);
  }

  const staleRows = parseLegacyMigrationDecisionCsv(wave15Csv).rows;
  const staleHeader = staleRows[0];
  staleRows[1][staleHeader.indexOf("source_digest")] = "0".repeat(64);
  const stalePlan = await mergeWave({
    matrix,
    wave: wave15,
    waveName: "Wave 15",
    waveCsv: serializeLegacyMigrationDecisionCsv(staleRows),
    masterCsv: throughWave14.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(stalePlan.status, "blocked");
  assert.ok(stalePlan.issues.some((issue) => issue.code === "wave-binding-stale"));
});

test("blocks invalid cumulative Wave 15 prerequisite sets", async () => {
  const { matrix, waves } = await fixtures();
  const wave15 = waves[14];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const [masterCsv, wave15Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave15.recordIds),
  ]);
  const wave15Csv = completeWaveWorksheet(wave15Template, matrix, reviewedOn);
  const base = waves.slice(0, 14).flatMap((wave) => wave.recordIds);
  for (const invalidPrerequisiteRecordIds of [
    [...base, waves[0].recordIds[0]],
    [...base, "migration-0000000000000000"],
    [...base, wave15.recordIds[0]],
  ]) {
    const plan = await mergeWave({
      matrix,
      wave: wave15,
      waveName: "Wave 15",
      waveCsv: wave15Csv,
      masterCsv,
      prerequisiteRecordIds: invalidPrerequisiteRecordIds,
      now,
    });
    assert.equal(plan.status, "blocked");
    assert.ok(plan.issues.some((issue) => issue.code === "prerequisite-record-invalid"));
  }
});

test("ships Wave 15 as an authenticated noindex browser-only Open School review workspace", async () => {
  const [page, workspace, form, exportRoute, dataModule, manifest, dashboard, wave14Page, sitemap, guide, packageJson] = await Promise.all([
    source("app/publication-review/migration-wave-15/page.tsx"),
    source("app/publication-review/migration-wave-workspace.tsx"),
    source("app/publication-review/migration-wave-merge-form.tsx"),
    source("app/publication-review/migration-wave-15/export/route.ts"),
    source("app/data/legacy-migration-wave-15.ts"),
    source("content/legacy-migration-wave-15.json"),
    source("app/publication-review/page.tsx"),
    source("app/publication-review/migration-wave-14/page.tsx"),
    source("app/sitemap.ts"),
    source("docs/legacy-content-migration.md"),
    source("package.json"),
  ]);
  assert.match(page, /HOMEPAGE_REVIEW_MODE !== "private"/);
  assert.match(page, /requireChatGPTUser\("\/publication-review\/migration-wave-15"\)/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(page, /all seventy-nine earlier decisions/);
  assert.match(page, /labels and paths are observed archive metadata/);
  assert.match(page, /not proof that SSKEMS authored the material/);
  assert.match(page, /operated or belonged to an organisation called Open School/);
  assert.match(page, /maintained an institute under that name/);
  assert.match(page, /may be old theme or demonstration content/);
  assert.match(page, /Preserve ‘Open School’s Institut’ and ‘Open School’s Institut Constructivism’ as immutable source labels/);
  assert.match(page, /Do not silently correct ‘Institut’/);
  assert.match(page, /infer that ‘Constructivism’ describes SSKEMS teaching practice/);
  assert.match(page, /merge the records solely because their labels are similar/);
  assert.match(page, /do not establish a relationship with the current CBSE School, Junior College, Shree Samarth Krupa Institute, JEE\/NEET programme/);
  assert.match(page, /Do not redirect or merge them into `\/institute`, `\/programmes\/jee-neet`, About, Academics or News merely to avoid a 404/);
  assert.match(page, /No route, destination, merge, corrected title, institutional relationship, pedagogy claim, canonical or noindex treatment, or content decision is preselected/);
  assert.match(page, /contains no post bodies, excerpts, author or user records, programme descriptions, teaching-method claims, links, media, captions, comments/);
  assert.match(page, /Any underlying identities or assets remain subject to separate evidence, privacy, consent and rights review/);
  assert.match(workspace, /No archived copy is approved or published/);
  assert.match(workspace, /No route treatment is preselected/);
  assert.match(workspace, /no legacy source content/);
  assert.match(form, /Promise\.all\(\[waveFile\.text\(\), masterFile\.text\(\)\]\)/);
  assert.match(form, /URL\.createObjectURL\(new Blob/);
  assert.doesNotMatch(`${page}\n${workspace}\n${form}`, /\bfetch\s*\(|FormData|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|\bcaches\b|document\.cookie|serviceWorker|use server/);
  assert.match(exportRoute, /requireChatGPTUser\("\/publication-review\/migration-wave-15\/export"\)/);
  assert.match(exportRoute, /"cache-control": "private, no-store"/);
  assert.match(exportRoute, /"x-content-type-options": "nosniff"/);
  assert.match(dataModule, /allowedAreas: \["news"\]/);
  assert.match(dataModule, /allowedSourceKinds: \["post"\]/);
  assert.match(dataModule, /allowedSourceStatuses: \["publish"\]/);
  assert.match(dataModule, /prerequisiteWaves: \[[\s\S]*legacyMigrationWave1,[\s\S]*legacyMigrationWave2,[\s\S]*legacyMigrationWave3,[\s\S]*legacyMigrationWave4,[\s\S]*legacyMigrationWave5,[\s\S]*legacyMigrationWave6,[\s\S]*legacyMigrationWave7,[\s\S]*legacyMigrationWave8,[\s\S]*legacyMigrationWave9,[\s\S]*legacyMigrationWave10,[\s\S]*legacyMigrationWave11,[\s\S]*legacyMigrationWave12,[\s\S]*legacyMigrationWave13,[\s\S]*legacyMigrationWave14,[\s\S]*\]/);
  assert.match(dataModule, /requireRouteDecisions: true/);
  assert.doesNotMatch(dataModule, /requireMappedRoutes: true/);
  for (const review of requiredOpenSchoolPostReviews) assert.match(dataModule, new RegExp(`"${review}"`));
  assert.match(dashboard, /href="\/publication-review\/migration-wave-15"/);
  assert.match(wave14Page, /href: "\/publication-review\/migration-wave-15"/);
  assert.doesNotMatch(sitemap, /migration-wave-15/);
  assert.match(guide, /successful browser-only merge carries 81 decisions/);
  assert.match(guide, /leaving 34 content decisions and 34 route decisions/);
  assert.match(guide, /Packetization does not record a decision, establish an institutional relationship, approve a pedagogy claim, implement a route or authorize publication/);
  assert.equal(packageJson.match(/tests\/legacy-migration-wave-15\.test\.mjs/g)?.length, 2);
  assert.doesNotMatch(`${page}\n${dataModule}\n${exportRoute}\n${manifest}`, /<img\b|<video\b|<iframe\b|data:image|data:video|\.(?:jpe?g|png|webp|gif|mp4|webm)\b|source-html|source-wordpress|SSKEMS-BACKUP|[A-Za-z]:\\\\|\/Users\//i);
});
