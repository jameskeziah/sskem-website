import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import {
  LEGACY_MIGRATION_DECISION_ACKNOWLEDGEMENT,
  LEGACY_MIGRATION_DECISION_MAX_BYTES,
  createLegacyMigrationDecisionPlan,
} from "./legacy-migration-decision-intake.ts";
import {
  fingerprintLegacyMigrationValue,
  validateLegacyContentMigrationMatrix,
} from "./legacy-content-migration.ts";
import {
  acquireLegacyMigrationMatrixLock,
  legacyMigrationLockPathForMatrix,
} from "./legacy-migration-matrix-lock.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
export const legacyMigrationDecisionMatrixPath = path.resolve(projectRoot, "content", "legacy-content-migration-matrix.json");
export const legacyMigrationDecisionReceiptRoot = path.resolve(projectRoot, "work", "legacy-content-migration", "decision-receipts");
export const LEGACY_MIGRATION_APPLIED_MARKER_REPAIR_ACKNOWLEDGEMENT = "repair-legacy-migration-applied-marker";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function withinDirectory(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function renameWithRetry(source, target) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await rename(source, target);
      return;
    } catch (error) {
      if (!["EACCES", "EBUSY", "ENOTEMPTY", "EPERM"].includes(error?.code) || attempt === 19) throw error;
      await delay(100);
    }
  }
}

function normalizedNow(value) {
  const wallClock = new Date();
  const now = value instanceof Date ? value : new Date(value ?? wallClock);
  if (Number.isNaN(now.getTime())) throw new Error("Legacy migration decision intake requires a valid time.");
  if (Math.abs(now.getTime() - wallClock.getTime()) > 5 * 60 * 1000) {
    throw new Error("Legacy migration decision intake rejects a timestamp outside the current five-minute validation window.");
  }
  return now.toISOString();
}

async function readWorksheet(worksheetPath) {
  const details = await stat(worksheetPath);
  if (!details.isFile()) throw new Error("Legacy migration decision intake requires a CSV file.");
  if (details.size > LEGACY_MIGRATION_DECISION_MAX_BYTES) throw new Error("Legacy migration decision worksheet exceeds the one-megabyte limit.");
  return readFile(worksheetPath, "utf8");
}

async function readMatrix(matrixPath) {
  const source = await readFile(matrixPath, "utf8");
  let matrix;
  try {
    matrix = JSON.parse(source);
  } catch {
    throw new Error("The canonical legacy migration matrix is not valid JSON.");
  }
  const issues = validateLegacyContentMigrationMatrix(matrix);
  if (issues.length) throw new Error(`The canonical legacy migration matrix failed integrity validation (${issues[0].code}).`);
  return { source, matrix };
}

function proposedMatrix(matrix, plan) {
  const planned = new Map(plan.records.map((record) => [record.recordId, record]));
  return {
    ...matrix,
    records: matrix.records.map((record) => {
      const update = planned.get(record.id);
      if (!update) throw new Error("The decision plan does not cover the complete canonical matrix.");
      return {
        ...record,
        routeContinuity: structuredClone(update.proposed.routeContinuity),
        contentDecision: structuredClone(update.proposed.contentDecision),
      };
    }),
  };
}

async function buildPlan({ worksheetPath, matrixPath, now }) {
  const [{ source: matrixSource, matrix }, worksheetSource] = await Promise.all([
    readMatrix(matrixPath),
    readWorksheet(worksheetPath),
  ]);
  const plan = await createLegacyMigrationDecisionPlan({ csv: worksheetSource, matrix, now });
  let nextMatrix = null;
  let nextMatrixSource = null;
  let nextMatrixSha256 = null;
  let nextMatrixDigest = null;
  if (plan.status === "ready-for-explicit-atomic-write") {
    nextMatrix = proposedMatrix(matrix, plan);
    const issues = validateLegacyContentMigrationMatrix(nextMatrix);
    if (issues.length) throw new Error(`The proposed legacy migration matrix failed integrity validation (${issues[0].code}).`);
    nextMatrixSource = `${JSON.stringify(nextMatrix, null, 2)}\n`;
    nextMatrixSha256 = sha256(nextMatrixSource);
    nextMatrixDigest = await fingerprintLegacyMigrationValue(nextMatrix);
  }
  return {
    matrix,
    matrixSource,
    matrixSha256: sha256(matrixSource),
    worksheetSource,
    plan,
    nextMatrix,
    nextMatrixSource,
    nextMatrixSha256,
    nextMatrixDigest,
  };
}

