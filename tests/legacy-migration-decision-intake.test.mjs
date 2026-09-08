import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { auditLegacyContentMigrationMatrix } from "../lib/legacy-content-migration-audit.mjs";
import {
  LEGACY_MIGRATION_DECISION_ACKNOWLEDGEMENT,
  LEGACY_MIGRATION_DECISION_MAX_BYTES,
  createLegacyMigrationDecisionPlan,
} from "../lib/legacy-migration-decision-intake.ts";
import {
  LEGACY_MIGRATION_APPLIED_MARKER_REPAIR_ACKNOWLEDGEMENT,
  executeLegacyMigrationDecisionUpdate,
  repairLegacyMigrationDecisionAppliedMarker,
} from "../lib/legacy-migration-decision-update.mjs";
import {
  legacyContentMigrationCsv,
  legacyContentMigrationSummary,
  migrationDecisionOwnerRoles,
  migrationDecisionReasonCodes,
  validateLegacyContentMigrationMatrix,
} from "../lib/legacy-content-migration.ts";

const projectRoot = new URL("../", import.meta.url);
const now = new Date().toISOString();
const reviewedOn = now.slice(0, 10);

async function source(relativePath) {
  return readFile(new URL(relativePath, projectRoot), "utf8");
}

function parseCsv(input) {
  const text = input.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"' && cell.length === 0) quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\r" || character === "\n") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function toCsv(rows) {
  const cell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}

async function completedWorksheet(matrix) {
  const rows = parseCsv(await legacyContentMigrationCsv(matrix));
  const headers = rows[0];
  const column = Object.fromEntries(headers.map((header, index) => [header, index]));
  const byId = new Map(matrix.records.map((record) => [record.id, record]));
  for (const row of rows.slice(1)) {
    const record = byId.get(row[column.record_id]);
    if (record.routeContinuity.status === "decision-required") {
      row[column.proposed_route_action] = record.identityProtected ? "archive" : "retain";
      row[column.proposed_route_target] = record.identityProtected ? "" : record.legacyPath;
    }
    row[column.proposed_content_decision] = record.identityProtected ? "archive" : "rewrite";
    row[column.proposed_content_target] = record.identityProtected ? "" : "/about";
    row[column.proposed_merge_into_record_id] = "";
    row[column.proposed_reason_code] = record.identityProtected ? "protect-identity-or-private-information" : "replace-with-current-information";
    row[column.proposed_owner_role] = "content-editor";
    row[column.proposed_reviewed_on] = reviewedOn;
  }
  return { csv: toCsv(rows), rows, column };
}

test("builds one exact, decision-only plan for all 115 current archive records", async () => {
  const { matrix } = await auditLegacyContentMigrationMatrix();
  const worksheet = await completedWorksheet(matrix);
  const csv = toCsv([worksheet.rows[0], ...worksheet.rows.slice(1).reverse()]);
  const plan = await createLegacyMigrationDecisionPlan({ csv, matrix, now });

  assert.equal(plan.status, "ready-for-explicit-atomic-write", JSON.stringify(plan.issues.slice(0, 10)));
  assert.match(plan.planId, /^legacy-migration-decisions-[a-f0-9]{24}$/);
  assert.equal(plan.summary.acceptedRecords, 115);
  assert.equal(plan.summary.changedRecords, 115);
  assert.equal(plan.summary.routeChanges, 80);
  assert.equal(plan.summary.contentChanges, 115);
  assert.equal(plan.summary.issueCount, 0);
  assert.equal(plan.records.length, 115);
  assert.ok(plan.records.every((record) => record.expected.implementationStatus === "not-started"));
  assert.equal(plan.guardrails.repositoryWritePerformed, false);
  assert.equal(plan.guardrails.approvalGranted, false);
  assert.equal(plan.guardrails.publicationAuthorized, false);
});

