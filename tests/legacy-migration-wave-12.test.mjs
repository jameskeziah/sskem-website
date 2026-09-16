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
  "migration-dff685d52f8e1907",
  "migration-1541dd1a501d62d7",
];
const requiredStudentHealthReviews = [
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
    ...Array.from({ length: 12 }, (_, index) => json(`content/legacy-migration-wave-${index + 1}.json`)),
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

test("defines Wave 12 as two student-health galleries with evidence and data-protection gates", async () => {
  const { matrix, waves } = await fixtures();
  const wave12 = waves[11];
  assert.deepEqual(validateLegacyContentMigrationMatrix(matrix), []);
  assert.deepEqual(wave12.recordIds, expectedRecordIds);
  assert.deepEqual(wave12.prerequisiteWaveIds, waves.slice(0, 11).map((wave) => wave.waveId));
  assert.equal(new Set(waves.slice(0, 12).flatMap((wave) => wave.recordIds)).size, 71);
  assert.deepEqual(Object.values(wave12.policy), [false, false, false, false]);

  const recordsById = new Map(matrix.records.map((record) => [record.id, record]));
  const records = wave12.recordIds.map((recordId) => recordsById.get(recordId));
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
  for (const record of records) assert.deepEqual(record.requiredReviews, requiredStudentHealthReviews);

  const packetizedGalleryIds = new Set(waves.slice(0, 12).flatMap((wave) => wave.recordIds));
  assert.equal(matrix.records.filter((record) => record.sourceKind === "sk_igallery").length, 30);
  const remainingGalleryIds = matrix.records
    .filter((record) => record.sourceKind === "sk_igallery" && !packetizedGalleryIds.has(record.id))
    .map((record) => record.id);
  assert.deepEqual(remainingGalleryIds, []);
  assert.doesNotMatch(JSON.stringify(wave12), /source-html|source-wordpress|SSKEMS-BACKUP|[A-Za-z]:\\\\|\/Users\//i);
});

test("exports only the two digest-bound Wave 12 rows with no proposed decisions or health-detail fields", async () => {
  const { matrix, waves } = await fixtures();
  const wave12 = waves[11];
  const csv = await legacyContentMigrationWaveCsv(matrix, wave12.recordIds);
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
    "student_name",
    "patient_name",
    "date_of_birth",
    "admission_number",
    "roll_number",
    "attendance",
    "medical_record",
    "health_status",
    "vaccination_status",
    "vaccine_name",
    "vaccine_dose",
    "diagnosis",
    "measurements",
    "test_results",
    "treatment",
    "certificate_number",
    "guardian_contact",
    "consent_reference",
    "assent_reference",
    "evidence_reference",
  ]) {
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

test("requires the complete cumulative Wave 1 through Wave 11 master", async () => {
  const { matrix, waves } = await fixtures();
  const wave12 = waves[11];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const prerequisiteRecordIds = waves.slice(0, 11).flatMap((wave) => wave.recordIds);
  const [masterCsv, wave12Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave12.recordIds),
  ]);
  const wave12Csv = completeWaveWorksheet(wave12Template, matrix, reviewedOn);
  const blankPlan = await mergeWave({ matrix, wave: wave12, waveName: "Wave 12", waveCsv: wave12Csv, masterCsv, prerequisiteRecordIds, now });
  assert.equal(blankPlan.status, "blocked");
  assert.equal(blankPlan.mergedCsv, null);
  assert.equal(blankPlan.summary.prerequisiteRecordsPresent, 0);
  assert.equal(blankPlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 69);

  const throughWave10 = await mergeThrough({ matrix, waves, count: 10, reviewedOn, now });
  const wave10OnlyPlan = await mergeWave({
    matrix,
    wave: wave12,
    waveName: "Wave 12",
    waveCsv: wave12Csv,
    masterCsv: throughWave10.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(wave10OnlyPlan.status, "blocked");
  assert.equal(wave10OnlyPlan.summary.prerequisiteRecordsPresent, 64);
  assert.equal(wave10OnlyPlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 5);
});

test("merges Wave 12 after all prior waves without changing any earlier row", async () => {
  const { matrix, waves } = await fixtures();
  const wave12 = waves[11];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const throughWave11 = await mergeThrough({ matrix, waves, count: 11, reviewedOn, now });
  const prerequisiteRecordIds = throughWave11.prerequisiteRecordIds;
  const beforeRows = parseLegacyMigrationDecisionCsv(throughWave11.masterCsv).rows;
  const header = beforeRows[0];
  const recordColumn = header.indexOf("record_id");
  const previousRows = new Map(beforeRows.slice(1)
    .filter((row) => prerequisiteRecordIds.includes(row[recordColumn]))
    .map((row) => [row[recordColumn], [...row]]));
  const previousOrder = beforeRows.slice(1).map((row) => row[recordColumn]);
  const wave12Template = await legacyContentMigrationWaveCsv(matrix, wave12.recordIds);
  const wave12Plan = await mergeWave({
    matrix,
    wave: wave12,
    waveName: "Wave 12",
    waveCsv: completeWaveWorksheet(wave12Template, matrix, reviewedOn),
    masterCsv: throughWave11.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(wave12Plan.status, "ready-for-download", JSON.stringify(wave12Plan.issues));
  assert.equal(wave12Plan.summary.acceptedWaveRecords, 2);
  assert.equal(wave12Plan.summary.prerequisiteRecordsRequired, 69);
  assert.equal(wave12Plan.summary.prerequisiteRecordsPresent, 69);
  assert.equal(wave12Plan.summary.masterRecords, 115);
  assert.equal(wave12Plan.summary.carriedContentDecisions, 71);
  assert.equal(wave12Plan.summary.remainingContentDecisions, 44);
  assert.equal(wave12Plan.summary.remainingRouteDecisions, 44);
  assert.ok(wave12Plan.mergedCsv);
  const afterRows = parseLegacyMigrationDecisionCsv(wave12Plan.mergedCsv).rows.slice(1);
  assert.deepEqual(afterRows.map((row) => row[recordColumn]), previousOrder);
  for (const recordId of prerequisiteRecordIds) {
    assert.deepEqual(afterRows.find((row) => row[recordColumn] === recordId), previousRows.get(recordId));
  }
  assert.ok(Object.values(wave12Plan.guardrails).every((value) => value === false));

  const canonicalPlan = await createLegacyMigrationDecisionPlan({ csv: wave12Plan.mergedCsv, matrix, now });
  const decidedIds = new Set([...prerequisiteRecordIds, ...wave12.recordIds]);
  assert.ok(canonicalPlan.issues.every((issue) => !issue.row || !decidedIds.has(afterRows[issue.row - 2]?.[recordColumn])));
});

test("blocks altered prerequisites, conflicting decisions and unsafe Wave 12 input", async () => {
  const { matrix, waves } = await fixtures();
  const wave12 = waves[11];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const throughWave11 = await mergeThrough({ matrix, waves, count: 11, reviewedOn, now });
  const prerequisiteRecordIds = throughWave11.prerequisiteRecordIds;
  const wave12Template = await legacyContentMigrationWaveCsv(matrix, wave12.recordIds);
  const wave12Csv = completeWaveWorksheet(wave12Template, matrix, reviewedOn);

  const alteredRows = parseLegacyMigrationDecisionCsv(throughWave11.masterCsv).rows;
  const alteredHeader = alteredRows[0];
  const firstWave11Row = alteredRows.find((row) => row[alteredHeader.indexOf("record_id")] === waves[10].recordIds[0]);
  firstWave11Row[alteredHeader.indexOf("proposed_content_decision")] = " ";
  const alteredPlan = await mergeWave({
    matrix,
    wave: wave12,
    waveName: "Wave 12",
    waveCsv: wave12Csv,
    masterCsv: serializeLegacyMigrationDecisionCsv(alteredRows),
    prerequisiteRecordIds,
    now,
  });
  assert.equal(alteredPlan.status, "blocked");
  assert.ok(alteredPlan.issues.some((issue) => issue.source === "decision-contract" && issue.code === "content-decision-missing"));

  const conflictRows = parseLegacyMigrationDecisionCsv(throughWave11.masterCsv).rows;
  const conflictHeader = conflictRows[0];
  const firstWave12Row = conflictRows.find((row) => row[conflictHeader.indexOf("record_id")] === wave12.recordIds[0]);
  firstWave12Row[conflictHeader.indexOf("proposed_route_action")] = "retire";
  firstWave12Row[conflictHeader.indexOf("proposed_content_decision")] = "archive";
  const conflictPlan = await mergeWave({
    matrix,
    wave: wave12,
    waveName: "Wave 12",
    waveCsv: wave12Csv,
    masterCsv: serializeLegacyMigrationDecisionCsv(conflictRows),
    prerequisiteRecordIds,
    now,
  });
  assert.equal(conflictPlan.status, "blocked");
  assert.ok(conflictPlan.issues.some((issue) => issue.code === "wave-decision-conflict"));

  const unsafeRows = parseLegacyMigrationDecisionCsv(wave12Csv).rows;
  const unsafeHeader = unsafeRows[0];
  const unsafeColumn = Object.fromEntries(unsafeHeader.map((name, index) => [name, index]));
  unsafeRows[1][unsafeColumn.proposed_route_action] = "";
  unsafeRows[1][unsafeColumn.proposed_owner_role] = "named-clinician";
  unsafeRows[2][unsafeColumn.proposed_route_target] = unsafeRows[2][unsafeColumn.legacy_path];
  unsafeRows[2][unsafeColumn.proposed_reason_code] = "=SUM(1,1)";
  unsafeRows[2][unsafeColumn.proposed_reviewed_on] = "2999-12-31";
  const unsafePlan = await mergeWave({
    matrix,
    wave: wave12,
    waveName: "Wave 12",
    waveCsv: serializeLegacyMigrationDecisionCsv(unsafeRows),
    masterCsv: throughWave11.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  const unsafeCodes = new Set(unsafePlan.issues.map((issue) => issue.code));
  assert.equal(unsafePlan.status, "blocked");
  for (const code of ["route-decision-missing", "route-target-invalid", "formula-like-input", "owner-role-invalid", "review-date-invalid"]) {
    assert.ok(unsafeCodes.has(code), `Expected ${code}`);
  }

  const staleRows = parseLegacyMigrationDecisionCsv(wave12Csv).rows;
  const staleHeader = staleRows[0];
  staleRows[1][staleHeader.indexOf("label")] = "Changed immutable label";
  const stalePlan = await mergeWave({
    matrix,
    wave: wave12,
    waveName: "Wave 12",
    waveCsv: serializeLegacyMigrationDecisionCsv(staleRows),
    masterCsv: throughWave11.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(stalePlan.status, "blocked");
  assert.ok(stalePlan.issues.some((issue) => issue.code === "wave-binding-stale"));
});

test("blocks invalid cumulative prerequisite sets", async () => {
  const { matrix, waves } = await fixtures();
  const wave12 = waves[11];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const [masterCsv, wave12Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave12.recordIds),
  ]);
  const wave12Csv = completeWaveWorksheet(wave12Template, matrix, reviewedOn);
  const base = waves.slice(0, 11).flatMap((wave) => wave.recordIds);
  for (const invalidPrerequisiteRecordIds of [
    [...base, waves[0].recordIds[0]],
    [...base, "migration-0000000000000000"],
    [...base, wave12.recordIds[0]],
  ]) {
    const plan = await mergeWave({
      matrix,
      wave: wave12,
      waveName: "Wave 12",
      waveCsv: wave12Csv,
      masterCsv,
      prerequisiteRecordIds: invalidPrerequisiteRecordIds,
      now,
    });
    assert.equal(plan.status, "blocked");
    assert.ok(plan.issues.some((issue) => issue.code === "prerequisite-record-invalid"));
  }
});

test("ships Wave 12 as an authenticated noindex browser-only student-health review workspace", async () => {
  const [page, workspace, form, exportRoute, dataModule, manifest, matrixBuilder, waveEngine, dashboard, wave11Page, sitemap, guide, packageJson] = await Promise.all([
    source("app/publication-review/migration-wave-12/page.tsx"),
    source("app/publication-review/migration-wave-workspace.tsx"),
    source("app/publication-review/migration-wave-merge-form.tsx"),
    source("app/publication-review/migration-wave-12/export/route.ts"),
    source("app/data/legacy-migration-wave-12.ts"),
    source("content/legacy-migration-wave-12.json"),
    source("scripts/build-legacy-content-migration-matrix.mjs"),
    source("app/data/legacy-migration-wave.ts"),
    source("app/publication-review/page.tsx"),
    source("app/publication-review/migration-wave-11/page.tsx"),
    source("app/sitemap.ts"),
    source("docs/legacy-content-migration.md"),
    source("package.json"),
  ]);
  assert.match(page, /HOMEPAGE_REVIEW_MODE !== "private"/);
  assert.match(page, /requireChatGPTUser\("\/publication-review\/migration-wave-12"\)/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(page, /all sixty-nine earlier decisions/);
  assert.match(page, /A legacy event label is unverified index metadata/);
  assert.match(page, /does not prove that a health service occurred as described/);
  assert.match(page, /legacy age range is historical event metadata, not current vaccination eligibility or public-health guidance/);
  assert.match(page, /Images of pupils in a healthcare context may reveal sensitive personal or health information/);
  assert.match(page, /Do not infer a pupil's attendance, health or vaccination status, eligibility, diagnosis, treatment, disability or medical history from a photograph/);
  assert.match(page, /Health-checkup wording does not establish provider credentials, screening performed, findings, diagnosis, treatment, outcome or recommendation/);
  assert.match(page, /vaccination wording does not establish vaccine type, dose, disease, uptake, completion, safety, efficacy or current immunisation status/);
  assert.match(page, /Consent to receive a health service is not consent to publish a pupil's identity, image or participation/);
  assert.match(page, /prefer aggregate event-level copy and non-identifying media/);
  assert.match(page, /Historic public availability or attendance is not current consent/);
  assert.match(page, /No health claim, provider identity, route, destination, merge or content decision is preselected/);
  assert.match(page, /identityProtected: false does not prove that an image contains no child or sensitive data, or that consent and rights exist/);
  assert.match(page, /contains no pupil names, dates of birth, classes, admission or roll identifiers, attendance lists, patient or vaccination status, measurements, diagnoses, clinical findings, test or treatment details, guardian contact details, registration or consent forms, certificates, clinical records, supporting evidence, private locations, asset metadata or source media/);
  assert.match(page, /Every eventual asset and caption still requires separate health-event evidence and media approval, exact-byte binding and activation before public release/);
  assert.match(page, /If evidence, consent, minimisation or retention requirements are missing, expired or withdrawn, the content remains unpublished/);
  assert.doesNotMatch(page, /healthy students|successfully vaccinated|medically cleared|currently eligible/i);
  assert.match(workspace, /No archived copy is approved or published/);
  assert.match(workspace, /No route treatment is preselected/);
  assert.match(workspace, /no legacy source content/);
  assert.match(form, /Promise\.all\(\[waveFile\.text\(\), masterFile\.text\(\)\]\)/);
  assert.match(form, /URL\.createObjectURL\(new Blob/);
  assert.doesNotMatch(`${page}\n${workspace}\n${form}`, /\bfetch\s*\(|FormData|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|\bcaches\b|document\.cookie|serviceWorker|use server/);
  assert.match(exportRoute, /requireChatGPTUser\("\/publication-review\/migration-wave-12\/export"\)/);
  assert.match(exportRoute, /"cache-control": "private, no-store"/);
  assert.match(exportRoute, /"x-content-type-options": "nosniff"/);
  assert.match(dataModule, /allowedAreas: \["media"\]/);
  assert.match(dataModule, /allowedSourceKinds: \["sk_igallery"\]/);
  assert.match(dataModule, /allowedSourceStatuses: \["public-index"\]/);
  assert.match(dataModule, /prerequisiteWaves: \[[\s\S]*legacyMigrationWave1,[\s\S]*legacyMigrationWave2,[\s\S]*legacyMigrationWave3,[\s\S]*legacyMigrationWave4,[\s\S]*legacyMigrationWave5,[\s\S]*legacyMigrationWave6,[\s\S]*legacyMigrationWave7,[\s\S]*legacyMigrationWave8,[\s\S]*legacyMigrationWave9,[\s\S]*legacyMigrationWave10,[\s\S]*legacyMigrationWave11,[\s\S]*\]/);
  assert.match(dataModule, /requireRouteDecisions: true/);
  assert.doesNotMatch(dataModule, /requireMappedRoutes: true/);
  for (const review of requiredStudentHealthReviews) assert.match(dataModule, new RegExp(`"${review}"`));
  assert.match(matrixBuilder, /row\.route_type === "sk_igallery"/);
  assert.match(matrixBuilder, /health\[\\s-\]\*check\|vaccination/);
  assert.match(waveEngine, /requireMappedRoutes && requireRouteDecisions/);
  assert.match(waveEngine, /requireRouteDecisions && record\.routeContinuity\.status !== "decision-required"/);
  assert.match(waveEngine, /requiredReviews\.some\(\(review\) => !record\.requiredReviews\.includes\(review\)\)/);
  assert.match(waveEngine, /record\.publicationEligible !== false/);
  assert.match(dashboard, /href="\/publication-review\/migration-wave-12"/);
  assert.match(wave11Page, /href: "\/publication-review\/migration-wave-12"/);
  assert.doesNotMatch(sitemap, /migration-wave-12/);
  assert.match(guide, /Images of pupils in a healthcare context may reveal sensitive personal or health information/);
  assert.match(guide, /successful browser-only merge carries 71 decisions/);
  assert.match(guide, /leaving 44 content decisions and 44 route decisions/);
  assert.match(guide, /packetization does not record a decision, satisfy a review, verify evidence, approve media, implement content or authorize publication/);
  assert.equal(packageJson.match(/tests\/legacy-migration-wave-12\.test\.mjs/g)?.length, 2);
  assert.doesNotMatch(`${page}\n${dataModule}\n${exportRoute}\n${manifest}`, /<img\b|<video\b|data:image|data:video|\.(?:jpe?g|png|webp|gif|mp4|webm)\b|source-html|source-wordpress|SSKEMS-BACKUP|[A-Za-z]:\\\\|\/Users\//i);
});
