import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { auditLegacyContentMigrationMatrix } from "../lib/legacy-content-migration-audit.mjs";
import {
  legacyContentMigrationCsv,
  legacyContentMigrationSummary,
  validateLegacyContentMigrationMatrix,
} from "../lib/legacy-content-migration.ts";

const projectRoot = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, projectRoot), "utf8");
}

test("accounts for every archived content record without treating it as migrated", async () => {
  const { matrix, issues, summary } = await auditLegacyContentMigrationMatrix();
  assert.deepEqual(issues, []);
  assert.equal(matrix.archive.id, "SSKEMS-BACKUP-2026-08-29");
  assert.equal(matrix.archive.expectedRecords, 115);
  assert.equal(summary.total, 115);
  assert.equal(summary.publicRecords, 108);
  assert.equal(summary.privateRecords, 7);
  assert.equal(summary.routeImplemented, 35);
  assert.equal(summary.routeDecided, 35);
  assert.equal(summary.routeDecisionRequired, 80);
  assert.equal(summary.publicRouteDecisionRequired, 73);
  assert.equal(summary.contentDecided, 0);
  assert.equal(summary.verified, 0);
  assert.equal(summary.completionReady, false);
  assert.deepEqual(summary.byKind, {
    page: 50,
    post: 21,
    category: 4,
    post_format: 1,
    sk_igallery: 30,
    teacher: 6,
    user: 3,
  });

  for (const record of matrix.records) {
    assert.equal(record.contentDecision.decision, "unselected");
    assert.equal(record.implementationStatus, "not-started");
    assert.equal(record.publicationEligible, false);
    assert.equal(record.publicationReason, "decision-and-approval-required");
  }
});

test("reconciles the exact 35-route cutover register separately from content decisions", async () => {
  const { matrix } = await auditLegacyContentMigrationMatrix();
  const cutover = JSON.parse(await source("content/legacy-cutover-inventory.json"));
  const imported = matrix.records.filter((record) => record.routeContinuity.status === "implemented");
  assert.equal(imported.length, 35);
  assert.deepEqual(
    new Set(imported.map((record) => record.routeContinuity.cutoverRecordId)),
    new Set(cutover.records.map((record) => record.id)),
  );
  assert.ok(imported.every((record) => ["retain", "redirect"].includes(record.routeContinuity.action)));
  assert.ok(imported.every((record) => record.contentDecision.decision === "unselected"));
});

test("keeps drafts, identities, source paths, and archive contents outside the repository matrix", async () => {
  const { matrix } = await auditLegacyContentMigrationMatrix();
  const protectedRecords = matrix.records.filter((record) => record.identityProtected);
  assert.equal(protectedRecords.length, 16);
  for (const record of protectedRecords) {
    assert.equal(record.legacyPath, null);
    assert.match(record.label, /^(?:Private|Identity-bearing) (?:page|post|teacher|user) record$/);
  }
  const serialized = JSON.stringify(matrix);
  assert.doesNotMatch(serialized, /source_url|content_file|source-html|source-wordpress|SSKEMS-BACKUP[\\/]|[A-Za-z]:\\|\/Users\//i);
  assert.doesNotMatch(serialized, /@sskemschool|approvedBy|evidenceReferences/i);
});

test("rejects preselected decisions, identity leaks, unsafe publication, and unknown fields", async () => {
  const { matrix } = await auditLegacyContentMigrationMatrix();
  const unsafe = structuredClone(matrix);
  unsafe.policy.decisionsPreselected = true;
  unsafe.records[0].unexpected = "silent typo";
  unsafe.records[0].contentDecision.targetPath = "/about";
  unsafe.records[0].publicationEligible = true;
  const protectedIndex = unsafe.records.findIndex((record) => record.identityProtected);
  unsafe.records[protectedIndex].legacyPath = "/private-person";
  unsafe.records[1].id = unsafe.records[0].id;
  const publicOpenIndex = unsafe.records.findIndex((record, index) => index > 1 && !record.identityProtected && record.routeContinuity.status === "decision-required");
  unsafe.records[publicOpenIndex].routeContinuity = { status: "planned", action: "redirect", targetPath: "/wp-admin", cutoverRecordId: null };
  unsafe.records[publicOpenIndex].contentDecision = {
    decision: "rewrite",
    targetPath: "/wp-admin",
    mergeIntoRecordId: null,
    rationale: "replace-with-current-information",
    ownerRole: "content-editor",
    reviewedOn: "2026-09-08",
  };

  const codes = new Set(validateLegacyContentMigrationMatrix(unsafe).map((issue) => issue.code));
  for (const code of ["unsafe-policy", "unknown-field", "preselected-content", "unsafe-publication", "premature-publication", "private-path", "duplicate-id", "route-target", "planned-route-target", "decision-target", "required-content-target"]) {
    assert.ok(codes.has(code), `Expected ${code}`);
  }
});

test("exports one formula-safe public-metadata worksheet without persisting a decision", async () => {
  const { matrix } = await auditLegacyContentMigrationMatrix();
  const csv = await legacyContentMigrationCsv(matrix);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.equal(csv.trim().split(/\r?\n/).length, 116);
  assert.match(csv, /"expected_matrix_digest","record_id","expected_record_digest","source_reference","source_digest","label"/);
  assert.match(csv, /"unselected"/);
  assert.doesNotMatch(csv, /source-html|source-wordpress|SSKEMS-BACKUP[\\/]|[A-Za-z]:\\|\/Users\//i);
  assert.deepEqual(legacyContentMigrationSummary(matrix).verified, 0);

  const formulaMatrix = structuredClone(matrix);
  const formulaRecord = formulaMatrix.records.find((record) => !record.identityProtected);
  formulaRecord.label = "\t＝HYPERLINK formula";
  const formulaCsv = await legacyContentMigrationCsv(formulaMatrix);
  assert.match(formulaCsv, /"'\t＝HYPERLINK formula"/);
});

test("ships an authenticated noindex workspace, guarded export, commands, and dashboard entry", async () => {
  const [page, exportRoute, dashboard, packageText, guide, schemaText, auditScript] = await Promise.all([
    source("app/publication-review/migration-matrix/page.tsx"),
    source("app/publication-review/migration-matrix-export/route.ts"),
    source("app/publication-review/page.tsx"),
    source("package.json"),
    source("docs/legacy-content-migration.md"),
    source("content/legacy-content-migration-matrix.schema.json"),
    source("scripts/audit-legacy-content-migration.mjs"),
  ]);
  const packageJson = JSON.parse(packageText);
  const schema = JSON.parse(schemaText);

  assert.match(page, /HOMEPAGE_REVIEW_MODE !== "private"/);
  assert.match(page, /requireChatGPTUser\("\/publication-review\/migration-matrix"\)/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(page, /method="get"/);
  assert.match(page, /Download safe CSV worksheet/);
  assert.match(exportRoute, /cache-control": "private, no-store"/);
  assert.match(exportRoute, /requireChatGPTUser\("\/publication-review\/migration-matrix-export"\)/);
  assert.match(dashboard, /href="\/publication-review\/migration-matrix"/);
  assert.match(packageJson.scripts["migration:matrix:audit"], /audit-legacy-content-migration/);
  assert.match(packageJson.scripts["migration:matrix:release"], /--release/);
  assert.match(packageJson.scripts.prebuild, /migration:matrix:audit.*release:audit/);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.records.minItems, 115);
  assert.match(guide, /route continuity is not content migration/i);
  assert.doesNotMatch(auditScript, /\b(?:writeFile|appendFile|rename|unlink|rm|mkdir)\s*\(/);
});