test("rejects duplicate, missing, unknown and stale record bindings without echoing cell values", async () => {
  const { matrix } = await auditLegacyContentMigrationMatrix();
  const { rows, column } = await completedWorksheet(matrix);
  rows[2][column.record_id] = rows[1][column.record_id];
  rows[3][column.source_digest] = "a".repeat(64);
  rows[4][column.expected_record_digest] = "b".repeat(64);
  rows[5][column.expected_matrix_digest] = "c".repeat(64);
  rows[6][column.proposed_reason_code] = "Jane Doe approved this rewrite";
  const unknown = [...rows[7]];
  unknown[column.record_id] = "migration-ffffffffffffffff";
  rows.push(unknown);
  const plan = await createLegacyMigrationDecisionPlan({ csv: toCsv(rows), matrix, now });
  const codes = new Set(plan.issues.map((issue) => issue.code));

  for (const code of ["row-count-mismatch", "record-id-invalid", "record-id-duplicate", "record-id-missing", "record-binding-stale", "matrix-binding-stale", "rationale-invalid"]) {
    assert.ok(codes.has(code), `Expected ${code}`);
  }
  assert.equal(plan.status, "blocked");
  assert.equal(plan.records.length, 0);
  assert.doesNotMatch(JSON.stringify(plan), /Jane|example\.com|C:\\Users/i);
});

test("rejects implementation forgery, formula variants and changed contract columns", async () => {
  const { matrix } = await auditLegacyContentMigrationMatrix();
  const { rows, column } = await completedWorksheet(matrix);
  rows[1][column.implementation_status] = "verified";
  rows[2][column.proposed_reason_code] = " \t=HYPERLINK(\"https://invalid.example\")";
  rows[3][column.proposed_reason_code] = "＝SUM(1,1) formula-like reason";
  rows[0].push("approved_by");
  for (const row of rows.slice(1)) row.push("");
  const plan = await createLegacyMigrationDecisionPlan({ csv: toCsv(rows), matrix, now });
  const codes = new Set(plan.issues.map((issue) => issue.code));

  assert.ok(codes.has("header-contract-mismatch"));
  assert.ok(codes.has("column-count-mismatch"));
  assert.equal(plan.status, "blocked");

  const clean = await completedWorksheet(matrix);
  clean.rows[1][clean.column.implementation_status] = "verified";
  clean.rows[2][clean.column.proposed_reason_code] = "\uFEFF+SUM(1,1) formula-like reason";
  clean.rows[3][clean.column.proposed_reason_code] = "＝SUM(1,1) formula-like reason";
  const focused = await createLegacyMigrationDecisionPlan({ csv: toCsv(clean.rows), matrix, now });
  const focusedCodes = new Set(focused.issues.map((issue) => issue.code));
  assert.ok(focusedCodes.has("immutable-field-changed"));
  assert.ok(focusedCodes.has("formula-like-input"));
});

test("bounds malformed, oversized and control-character worksheets", async () => {
  const { matrix } = await auditLegacyContentMigrationMatrix();
  const { csv } = await completedWorksheet(matrix);
  const malformed = await createLegacyMigrationDecisionPlan({ csv: csv.slice(0, -3), matrix, now });
  const oversized = await createLegacyMigrationDecisionPlan({ csv: "x".repeat(LEGACY_MIGRATION_DECISION_MAX_BYTES + 1), matrix, now });
  const controlled = await createLegacyMigrationDecisionPlan({ csv: csv.replace("replace-with", "replace\u202E-with"), matrix, now });

  assert.ok(malformed.issues.some((issue) => issue.code === "csv-malformed"));
  assert.ok(oversized.issues.some((issue) => issue.code === "worksheet-too-large"));
  assert.ok(controlled.issues.some((issue) => issue.code === "worksheet-encoding"));
  assert.equal(malformed.records.length + oversized.records.length + controlled.records.length, 0);
});