function plansMatch(left, right) {
  return left.plan.status === "ready-for-explicit-atomic-write"
    && right.plan.status === left.plan.status
    && right.plan.planId === left.plan.planId
    && right.plan.binding.matrixDigest === left.plan.binding.matrixDigest
    && right.plan.binding.worksheetDigest === left.plan.binding.worksheetDigest
    && right.matrixSha256 === left.matrixSha256
    && right.nextMatrixSha256 === left.nextMatrixSha256
    && right.nextMatrixDigest === left.nextMatrixDigest;
}

function safePlanReport(item) {
  return {
    status: item.plan.status,
    decisionBatchId: item.plan.planId,
    binding: item.plan.binding,
    summary: item.plan.summary,
    issues: item.plan.issues,
    matrixSha256Before: item.matrixSha256,
    matrixSha256Proposed: item.nextMatrixSha256,
    guardrails: item.plan.guardrails,
  };
}

export async function executeLegacyMigrationDecisionUpdate(options = {}) {
  if (!options.worksheetPath) throw new Error("Legacy migration decision intake requires --worksheet=CONTROLLED_DECISIONS.csv.");
  const worksheetPath = path.resolve(options.worksheetPath);
  const matrixPath = path.resolve(options.matrixPath ?? legacyMigrationDecisionMatrixPath);
  const receiptRoot = path.resolve(options.receiptRoot ?? legacyMigrationDecisionReceiptRoot);
  if (matrixPath === receiptRoot || withinDirectory(matrixPath, receiptRoot)) {
    throw new Error("The migration matrix and controlled receipt root must not overlap.");
  }
  const now = normalizedNow(options.now);
  const initial = await buildPlan({ worksheetPath, matrixPath, now });
  if (!options.apply) return { mode: "read-only-plan", plan: safePlanReport(initial) };

  if (initial.plan.status !== "ready-for-explicit-atomic-write") {
    throw new Error(`Legacy migration decision update is blocked with ${initial.plan.summary.issueCount} issue(s). No matrix write was made.`);
  }
  if (options.acknowledgement !== LEGACY_MIGRATION_DECISION_ACKNOWLEDGEMENT) {
    throw new Error(`Legacy migration decision update requires --acknowledge-local-write=${LEGACY_MIGRATION_DECISION_ACKNOWLEDGEMENT}. No matrix write was made.`);
  }
  if (options.decisionBatchId !== initial.plan.planId) {
    throw new Error(`Legacy migration decision update requires --decision-batch-id=${initial.plan.planId} from the current reviewed plan. No matrix write was made.`);
  }

  await mkdir(path.dirname(matrixPath), { recursive: true });
  await mkdir(receiptRoot, { recursive: true });
  const matrixLock = await acquireLegacyMigrationMatrixLock({
    matrixPath,
    lockPath: options.lockPath ?? legacyMigrationLockPathForMatrix(matrixPath),
    operation: "decision-update",
    acquiredAt: now,
    matrixSha256Before: initial.matrixSha256,
    matrixSha256Proposed: initial.nextMatrixSha256,
    decisionBatchId: initial.plan.planId,
  });
  const nonce = `${process.pid}-${Date.now()}`;
  const temporaryMatrixPath = path.join(path.dirname(matrixPath), `.${path.basename(matrixPath)}.${nonce}.tmp`);
  if (!withinDirectory(temporaryMatrixPath, path.dirname(matrixPath))) throw new Error("The temporary matrix path escaped its controlled parent.");

  const transactionId = `${now.replace(/\D/g, "").slice(0, 14)}-${initial.plan.planId.slice(-12)}`;
  const finalReceiptDirectory = path.join(receiptRoot, transactionId);
  if (!withinDirectory(finalReceiptDirectory, receiptRoot)) throw new Error("The rollback receipt path escaped its controlled parent.");
  let receiptDirectoryCreated = false;
  let matrixCommitted = false;
  let postCommitMarkerError = null;
  let result = null;

  try {
    const lockedPlan = await buildPlan({ worksheetPath, matrixPath, now });
    if (!plansMatch(initial, lockedPlan)) throw new Error("The worksheet or migration matrix changed before the exclusive write lock was acquired. Review a fresh plan; no matrix write was made.");
    await writeFile(temporaryMatrixPath, initial.nextMatrixSource, { encoding: "utf8", flag: "wx" });
    const finalPlan = await buildPlan({ worksheetPath, matrixPath, now });
    if (!plansMatch(initial, finalPlan)) throw new Error("The worksheet or migration matrix changed after planning. Review a fresh plan; no matrix write was made.");

    if (options.beforeMatrixCommit) await options.beforeMatrixCommit();
    const commitPlan = await buildPlan({ worksheetPath, matrixPath, now });
    if (!plansMatch(initial, commitPlan)) throw new Error("The worksheet or migration matrix changed during commit. No matrix write was made.");
    const currentSource = await readFile(matrixPath, "utf8");
    if (sha256(currentSource) !== initial.matrixSha256) throw new Error("The migration matrix changed immediately before commit. No matrix write was made.");

    await mkdir(finalReceiptDirectory);
    receiptDirectoryCreated = true;
    const changedRecords = initial.plan.records.filter((record) => record.changes.route || record.changes.content);
    const rollbackReceipt = {
      $schema: "./legacy-migration-decision-rollback-receipt.schema.json",
      schemaVersion: 1,
      receiptId: "sskem-legacy-migration-decision-rollback",
      transactionId,
      preparedOn: now,
      state: "prepared-before-atomic-matrix-write",
      decisionBatchId: initial.plan.planId,
      worksheetSha256: sha256(initial.worksheetSource),
      matrixSha256Before: initial.matrixSha256,
      matrixSha256After: initial.nextMatrixSha256,
      matrixDigestBefore: initial.plan.binding.matrixDigest,
      matrixDigestAfter: initial.nextMatrixDigest,
      changedRecordIds: changedRecords.map((record) => record.recordId),
      recordsChanged: changedRecords.length,
      routeDecisionsRecorded: initial.plan.summary.routeChanges,
      contentDecisionsRecorded: initial.plan.summary.contentChanges,
      rollbackGuard: "Restore only when the current matrix SHA-256 exactly equals matrixSha256After and after a separate reviewed rollback plan.",
      guardrails: {
        priorMatrixSnapshotIncluded: true,
        archivedSourceContentIncluded: false,
        privateSourcePathsAdded: false,
        implementationStatusChanged: false,
        approvalGranted: false,
        publicationAuthorized: false,
        cmsWritePerformed: false,
        navigationActivated: false,
        deploymentPerformed: false,
      },
    };
    await Promise.all([
      writeFile(path.join(finalReceiptDirectory, "rollback-receipt.json"), `${JSON.stringify(rollbackReceipt, null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
      writeFile(path.join(finalReceiptDirectory, "matrix-before.json"), initial.matrixSource, { encoding: "utf8", flag: "wx" }),
      writeFile(path.join(finalReceiptDirectory, "decision-plan.json"), `${JSON.stringify(safePlanReport(initial), null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
    ]);
    const sourceAtRename = await readFile(matrixPath, "utf8");
    if (sha256(sourceAtRename) !== initial.matrixSha256) throw new Error("The migration matrix changed at commit. No matrix write was made.");
    await renameWithRetry(temporaryMatrixPath, matrixPath);
    matrixCommitted = true;

    const appliedMarker = {
      schemaVersion: 1,
      transactionId,
      decisionBatchId: initial.plan.planId,
      appliedOn: now,
      matrixSha256After: initial.nextMatrixSha256,
      localAtomicMatrixWritePerformed: true,
    };
    let appliedMarkerStored = true;
    try {
      if (options.beforeAppliedMarker) await options.beforeAppliedMarker();
      await writeFile(path.join(finalReceiptDirectory, "applied.json"), `${JSON.stringify(appliedMarker, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    } catch (error) {
      appliedMarkerStored = false;
      postCommitMarkerError = error;
    }

    result = {
      mode: "local-atomic-migration-decision-write",
      status: appliedMarkerStored ? "controlled-decisions-recorded" : "matrix-committed-receipt-marker-incomplete",
      receiptDirectory: finalReceiptDirectory,
      receipt: {
        transactionId,
        decisionBatchId: initial.plan.planId,
        matrixSha256Before: initial.matrixSha256,
        matrixSha256After: initial.nextMatrixSha256,
        recordsChanged: initial.plan.summary.changedRecords,
        routeDecisionsRecorded: initial.plan.summary.routeChanges,
        contentDecisionsRecorded: initial.plan.summary.contentChanges,
        rollbackSnapshotStored: true,
        appliedMarkerStored,
        localAtomicMatrixWritePerformed: true,
        implementationStatusChanged: false,
        approvalGranted: false,
        publicationAuthorized: false,
        deploymentPerformed: false,
      },
    };
  } finally {
    if (!matrixCommitted) await rm(temporaryMatrixPath, { force: true });
    if (receiptDirectoryCreated && !matrixCommitted) await rm(finalReceiptDirectory, { recursive: true, force: true });
    try {
      await matrixLock.release();
    } catch (error) {
      const lockError = new Error(matrixCommitted
        ? "The migration matrix write committed, but exclusive-lock cleanup is incomplete. Stop and inspect the controlled lock before another write."
        : "The migration matrix was not written, and exclusive-lock cleanup is incomplete. Stop and inspect the controlled lock.");
      lockError.code = "MATRIX_LOCK_CLEANUP_INCOMPLETE";
      lockError.cause = error;
      throw lockError;
    }
  }

  if (postCommitMarkerError) {
    const error = new Error(`The migration matrix write committed, but its applied receipt marker is incomplete for transaction ${result.receipt.transactionId}. Run the explicit marker-repair command before continuing.`);
    error.code = "LEGACY_MIGRATION_APPLIED_MARKER_INCOMPLETE";
    error.transactionId = result.receipt.transactionId;
    error.receiptDirectory = result.receiptDirectory;
    error.cause = postCommitMarkerError;
    throw error;
  }
  return result;
}

export async function repairLegacyMigrationDecisionAppliedMarker(options = {}) {
  if (options.acknowledgement !== LEGACY_MIGRATION_APPLIED_MARKER_REPAIR_ACKNOWLEDGEMENT) {
    throw new Error(`Applied-marker repair requires --acknowledge-local-write=${LEGACY_MIGRATION_APPLIED_MARKER_REPAIR_ACKNOWLEDGEMENT}. No receipt write was made.`);
  }
  const transactionId = String(options.transactionId ?? "");
  if (!/^\d{14}-[a-f0-9]{12}$/.test(transactionId)) throw new Error("Applied-marker repair requires a valid controlled transaction ID.");
  const matrixPath = path.resolve(options.matrixPath ?? legacyMigrationDecisionMatrixPath);
  const receiptRoot = path.resolve(options.receiptRoot ?? legacyMigrationDecisionReceiptRoot);
  const receiptDirectory = path.join(receiptRoot, transactionId);
  if (!withinDirectory(receiptDirectory, receiptRoot)) throw new Error("The applied-marker repair path escaped its controlled parent.");
  const now = normalizedNow(options.now);
  const initialMatrixSource = await readFile(matrixPath, "utf8");
  const matrixLock = await acquireLegacyMigrationMatrixLock({
    matrixPath,
    lockPath: options.lockPath ?? legacyMigrationLockPathForMatrix(matrixPath),
    operation: "applied-marker-repair",
    acquiredAt: now,
    matrixSha256Before: sha256(initialMatrixSource),
  });
  try {
    const [matrixSource, receiptSource] = await Promise.all([
      readFile(matrixPath, "utf8"),
      readFile(path.join(receiptDirectory, "rollback-receipt.json"), "utf8"),
    ]);
    let receipt;
    try {
      receipt = JSON.parse(receiptSource);
    } catch {
      throw new Error("Applied-marker repair requires a valid rollback receipt.");
    }
    if (receipt?.transactionId !== transactionId
      || !/^legacy-migration-decisions-[a-f0-9]{24}$/.test(String(receipt?.decisionBatchId ?? ""))
      || !/^[a-f0-9]{64}$/.test(String(receipt?.matrixSha256After ?? ""))) {
      throw new Error("Applied-marker repair found an incompatible rollback receipt.");
    }
    if (sha256(matrixSource) !== receipt.matrixSha256After) {
      throw new Error("Applied-marker repair is blocked because the current matrix does not match the committed after-hash.");
    }
    const appliedPath = path.join(receiptDirectory, "applied.json");
    const marker = {
      schemaVersion: 1,
      transactionId,
      decisionBatchId: receipt.decisionBatchId,
      appliedOn: now,
      matrixSha256After: receipt.matrixSha256After,
      localAtomicMatrixWritePerformed: true,
      recoveredAfterMarkerFailure: true,
    };
    try {
      const existingSource = await readFile(appliedPath, "utf8");
      const existing = JSON.parse(existingSource);
      if (existing?.transactionId !== transactionId
        || existing?.decisionBatchId !== receipt.decisionBatchId
        || existing?.matrixSha256After !== receipt.matrixSha256After
        || existing?.localAtomicMatrixWritePerformed !== true) {
        throw new Error("An incompatible applied marker already exists; no receipt write was made.");
      }
      return { mode: "applied-marker-repair", status: "already-complete", transactionId, receiptDirectory };
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await writeFile(appliedPath, `${JSON.stringify(marker, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    return { mode: "applied-marker-repair", status: "repaired", transactionId, receiptDirectory };
  } finally {
    await matrixLock.release();
  }
}
