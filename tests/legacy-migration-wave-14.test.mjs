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
  "migration-4689dcb558446b24",
  "migration-8bf75cee176a56a6",
  "migration-2af317ff60b9a55e",
];
const requiredMealPostReviews = [
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
    ...Array.from({ length: 14 }, (_, index) => json(`content/legacy-migration-wave-${index + 1}.json`)),
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

test("defines Wave 14 as three public meal-themed legacy news posts", async () => {
  const { matrix, waves } = await fixtures();
  const wave14 = waves[13];
  assert.deepEqual(validateLegacyContentMigrationMatrix(matrix), []);
  assert.deepEqual(wave14.recordIds, expectedRecordIds);
  assert.deepEqual(wave14.prerequisiteWaveIds, waves.slice(0, 13).map((wave) => wave.waveId));
  assert.equal(new Set(waves.flatMap((wave) => wave.recordIds)).size, 79);
  assert.deepEqual(Object.values(wave14.policy), [false, false, false, false]);

  const recordsById = new Map(matrix.records.map((record) => [record.id, record]));
  const records = wave14.recordIds.map((recordId) => recordsById.get(recordId));
  assert.ok(records.every(Boolean));
  assert.deepEqual(records.map((record) => record.label), [
    "Cinnamon Pancakes Served with Syrup",
    "Lunch with Sandwich",
    "Sesame butterflied Chicken",
  ]);
  assert.deepEqual(records.map((record) => record.legacyPath), [
    "/2017/02/24/cinnamon-pancakes-served-with-syrup-2",
    "/2017/02/24/cinnamon-pancakes-served-with-syrup",
    "/2017/02/24/sesame-butterflied-chicken",
  ]);
  assert.ok(records.every((record) => record.sourceKind === "post"));
  assert.ok(records.every((record) => record.sourceVisibility === "public"));
  assert.ok(records.every((record) => record.sourceStatus === "publish"));
  assert.ok(records.every((record) => record.area === "news"));
  assert.ok(records.every((record) => record.sourceModifiedOn?.startsWith("2017-02-24")));
  assert.ok(records.every((record) => record.identityProtected === false));
  assert.ok(records.every((record) => record.routeContinuity.status === "decision-required"));
  assert.ok(records.every((record) => record.routeContinuity.action === "unselected"));
  assert.ok(records.every((record) => record.routeContinuity.targetPath === null));
  assert.ok(records.every((record) => record.contentDecision.decision === "unselected"));
  assert.ok(records.every((record) => record.implementationStatus === "not-started"));
  assert.ok(records.every((record) => record.publicationEligible === false));
  assert.ok(records.every((record) => record.publicationReason === "decision-and-approval-required"));
  for (const record of records) assert.deepEqual(record.requiredReviews, requiredMealPostReviews);

  const packetizedIds = new Set(waves.flatMap((wave) => wave.recordIds));
  const sameDayNewsPosts = matrix.records.filter((record) => (
    record.sourceKind === "post"
    && record.area === "news"
    && record.sourceModifiedOn?.startsWith("2017-02-24")
  ));
  assert.equal(sameDayNewsPosts.length, 3);
  assert.deepEqual(matrix.records
    .filter((record) => sameDayNewsPosts.some((candidate) => candidate.id === record.id) && !packetizedIds.has(record.id))
    .map((record) => record.id), []);
  assert.doesNotMatch(JSON.stringify(wave14), /source-html|source-wordpress|SSKEMS-BACKUP|[A-Za-z]:\\\\|\/Users\//i);
});
test("exports only three digest-bound Wave 14 rows with no proposed decisions or post-content fields", async () => {
  const { matrix, waves } = await fixtures();
  const wave14 = waves[13];
  const csv = await legacyContentMigrationWaveCsv(matrix, wave14.recordIds);
  const lines = csv.replace(/^\uFEFF/, "").split("\r\n").filter(Boolean);
  assert.equal(lines.length, 4);
  assert.equal(lines[0], legacyMigrationDecisionWorksheetHeaders.map((value) => `"${value}"`).join(","));
  for (const recordId of expectedRecordIds) assert.match(csv, new RegExp(`"${recordId}"`));
  const parsed = parseLegacyMigrationDecisionCsv(csv);
  assert.equal(parsed.error, false);
  const [header, ...rows] = parsed.rows;
  assert.equal(rows.length, 3);
  const proposedStart = header.indexOf("proposed_route_action");
  assert.ok(rows.every((row) => row.slice(proposedStart).every((value) => value === "")));
  for (const forbiddenHeader of [
    "post_title",
    "post_body",
    "post_excerpt",
    "recipe",
    "ingredients",
    "preparation_steps",
    "dietary_information",
    "allergen_information",
    "nutrition_information",
    "source_content",
    "media_url",
    "caption",
    "author_name",
    "user_id",
    "student_name",
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

test("requires the complete cumulative Wave 1 through Wave 13 master", async () => {
  const { matrix, waves } = await fixtures();
  const wave14 = waves[13];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const prerequisiteRecordIds = waves.slice(0, 13).flatMap((wave) => wave.recordIds);
  const [masterCsv, wave14Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave14.recordIds),
  ]);
  const wave14Csv = completeWaveWorksheet(wave14Template, matrix, reviewedOn);
  const blankPlan = await mergeWave({ matrix, wave: wave14, waveName: "Wave 14", waveCsv: wave14Csv, masterCsv, prerequisiteRecordIds, now });
  assert.equal(blankPlan.status, "blocked");
  assert.equal(blankPlan.mergedCsv, null);
  assert.equal(blankPlan.summary.prerequisiteRecordsPresent, 0);
  assert.equal(blankPlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 76);

  const throughWave12 = await mergeThrough({ matrix, waves, count: 12, reviewedOn, now });
  const incompletePlan = await mergeWave({
    matrix,
    wave: wave14,
    waveName: "Wave 14",
    waveCsv: wave14Csv,
    masterCsv: throughWave12.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(incompletePlan.status, "blocked");
  assert.equal(incompletePlan.summary.prerequisiteRecordsPresent, 71);
  assert.equal(incompletePlan.issues.filter((issue) => issue.code === "prerequisite-decision-missing").length, 5);
});

test("merges Wave 14 after all prior waves without changing any earlier row", async () => {
  const { matrix, waves } = await fixtures();
  const wave14 = waves[13];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const throughWave13 = await mergeThrough({ matrix, waves, count: 13, reviewedOn, now });
  const prerequisiteRecordIds = throughWave13.prerequisiteRecordIds;
  const beforeRows = parseLegacyMigrationDecisionCsv(throughWave13.masterCsv).rows;
  const header = beforeRows[0];
  const recordColumn = header.indexOf("record_id");
  const previousRows = new Map(beforeRows.slice(1)
    .filter((row) => prerequisiteRecordIds.includes(row[recordColumn]))
    .map((row) => [row[recordColumn], [...row]]));
  const previousOrder = beforeRows.slice(1).map((row) => row[recordColumn]);
  const wave14Template = await legacyContentMigrationWaveCsv(matrix, wave14.recordIds);
  const wave14Plan = await mergeWave({
    matrix,
    wave: wave14,
    waveName: "Wave 14",
    waveCsv: completeWaveWorksheet(wave14Template, matrix, reviewedOn),
    masterCsv: throughWave13.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(wave14Plan.status, "ready-for-download", JSON.stringify(wave14Plan.issues));
  assert.equal(wave14Plan.summary.acceptedWaveRecords, 3);
  assert.equal(wave14Plan.summary.prerequisiteRecordsRequired, 76);
  assert.equal(wave14Plan.summary.prerequisiteRecordsPresent, 76);
  assert.equal(wave14Plan.summary.masterRecords, 115);
  assert.equal(wave14Plan.summary.carriedContentDecisions, 79);
  assert.equal(wave14Plan.summary.remainingContentDecisions, 36);
  assert.equal(wave14Plan.summary.remainingRouteDecisions, 36);
  assert.ok(wave14Plan.mergedCsv);
  const afterRows = parseLegacyMigrationDecisionCsv(wave14Plan.mergedCsv).rows.slice(1);
  assert.deepEqual(afterRows.map((row) => row[recordColumn]), previousOrder);
  for (const recordId of prerequisiteRecordIds) {
    assert.deepEqual(afterRows.find((row) => row[recordColumn] === recordId), previousRows.get(recordId));
  }
  assert.ok(Object.values(wave14Plan.guardrails).every((value) => value === false));

  const canonicalPlan = await createLegacyMigrationDecisionPlan({ csv: wave14Plan.mergedCsv, matrix, now });
  const decidedIds = new Set([...prerequisiteRecordIds, ...wave14.recordIds]);
  assert.ok(canonicalPlan.issues.every((issue) => !issue.row || !decidedIds.has(afterRows[issue.row - 2]?.[recordColumn])));
});

test("blocks altered prerequisites, conflicting decisions and unsafe Wave 14 input", async () => {
  const { matrix, waves } = await fixtures();
  const wave14 = waves[13];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const throughWave13 = await mergeThrough({ matrix, waves, count: 13, reviewedOn, now });
  const prerequisiteRecordIds = throughWave13.prerequisiteRecordIds;
  const wave14Template = await legacyContentMigrationWaveCsv(matrix, wave14.recordIds);
  const wave14Csv = completeWaveWorksheet(wave14Template, matrix, reviewedOn);

  const alteredRows = parseLegacyMigrationDecisionCsv(throughWave13.masterCsv).rows;
  const alteredHeader = alteredRows[0];
  const firstWave13PrerequisiteRow = alteredRows.find((row) => row[alteredHeader.indexOf("record_id")] === waves[12].recordIds[0]);
  firstWave13PrerequisiteRow[alteredHeader.indexOf("proposed_content_decision")] = " ";
  const alteredPlan = await mergeWave({
    matrix,
    wave: wave14,
    waveName: "Wave 14",
    waveCsv: wave14Csv,
    masterCsv: serializeLegacyMigrationDecisionCsv(alteredRows),
    prerequisiteRecordIds,
    now,
  });
  assert.equal(alteredPlan.status, "blocked");
  assert.ok(alteredPlan.issues.some((issue) => issue.source === "decision-contract" && issue.code === "content-decision-missing"));

  const conflictRows = parseLegacyMigrationDecisionCsv(throughWave13.masterCsv).rows;
  const conflictHeader = conflictRows[0];
  const firstWave14Row = conflictRows.find((row) => row[conflictHeader.indexOf("record_id")] === wave14.recordIds[0]);
  firstWave14Row[conflictHeader.indexOf("proposed_route_action")] = "retire";
  firstWave14Row[conflictHeader.indexOf("proposed_content_decision")] = "archive";
  const conflictPlan = await mergeWave({
    matrix,
    wave: wave14,
    waveName: "Wave 14",
    waveCsv: wave14Csv,
    masterCsv: serializeLegacyMigrationDecisionCsv(conflictRows),
    prerequisiteRecordIds,
    now,
  });
  assert.equal(conflictPlan.status, "blocked");
  assert.ok(conflictPlan.issues.some((issue) => issue.code === "wave-decision-conflict"));

  const unsafeRows = parseLegacyMigrationDecisionCsv(wave14Csv).rows;
  const unsafeHeader = unsafeRows[0];
  const column = Object.fromEntries(unsafeHeader.map((name, index) => [name, index]));
  unsafeRows[1][column.proposed_route_action] = "";
  unsafeRows[1][column.proposed_owner_role] = "named-editor";
  unsafeRows[2][column.proposed_route_target] = unsafeRows[2][column.legacy_path];
  unsafeRows[2][column.proposed_reason_code] = "=SUM(1,1)";
  unsafeRows[3][column.proposed_reviewed_on] = "2999-12-31";
  const unsafePlan = await mergeWave({
    matrix,
    wave: wave14,
    waveName: "Wave 14",
    waveCsv: serializeLegacyMigrationDecisionCsv(unsafeRows),
    masterCsv: throughWave13.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  const unsafeCodes = new Set(unsafePlan.issues.map((issue) => issue.code));
  assert.equal(unsafePlan.status, "blocked");
  for (const code of ["route-decision-missing", "route-target-invalid", "formula-like-input", "owner-role-invalid", "review-date-invalid"]) {
    assert.ok(unsafeCodes.has(code), `Expected ${code}`);
  }

  const staleRows = parseLegacyMigrationDecisionCsv(wave14Csv).rows;
  const staleHeader = staleRows[0];
  staleRows[1][staleHeader.indexOf("source_digest")] = "0".repeat(64);
  const stalePlan = await mergeWave({
    matrix,
    wave: wave14,
    waveName: "Wave 14",
    waveCsv: serializeLegacyMigrationDecisionCsv(staleRows),
    masterCsv: throughWave13.masterCsv,
    prerequisiteRecordIds,
    now,
  });
  assert.equal(stalePlan.status, "blocked");
  assert.ok(stalePlan.issues.some((issue) => issue.code === "wave-binding-stale"));
});

test("blocks invalid cumulative Wave 14 prerequisite sets", async () => {
  const { matrix, waves } = await fixtures();
  const wave14 = waves[13];
  const now = new Date().toISOString();
  const reviewedOn = now.slice(0, 10);
  const [masterCsv, wave14Template] = await Promise.all([
    legacyContentMigrationCsv(matrix),
    legacyContentMigrationWaveCsv(matrix, wave14.recordIds),
  ]);
  const wave14Csv = completeWaveWorksheet(wave14Template, matrix, reviewedOn);
  const base = waves.slice(0, 13).flatMap((wave) => wave.recordIds);
  for (const invalidPrerequisiteRecordIds of [
    [...base, waves[0].recordIds[0]],
    [...base, "migration-0000000000000000"],
    [...base, wave14.recordIds[0]],
  ]) {
    const plan = await mergeWave({
      matrix,
      wave: wave14,
      waveName: "Wave 14",
      waveCsv: wave14Csv,
      masterCsv,
      prerequisiteRecordIds: invalidPrerequisiteRecordIds,
      now,
    });
    assert.equal(plan.status, "blocked");
    assert.ok(plan.issues.some((issue) => issue.code === "prerequisite-record-invalid"));
  }
});

test("ships Wave 14 as an authenticated noindex browser-only meal-post review workspace", async () => {
  const [page, workspace, form, exportRoute, dataModule, manifest, dashboard, wave13Page, sitemap, guide, packageJson] = await Promise.all([
    source("app/publication-review/migration-wave-14/page.tsx"),
    source("app/publication-review/migration-wave-workspace.tsx"),
    source("app/publication-review/migration-wave-merge-form.tsx"),
    source("app/publication-review/migration-wave-14/export/route.ts"),
    source("app/data/legacy-migration-wave-14.ts"),
    source("content/legacy-migration-wave-14.json"),
    source("app/publication-review/page.tsx"),
    source("app/publication-review/migration-wave-13/page.tsx"),
    source("app/sitemap.ts"),
    source("docs/legacy-content-migration.md"),
    source("package.json"),
  ]);
  assert.match(page, /HOMEPAGE_REVIEW_MODE !== "private"/);
  assert.match(page, /requireChatGPTUser\("\/publication-review\/migration-wave-14"\)/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(page, /all seventy-six earlier decisions/);
  assert.match(page, /labels and slugs are observed archive metadata/);
  assert.match(page, /not proof that the school authored the material, served the named food, operated a meal or nutrition programme, published a menu/);
  assert.match(page, /dietary, ingredient, allergen, nutrition, health or food-safety claim/);
  assert.match(page, /may be old theme or demonstration content/);
  assert.match(page, /record labelled .*Lunch with Sandwich.* uses a cinnamon-pancakes legacy slug/);
  assert.match(page, /Preserve .*Sesame butterflied Chicken.* as the bound source label/);
  assert.match(page, /requires an evidence-backed rewrite rather than a silent metadata change/);
  assert.match(page, /Wave 13 \`\/category\/lunch\` index decision does not decide, approve or publish these posts/);
  assert.match(page, /decisions here do not decide the category route or its membership/);
  assert.match(page, /Do not redirect to Home, News or another generic page merely to avoid a 404/);
  assert.match(page, /No route, destination, merge, corrected title, school attribution, meal claim, canonical or noindex treatment, or content decision is preselected/);
  assert.match(page, /contains no post bodies, excerpts, author or user records, recipes, ingredient or allergen details, nutrition information/);
  assert.match(page, /Any underlying identities or assets remain subject to separate evidence, privacy, consent and rights review/);
  assert.match(workspace, /No archived copy is approved or published/);
  assert.match(workspace, /No route treatment is preselected/);
  assert.match(workspace, /no legacy source content/);
  assert.match(form, /Promise\.all\(\[waveFile\.text\(\), masterFile\.text\(\)\]\)/);
  assert.match(form, /URL\.createObjectURL\(new Blob/);
  assert.doesNotMatch(`${page}\n${workspace}\n${form}`, /\bfetch\s*\(|FormData|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|\bcaches\b|document\.cookie|serviceWorker|use server/);
  assert.match(exportRoute, /requireChatGPTUser\("\/publication-review\/migration-wave-14\/export"\)/);
  assert.match(exportRoute, /"cache-control": "private, no-store"/);
  assert.match(exportRoute, /"x-content-type-options": "nosniff"/);
  assert.match(dataModule, /allowedAreas: \["news"\]/);
  assert.match(dataModule, /allowedSourceKinds: \["post"\]/);
  assert.match(dataModule, /allowedSourceStatuses: \["publish"\]/);
  assert.match(dataModule, /prerequisiteWaves: \[[\s\S]*legacyMigrationWave1,[\s\S]*legacyMigrationWave2,[\s\S]*legacyMigrationWave3,[\s\S]*legacyMigrationWave4,[\s\S]*legacyMigrationWave5,[\s\S]*legacyMigrationWave6,[\s\S]*legacyMigrationWave7,[\s\S]*legacyMigrationWave8,[\s\S]*legacyMigrationWave9,[\s\S]*legacyMigrationWave10,[\s\S]*legacyMigrationWave11,[\s\S]*legacyMigrationWave12,[\s\S]*legacyMigrationWave13,[\s\S]*\]/);
  assert.match(dataModule, /requireRouteDecisions: true/);
  assert.doesNotMatch(dataModule, /requireMappedRoutes: true/);
  for (const review of requiredMealPostReviews) assert.match(dataModule, new RegExp(`"${review}"`));
  assert.match(dashboard, /href="\/publication-review\/migration-wave-14"/);
  assert.match(wave13Page, /href: "\/publication-review\/migration-wave-14"/);
  assert.doesNotMatch(sitemap, /migration-wave-14/);
  assert.match(guide, /successful browser-only merge carries 79 decisions/);
  assert.match(guide, /leaving 36 content decisions and 36 route decisions/);
  assert.match(guide, /Packetization does not record a decision, establish school authorship, approve a food-related claim, implement a route or authorize publication/);
  assert.equal(packageJson.match(/tests\/legacy-migration-wave-14\.test\.mjs/g)?.length, 2);
  assert.doesNotMatch(`${page}\n${dataModule}\n${exportRoute}\n${manifest}`, /<img\b|<video\b|<iframe\b|data:image|data:video|\.(?:jpe?g|png|webp|gif|mp4|webm)\b|source-html|source-wordpress|SSKEMS-BACKUP|[A-Za-z]:\\\\|\/Users\//i);
});