test("rejects unsafe route, merge, role and date combinations", async () => {
  const { matrix } = await auditLegacyContentMigrationMatrix();
  const { rows, column } = await completedWorksheet(matrix);
  const openIdentityIndex = rows.findIndex((row, index) => index > 0
    && matrix.records.find((record) => record.id === row[column.record_id])?.identityProtected
    && row[column.current_route_status] === "decision-required");
  rows[openIdentityIndex][column.proposed_route_action] = "redirect";
  rows[openIdentityIndex][column.proposed_route_target] = "/about";
  rows[openIdentityIndex][column.proposed_content_decision] = "merge";
  rows[openIdentityIndex][column.proposed_content_target] = "";
  rows[openIdentityIndex][column.proposed_merge_into_record_id] = rows[openIdentityIndex][column.record_id];
  rows[openIdentityIndex][column.proposed_owner_role] = "jane-smith";
  rows[openIdentityIndex][column.proposed_reviewed_on] = "2027-01-01";
  const plan = await createLegacyMigrationDecisionPlan({ csv: toCsv(rows), matrix, now });
  const codes = new Set(plan.issues.map((issue) => issue.code));

  for (const code of ["identity-route-unsafe", "merge-target-invalid", "owner-role-invalid", "review-date-invalid"]) {
    assert.ok(codes.has(code), `Expected ${code}`);
  }
});

test("accepts only controlled reason and role codes and registered public target namespaces", async () => {
  const { matrix } = await auditLegacyContentMigrationMatrix();
  const { rows, column } = await completedWorksheet(matrix);
  rows[1][column.proposed_reason_code] = "Jane Smith confirmed this migration decision.";
  rows[1][column.proposed_owner_role] = "principal-jane-smith";
  rows[2][column.proposed_content_target] = "/wp-admin";
  const plan = await createLegacyMigrationDecisionPlan({ csv: toCsv(rows), matrix, now });
  const codes = new Set(plan.issues.map((issue) => issue.code));

  assert.ok(codes.has("rationale-invalid"));
  assert.ok(codes.has("owner-role-invalid"));
  assert.ok(codes.has("content-target-invalid"));
  assert.equal(plan.status, "blocked");
  assert.equal(plan.records.length, 0);
  assert.doesNotMatch(JSON.stringify(plan), /Jane Smith|principal-jane-smith|wp-admin/);
});

test("rejects caller-supplied audit times outside the current validation window", async () => {
  const { matrix } = await auditLegacyContentMigrationMatrix();
  const { csv } = await completedWorksheet(matrix);
  await assert.rejects(
    createLegacyMigrationDecisionPlan({ csv, matrix, now: "2027-01-01T00:00:00.000Z" }),
    /current five-minute validation window/i,
  );
});

test("rejects a superseded version-one worksheet and requires a fresh export", async () => {
  const { matrix } = await auditLegacyContentMigrationMatrix();
  const { rows, column } = await completedWorksheet(matrix);
  rows[1][column.decision_contract_version] = "1";
  const plan = await createLegacyMigrationDecisionPlan({ csv: toCsv(rows), matrix, now });
  assert.equal(plan.status, "blocked");
  assert.ok(plan.issues.some((issue) => issue.code === "matrix-binding-stale" && issue.column === "decision_contract_version"));
});

