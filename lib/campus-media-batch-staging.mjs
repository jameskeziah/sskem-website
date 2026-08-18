import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { loadApprovalManifest } from "./approval-manifest.mjs";
import { inspectCampusMediaBatch } from "./campus-media-batch-inspection.mjs";
import {
  campusMediaProjectRoot,
  loadCampusMediaConfig,
  prepareCampusMedia,
} from "./campus-media-pipeline.mjs";
import { campusMasterPreflightRecordIds } from "./campus-master-preflight.ts";

export const CAMPUS_MEDIA_BATCH_STAGING_ID = "sskem-campus-media-atomic-staging-batch";
export const CAMPUS_MEDIA_BATCH_STAGING_ACKNOWLEDGEMENT = "stage-four-verified-campus-masters";

function withinDirectory(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function pathState(target) {
  try {
    return await stat(target);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function removeDirectory(target) {
  return rm(target, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
}

function normalizeTargetDisplay(target) {
  return path.relative(campusMediaProjectRoot, target).split(path.sep).join("/");
}

function resolveInputs(inputs) {
  return Object.fromEntries(campusMasterPreflightRecordIds.map((recordId) => [recordId, path.resolve(inputs[recordId])]));
}

async function addDirectoryToHash(hash, root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    hash.update(relative);
    hash.update("\0");
    if (entry.isDirectory()) {
      hash.update("directory\0");
      await addDirectoryToHash(hash, root, absolute);
    } else if (entry.isFile()) {
      hash.update("file\0");
      hash.update(await readFile(absolute));
      hash.update("\0");
    } else {
      hash.update("unsupported\0");
    }
  }
}

async function directoryFingerprint(target) {
  const details = await pathState(target);
  if (!details) return null;
  if (!details.isDirectory()) throw new Error("The campus batch staging target exists and is not a directory.");
  const hash = createHash("sha256");
  await addDirectoryToHash(hash, target);
  return hash.digest("hex");
}

function resolveStagingTarget(config, outputPath, inputs) {
  const stagingRoot = path.resolve(campusMediaProjectRoot, config.stagingRoot);
  const target = path.resolve(outputPath ?? path.join(stagingRoot, "campus-batch"));
  if (!withinDirectory(target, stagingRoot)) {
    throw new Error(`Campus batch staging must remain inside ${config.stagingRoot}.`);
  }
  const inputPaths = resolveInputs(inputs);
  if (Object.values(inputPaths).some((inputPath) => inputPath === target || withinDirectory(inputPath, target))) {
    throw new Error("A controlled source master cannot be inside the campus batch staging target.");
  }
  return { stagingRoot, target, inputPaths };
}

export async function createCampusMediaBatchStagingPlan({
  report,
  inputs,
  outputPath,
  replace = false,
  config: suppliedConfig,
  manifest: suppliedManifest,
  now,
}) {
  const [config, manifest] = await Promise.all([
    suppliedConfig ?? loadCampusMediaConfig(),
    suppliedManifest ?? loadApprovalManifest(),
  ]);
  const inspection = await inspectCampusMediaBatch({ report, inputs, config, manifest, now });
  const { target } = resolveStagingTarget(config, outputPath, inputs);
  const existingTargetFingerprint = await directoryFingerprint(target);
  const blockers = [];
  if (inspection.status !== "ready-for-staging") blockers.push("One or more exact masters failed authoritative inspection.");
  if (existingTargetFingerprint && !replace) blockers.push("The staging target already exists; explicit replacement review is required.");

  return {
    mode: "read-only-plan",
    batchId: CAMPUS_MEDIA_BATCH_STAGING_ID,
    status: blockers.length ? "blocked" : "ready-for-explicit-write",
    target: normalizeTargetDisplay(target),
    replaceRequested: Boolean(replace),
    existingTargetFingerprint,
    inspection: {
      batchId: inspection.batchId,
      generatedAt: inspection.generatedAt,
      status: inspection.status,
      exactFilesMatched: inspection.preflight.exactFilesMatched,
      records: inspection.records.map((record) => ({ recordId: record.recordId, status: record.status, issues: record.issues })),
    },
    blockers,
    guardrails: {
      readOnlyPlan: true,
      derivativesWritten: false,
      stagingTargetChanged: false,
      approvalGranted: false,
      publicationActivated: false,
      publicWritePerformed: false,
      sourceLocationsStored: false,
      sourceFilenamesStored: false,
    },
  };
}

export async function executeCampusMediaBatchStaging({
  report,
  inputs,
  outputPath,
  replace = false,
  apply = false,
  acknowledgement,
  config: suppliedConfig,
  manifest: suppliedManifest,
  now: suppliedNow,
  prepareMedia = prepareCampusMedia,
}) {
  const [config, manifest] = await Promise.all([
    suppliedConfig ?? loadCampusMediaConfig(),
    suppliedManifest ?? loadApprovalManifest(),
  ]);
  const plan = await createCampusMediaBatchStagingPlan({
    report,
    inputs,
    outputPath,
    replace,
    config,
    manifest,
    now: suppliedNow,
  });
  if (!apply) return plan;
  if (acknowledgement !== CAMPUS_MEDIA_BATCH_STAGING_ACKNOWLEDGEMENT) {
    throw new Error(`Exact acknowledgement is required: ${CAMPUS_MEDIA_BATCH_STAGING_ACKNOWLEDGEMENT}`);
  }
  if (plan.status !== "ready-for-explicit-write") {
    throw new Error(`Campus batch staging is blocked: ${plan.blockers.join(" ")}`);
  }

  const now = suppliedNow instanceof Date ? suppliedNow : new Date(suppliedNow ?? Date.now());
  if (Number.isNaN(now.getTime())) throw new Error("Campus batch staging requires a valid time.");
  const { stagingRoot, target, inputPaths } = resolveStagingTarget(config, outputPath, inputs);
  const nonce = `${process.pid}-${Date.now()}`;
  const temporaryTarget = `${target}.tmp-${nonce}`;
  const backupTarget = `${target}.backup-${nonce}`;
  if (!withinDirectory(temporaryTarget, stagingRoot) || !withinDirectory(backupTarget, stagingRoot)) {
    throw new Error("Campus batch transaction paths escaped the staging root.");
  }

  await mkdir(path.dirname(target), { recursive: true });
  await mkdir(temporaryTarget);
  let backupCreated = false;
  let committed = false;
  let backupCleanupPending = false;
  try {
    const prepared = [];
    for (const recordId of campusMasterPreflightRecordIds) {
      const result = await prepareMedia({
        recordId,
        inputPath: inputPaths[recordId],
        outputPath: path.join(temporaryTarget, recordId),
        config,
        manifest,
      });
      const expected = report.records.find((record) => record.recordId === recordId);
      if (result.receipt.source.sha256 !== expected.sha256 || result.receipt.source.bytes !== expected.bytes) {
        throw new Error(`The controlled source changed while staging ${recordId}.`);
      }
      prepared.push({
        recordId,
        source: result.receipt.source,
        profile: result.receipt.output.profile,
        crop: result.receipt.output.crop,
        variants: result.receipt.output.variants.length,
        receiptFile: `${recordId}/intake-receipt.json`,
      });
    }

    const batchReceipt = {
      schemaVersion: 1,
      batchId: CAMPUS_MEDIA_BATCH_STAGING_ID,
      generatedAt: now.toISOString(),
      status: "staged-for-private-review",
      preflight: {
        reportId: report.reportId,
        reportVersion: report.reportVersion,
        generatedAt: report.generatedAt,
        exactFilesMatched: prepared.length,
      },
      records: prepared,
      guardrails: {
        atomicBatchDirectory: true,
        sourceLocationsStored: false,
        sourceFilenamesStored: false,
        sourceMastersModified: false,
        approvalGranted: false,
        publicationActivated: false,
        publicWritePerformed: false,
      },
    };
    await writeFile(path.join(temporaryTarget, "batch-intake-receipt.json"), `${JSON.stringify(batchReceipt, null, 2)}\n`, "utf8");

    const currentFingerprint = await directoryFingerprint(target);
    if (currentFingerprint !== plan.existingTargetFingerprint) {
      throw new Error("The campus batch staging target changed after planning; no replacement was performed.");
    }
    if (currentFingerprint) {
      await rename(target, backupTarget);
      backupCreated = true;
    }
    try {
      await rename(temporaryTarget, target);
      committed = true;
    } catch (error) {
      if (backupCreated) await rename(backupTarget, target);
      backupCreated = false;
      throw error;
    }
    if (backupCreated) {
      try {
        await removeDirectory(backupTarget);
      } catch {
        backupCleanupPending = true;
      }
      backupCreated = false;
    }

    return {
      mode: "local-atomic-staging-write",
      batchId: CAMPUS_MEDIA_BATCH_STAGING_ID,
      status: "staged-for-private-review",
      target: normalizeTargetDisplay(target),
      recordsStaged: prepared.length,
      derivativesStaged: prepared.reduce((total, record) => total + record.variants, 0),
      backupCleanupPending,
      batchReceipt,
      guardrails: {
        atomicBatchDirectory: true,
        approvalGranted: false,
        publicationActivated: false,
        publicWritePerformed: false,
        sourceLocationsStored: false,
        sourceFilenamesStored: false,
      },
    };
  } catch (error) {
    if (!committed) await removeDirectory(temporaryTarget);
    if (backupCreated && !(await pathState(target))) await rename(backupTarget, target);
    throw error;
  }
}
