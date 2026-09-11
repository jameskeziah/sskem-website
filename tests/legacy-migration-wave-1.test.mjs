import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  legacyContentMigrationWaveCsv,
  legacyMigrationDecisionWorksheetHeaders,
  validateLegacyContentMigrationMatrix,
} from "../lib/legacy-content-migration.ts";

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
  assert.deepEqual(Object.values(wave.policy), [false, false, false, false]);
  assert.equal(schema.additionalProperties, false);
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

test("ships Wave 1 as a private noindex download-only decision workspace", async () => {
  const [page, exportRoute, dataModule, dashboard, sitemap, guide] = await Promise.all([
    source("app/publication-review/migration-wave-1/page.tsx"),
    source("app/publication-review/migration-wave-1/export/route.ts"),
    source("app/data/legacy-migration-wave-1.ts"),
    source("app/publication-review/page.tsx"),
    source("app/sitemap.ts"),
    source("docs/legacy-content-migration.md"),
  ]);
  assert.match(page, /HOMEPAGE_REVIEW_MODE !== "private"/);
  assert.match(page, /requireChatGPTUser\("\/publication-review\/migration-wave-1"\)/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(page, /No archived copy is approved or published/);
  assert.doesNotMatch(page, /\bfetch\s*\(|FormData|localStorage|sessionStorage|use server/);
  assert.match(exportRoute, /requireChatGPTUser\("\/publication-review\/migration-wave-1\/export"\)/);
  assert.match(exportRoute, /"cache-control": "private, no-store"/);
  assert.match(exportRoute, /legacyMigrationWave1WorksheetCsv\(\)/);
  assert.match(dataModule, /contentDecision\.decision !== "unselected"/);
  assert.match(dataModule, /implementationStatus !== "not-started"/);
  assert.match(dashboard, /href="\/publication-review\/migration-wave-1"/);
  assert.doesNotMatch(sitemap, /migration-wave-1/);
  assert.match(guide, /existing intake remains the authoritative validator/i);
});