test("keeps planning read-only, then writes only decisions after exact batch acknowledgement", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "sskem-migration-decisions-"));
  context.after(async () => import("node:fs/promises").then(({ rm }) => rm(temporaryRoot, { recursive: true, force: true })));
  const { matrix } = await auditLegacyContentMigrationMatrix();
  const { csv } = await completedWorksheet(matrix);
  const matrixPath = path.join(temporaryRoot, "matrix.json");
  const worksheetPath = path.join(temporaryRoot, "decisions.csv");
  const receiptRoot = path.join(temporaryRoot, "receipts");
  const matrixSource = `${JSON.stringify(matrix, null, 2)}\n`;
  await Promise.all([
    writeFile(matrixPath, matrixSource, "utf8"),
    writeFile(worksheetPath, csv, "utf8"),
  ]);

  const planned = await executeLegacyMigrationDecisionUpdate({ worksheetPath, matrixPath, receiptRoot, now });
  assert.equal(planned.mode, "read-only-plan");
  assert.equal(planned.plan.status, "ready-for-explicit-atomic-write");
  assert.equal(await readFile(matrixPath, "utf8"), matrixSource);

  await assert.rejects(
    executeLegacyMigrationDecisionUpdate({
      worksheetPath,
      matrixPath,
      receiptRoot,
      now,
      apply: true,
      decisionBatchId: planned.plan.decisionBatchId,
      acknowledgement: "wrong",
    }),
    /requires --acknowledge-local-write=.*No matrix write was made/i,
  );
  assert.equal(await readFile(matrixPath, "utf8"), matrixSource);

  const applied = await executeLegacyMigrationDecisionUpdate({
    worksheetPath,
    matrixPath,
    receiptRoot,
    now,
    apply: true,
    decisionBatchId: planned.plan.decisionBatchId,
    acknowledgement: LEGACY_MIGRATION_DECISION_ACKNOWLEDGEMENT,
  });
  assert.equal(applied.mode, "local-atomic-migration-decision-write");
  assert.equal(applied.receipt.recordsChanged, 115);
  assert.equal(applied.receipt.routeDecisionsRecorded, 80);
  assert.equal(applied.receipt.contentDecisionsRecorded, 115);
  assert.equal(applied.receipt.implementationStatusChanged, false);
  assert.equal(applied.receipt.publicationAuthorized, false);

  const updated = JSON.parse(await readFile(matrixPath, "utf8"));
  assert.deepEqual(validateLegacyContentMigrationMatrix(updated), []);
  const summary = legacyContentMigrationSummary(updated);
  assert.equal(summary.contentDecided, 115);
  assert.equal(summary.routeDecisionRequired, 0);
  assert.equal(summary.verified, 0);
  assert.equal(summary.completionReady, false);
  assert.ok(updated.records.every((record) => record.implementationStatus === "not-started"));
  assert.ok(updated.records.every((record) => record.publicationEligible === false));

  const [rollbackReceipt, beforeSnapshot, appliedMarker] = await Promise.all([
    readFile(path.join(applied.receiptDirectory, "rollback-receipt.json"), "utf8"),
    readFile(path.join(applied.receiptDirectory, "matrix-before.json"), "utf8"),
    readFile(path.join(applied.receiptDirectory, "applied.json"), "utf8"),
  ]);
  assert.equal(beforeSnapshot, matrixSource);
  assert.doesNotMatch(rollbackReceipt, /source-html|source-wordpress|[A-Za-z]:\\|\/Users\//i);
  assert.match(appliedMarker, /"localAtomicMatrixWritePerformed": true/);
});

test("detects a matrix race immediately before commit and leaves the original plan unapplied", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "sskem-migration-race-"));
  context.after(async () => import("node:fs/promises").then(({ rm }) => rm(temporaryRoot, { recursive: true, force: true })));
  const { matrix } = await auditLegacyContentMigrationMatrix();
  const { csv } = await completedWorksheet(matrix);
  const matrixPath = path.join(temporaryRoot, "matrix.json");
  const worksheetPath = path.join(temporaryRoot, "decisions.csv");
  const receiptRoot = path.join(temporaryRoot, "receipts");
  const matrixSource = `${JSON.stringify(matrix, null, 2)}\n`;
  await Promise.all([writeFile(matrixPath, matrixSource, "utf8"), writeFile(worksheetPath, csv, "utf8")]);
  const planned = await executeLegacyMigrationDecisionUpdate({ worksheetPath, matrixPath, receiptRoot, now });

  await assert.rejects(
    executeLegacyMigrationDecisionUpdate({
      worksheetPath,
      matrixPath,
      receiptRoot,
      now,
      apply: true,
      decisionBatchId: planned.plan.decisionBatchId,
      acknowledgement: LEGACY_MIGRATION_DECISION_ACKNOWLEDGEMENT,
      beforeMatrixCommit: () => writeFile(matrixPath, `${matrixSource}\n`, "utf8"),
    }),
    /changed during commit|changed immediately before commit/i,
  );
  const after = await readFile(matrixPath, "utf8");
  assert.equal(JSON.parse(after).records[0].contentDecision.decision, "unselected");
});

test("serializes concurrent decision writers with one exclusive matrix lock", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "sskem-migration-lock-"));
  context.after(async () => rm(temporaryRoot, { recursive: true, force: true }));
  const { matrix } = await auditLegacyContentMigrationMatrix();
  const { csv } = await completedWorksheet(matrix);
  const matrixPath = path.join(temporaryRoot, "matrix.json");
  const worksheetPath = path.join(temporaryRoot, "decisions.csv");
  const receiptRoot = path.join(temporaryRoot, "receipts");
  const lockPath = path.join(temporaryRoot, "matrix.write.lock");
  await Promise.all([
    writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8"),
    writeFile(worksheetPath, csv, "utf8"),
  ]);
  const planned = await executeLegacyMigrationDecisionUpdate({ worksheetPath, matrixPath, receiptRoot, lockPath, now });
  let releaseBarrier;
  let enteredCommit;
  const commitEntered = new Promise((resolve) => { enteredCommit = resolve; });
  const holdCommit = new Promise((resolve) => { releaseBarrier = resolve; });
  const first = executeLegacyMigrationDecisionUpdate({
    worksheetPath,
    matrixPath,
    receiptRoot,
    lockPath,
    now,
    apply: true,
    decisionBatchId: planned.plan.decisionBatchId,
    acknowledgement: LEGACY_MIGRATION_DECISION_ACKNOWLEDGEMENT,
    beforeMatrixCommit: async () => {
      enteredCommit();
      await holdCommit;
    },
  });
  await commitEntered;
  await assert.rejects(
    executeLegacyMigrationDecisionUpdate({
      worksheetPath,
      matrixPath,
      receiptRoot,
      lockPath,
      now,
      apply: true,
      decisionBatchId: planned.plan.decisionBatchId,
      acknowledgement: LEGACY_MIGRATION_DECISION_ACKNOWLEDGEMENT,
    }),
    (error) => error?.code === "MATRIX_LOCK_HELD",
  );
  releaseBarrier();
  const applied = await first;
  assert.equal(applied.status, "controlled-decisions-recorded");
  await assert.rejects(access(lockPath), (error) => error?.code === "ENOENT");
});

test("fails distinctly after a committed marker error and repairs only the digest-matched receipt", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "sskem-migration-marker-"));
  context.after(async () => rm(temporaryRoot, { recursive: true, force: true }));
  const { matrix } = await auditLegacyContentMigrationMatrix();
  const { csv } = await completedWorksheet(matrix);
  const matrixPath = path.join(temporaryRoot, "matrix.json");
  const worksheetPath = path.join(temporaryRoot, "decisions.csv");
  const receiptRoot = path.join(temporaryRoot, "receipts");
  const lockPath = path.join(temporaryRoot, "matrix.write.lock");
  await Promise.all([
    writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8"),
    writeFile(worksheetPath, csv, "utf8"),
  ]);
  const planned = await executeLegacyMigrationDecisionUpdate({ worksheetPath, matrixPath, receiptRoot, lockPath, now });
  let committedError;
  try {
    await executeLegacyMigrationDecisionUpdate({
      worksheetPath,
      matrixPath,
      receiptRoot,
      lockPath,
      now,
      apply: true,
      decisionBatchId: planned.plan.decisionBatchId,
      acknowledgement: LEGACY_MIGRATION_DECISION_ACKNOWLEDGEMENT,
      beforeAppliedMarker: () => { throw new Error("injected marker failure"); },
    });
  } catch (error) {
    committedError = error;
  }
  assert.equal(committedError?.code, "LEGACY_MIGRATION_APPLIED_MARKER_INCOMPLETE");
  const updated = JSON.parse(await readFile(matrixPath, "utf8"));
  assert.equal(legacyContentMigrationSummary(updated).contentDecided, 115);
  const appliedPath = path.join(receiptRoot, committedError.transactionId, "applied.json");
  await assert.rejects(access(appliedPath), (error) => error?.code === "ENOENT");
  await assert.rejects(
    repairLegacyMigrationDecisionAppliedMarker({ transactionId: committedError.transactionId, matrixPath, receiptRoot, lockPath, now, acknowledgement: "wrong" }),
    /requires --acknowledge-local-write/i,
  );
  const repaired = await repairLegacyMigrationDecisionAppliedMarker({
    transactionId: committedError.transactionId,
    matrixPath,
    receiptRoot,
    lockPath,
    now,
    acknowledgement: LEGACY_MIGRATION_APPLIED_MARKER_REPAIR_ACKNOWLEDGEMENT,
  });
  assert.equal(repaired.status, "repaired");
  assert.match(await readFile(appliedPath, "utf8"), /"recoveredAfterMarkerFailure": true/);
  const idempotent = await repairLegacyMigrationDecisionAppliedMarker({
    transactionId: committedError.transactionId,
    matrixPath,
    receiptRoot,
    lockPath,
    now,
    acknowledgement: LEGACY_MIGRATION_APPLIED_MARKER_REPAIR_ACKNOWLEDGEMENT,
  });
  assert.equal(idempotent.status, "already-complete");
});

test("ships a private noindex browser-only intake and a plan-first command", async () => {
  const [page, form, script, packageText, guide, refreshScript, exportRoute, sitemap, planSchemaText, rollbackSchemaText] = await Promise.all([
    source("app/publication-review/migration-decision-intake/page.tsx"),
    source("app/publication-review/migration-decision-intake/migration-decision-intake-form.tsx"),
    source("scripts/record-legacy-migration-decisions.mjs"),
    source("package.json"),
    source("docs/legacy-content-migration.md"),
    source("scripts/build-legacy-content-migration-matrix.mjs"),
    source("app/publication-review/migration-matrix-export/route.ts"),
    source("app/sitemap.ts"),
    source("content/legacy-migration-decision-plan.schema.json"),
    source("content/legacy-migration-decision-rollback-receipt.schema.json"),
  ]);
  const packageJson = JSON.parse(packageText);
  const planSchema = JSON.parse(planSchemaText);
  const rollbackSchema = JSON.parse(rollbackSchemaText);

  assert.match(page, /HOMEPAGE_REVIEW_MODE !== "private"/);
  assert.match(page, /requireChatGPTUser\("\/publication-review\/migration-decision-intake"\)/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(form, /file\.text\(\)/);
  assert.doesNotMatch(form, /\bfetch\s*\(|FormData|localStorage|sessionStorage|server action|use server/);
  assert.match(script, /--decision-batch-id=/);
  assert.match(script, /--acknowledge-local-write=/);
  assert.doesNotMatch(script, /--now=/);
  assert.match(packageJson.scripts["migration:decisions"], /record-legacy-migration-decisions/);
  assert.match(guide, /digest-bound|exact acknowledgement|acknowledge-local-write/i);
  assert.match(refreshScript, /refuses to erase recorded decisions/i);
  assert.match(refreshScript, /legacy-migration-matrix-lock/);
  assert.match(script, /repair-applied-marker/);
  assert.match(exportRoute, /await legacyContentMigrationWorksheetCsv\(\)/);
  assert.doesNotMatch(sitemap, /migration-decision-intake/);
  assert.equal(planSchema.additionalProperties, false);
  assert.equal(planSchema.properties.binding.properties.contractVersion.const, 2);
  assert.deepEqual(planSchema.$defs.decision.properties.rationale.anyOf[0].enum, [...migrationDecisionReasonCodes]);
  assert.deepEqual(planSchema.$defs.decision.properties.ownerRole.anyOf[0].enum, [...migrationDecisionOwnerRoles]);
  assert.equal(rollbackSchema.additionalProperties, false);
});
