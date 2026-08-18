import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { loadApprovalManifest, validateApprovalManifest } from "./approval-manifest.mjs";
import { CAMPUS_MEDIA_BATCH_STAGING_ID } from "./campus-media-batch-staging.mjs";
import {
  campusMediaProjectRoot,
  loadCampusMediaConfig,
} from "./campus-media-pipeline.mjs";
import {
  campusMediaPublicationRoles,
  createCampusMediaBindingProposal,
  validateCampusMediaPublicationRegistry,
} from "./campus-media-publication.ts";
import { verifyCampusMediaBindingArtifacts } from "./campus-media-activation.ts";
import { campusMasterPreflightRecordIds } from "./campus-master-preflight.ts";

export const CAMPUS_MEDIA_PUBLICATION_BATCH_PLAN_ID = "sskem-campus-media-first-publication-plan";

const defaultRegistryPath = path.resolve(campusMediaProjectRoot, "content", "campus-media-publication-bindings.json");
const defaultPublicRoot = path.resolve(campusMediaProjectRoot, "public", "media", "home", "production");

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function withinDirectory(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function readJsonObject(filePath, label) {
  let text;
  try {
    text = await readFile(filePath, "utf8");
  } catch {
    throw new Error(`${label} is missing or unreadable.`);
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  if (!isObject(value)) throw new Error(`${label} must contain one JSON object.`);
  return { text, value };
}

function currentApproval(record, now) {
  if (!record || record.kind !== "media" || record.decision !== "approved") return false;
  if (record.expiresAt === null) return true;
  return typeof record.expiresAt === "string" && Date.parse(`${record.expiresAt}T23:59:59.999Z`) >= now.getTime();
}

async function targetState(target) {
  try {
    const details = await stat(target);
    return details.isDirectory() ? "directory" : "non-directory";
  } catch (error) {
    if (error?.code === "ENOENT") return "absent";
    throw error;
  }
}

function validateBatchReceipt(receipt) {
  const issues = [];
  if (!isObject(receipt)) return ["The atomic staging receipt must be an object."];
  if (receipt.schemaVersion !== 1 || receipt.batchId !== CAMPUS_MEDIA_BATCH_STAGING_ID) issues.push("The atomic staging receipt identity is invalid.");
  if (receipt.status !== "staged-for-private-review") issues.push("The atomic staging batch is not ready for private review.");
  if (!Array.isArray(receipt.records) || receipt.records.length !== campusMasterPreflightRecordIds.length) {
    issues.push("The atomic staging receipt must contain exactly four campus records.");
  } else {
    const ids = receipt.records.map((record) => record?.recordId);
    if (new Set(ids).size !== ids.length || campusMasterPreflightRecordIds.some((recordId) => !ids.includes(recordId))) {
      issues.push("The atomic staging receipt record IDs are incomplete or duplicated.");
    }
  }
  if (!isObject(receipt.guardrails)
    || receipt.guardrails.atomicBatchDirectory !== true
    || receipt.guardrails.approvalGranted !== false
    || receipt.guardrails.publicationActivated !== false
    || receipt.guardrails.publicWritePerformed !== false
    || receipt.guardrails.sourceLocationsStored !== false
    || receipt.guardrails.sourceFilenamesStored !== false) {
    issues.push("The atomic staging receipt guardrails are invalid.");
  }
  return issues;
}

export async function auditCampusMediaStagingBatch({ stagingPath, now: suppliedNow, config: suppliedConfig } = {}) {
  const config = suppliedConfig ?? await loadCampusMediaConfig();
  const now = suppliedNow instanceof Date ? suppliedNow : new Date(suppliedNow ?? Date.now());
  if (Number.isNaN(now.getTime())) throw new Error("Campus media staging audit requires a valid time.");
  const stagingRoot = path.resolve(campusMediaProjectRoot, config.stagingRoot);
  const batchRoot = path.resolve(stagingPath ?? path.join(stagingRoot, "campus-batch"));
  if (!withinDirectory(batchRoot, stagingRoot)) throw new Error(`The atomic staging batch must remain inside ${config.stagingRoot}.`);

  const issues = [];
  let batchReceiptText = "";
  let batchReceipt = null;
  try {
    const loaded = await readJsonObject(path.join(batchRoot, "batch-intake-receipt.json"), "Atomic campus staging receipt");
    batchReceiptText = loaded.text;
    batchReceipt = loaded.value;
    issues.push(...validateBatchReceipt(batchReceipt));
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "Atomic campus staging receipt is unreadable.");
  }
  if (!batchReceipt || issues.length) {
    return { status: "blocked", batchRoot, batchSha256: null, proposals: [], records: [], issues };
  }

  const digest = createHash("sha256").update(batchReceiptText);
  const proposals = [];
  const records = [];
  for (const recordId of campusMasterPreflightRecordIds) {
    const batchRecord = batchReceipt.records.find((record) => record?.recordId === recordId);
    if (!isObject(batchRecord) || batchRecord.receiptFile !== `${recordId}/intake-receipt.json`) {
      issues.push(`${recordId} does not reference its canonical staging receipt.`);
      continue;
    }
    try {
      const loaded = await readJsonObject(path.join(batchRoot, recordId, "intake-receipt.json"), `${recordId} staging receipt`);
      digest.update(loaded.text);
      const receipt = loaded.value;
      if (receipt.schemaVersion !== 1 || receipt.pipelineId !== config.pipelineId || receipt.recordId !== recordId || receipt.mode !== "staging") {
        issues.push(`${recordId} staging receipt identity is invalid.`);
        continue;
      }
      if (!isDeepStrictEqual(batchRecord.source, receipt.source)
        || batchRecord.profile !== receipt.output?.profile
        || batchRecord.crop !== receipt.output?.crop
        || batchRecord.variants !== receipt.output?.variants?.length) {
        issues.push(`${recordId} staging receipt does not match the atomic batch receipt.`);
        continue;
      }
      const projectedReceipt = {
        ...receipt,
        decisionAtPreparation: "approved",
        mode: "public",
        generatedAt: now.toISOString(),
      };
      const proposal = createCampusMediaBindingProposal(projectedReceipt);
      const artifactIssues = await verifyCampusMediaBindingArtifacts({ binding: proposal, publicRoot: batchRoot });
      if (artifactIssues.length) {
        issues.push(...artifactIssues.map((issue) => `Staged ${issue}`));
        continue;
      }
      proposals.push(proposal);
      records.push({
        recordId,
        status: "verified-for-first-publication",
        sourceSha256: proposal.sourceSha256,
        variants: proposal.variants.length,
      });
    } catch (error) {
      issues.push(error instanceof Error ? error.message : `${recordId} staging verification failed.`);
    }
  }

  return {
    status: issues.length || proposals.length !== campusMasterPreflightRecordIds.length ? "blocked" : "verified",
    batchRoot,
    batchSha256: issues.length ? null : digest.digest("hex"),
    proposals,
    records,
    issues,
  };
}

export async function createCampusMediaPublicationBatchPlan({
  stagingPath,
  registryPath: suppliedRegistryPath,
  publicRoot: suppliedPublicRoot,
  manifest: suppliedManifest,
  registry: suppliedRegistry,
  stagedAudit: suppliedStagedAudit,
  publicTargetStates: suppliedPublicTargetStates,
  now: suppliedNow,
} = {}) {
  const now = suppliedNow instanceof Date ? suppliedNow : new Date(suppliedNow ?? Date.now());
  if (Number.isNaN(now.getTime())) throw new Error("Campus media publication batch planning requires a valid time.");
  const manifest = suppliedManifest ?? await loadApprovalManifest();
  const manifestIssues = validateApprovalManifest(manifest);
  const registryPath = path.resolve(suppliedRegistryPath ?? defaultRegistryPath);
  const publicRoot = path.resolve(suppliedPublicRoot ?? defaultPublicRoot);
  let registry;
  let registryText;
  if (suppliedRegistry) {
    registry = structuredClone(suppliedRegistry);
    registryText = `${JSON.stringify(registry, null, 2)}\n`;
  } else {
    const loaded = await readJsonObject(registryPath, "Campus media publication registry");
    registry = loaded.value;
    registryText = loaded.text;
  }
  const stagedAudit = suppliedStagedAudit ?? await auditCampusMediaStagingBatch({ stagingPath, now });
  const publicTargetStates = suppliedPublicTargetStates ?? await Promise.all(campusMasterPreflightRecordIds.map(async (recordId) => ({
    recordId,
    state: await targetState(path.join(publicRoot, recordId)),
  })));
  const blockers = [];

  if (manifestIssues.length) blockers.push(`The canonical approval manifest is invalid: ${manifestIssues.length} issue(s).`);
  const manifestById = new Map((manifest.records ?? []).map((record) => [record.id, record]));
  for (const recordId of campusMasterPreflightRecordIds) {
    if (!currentApproval(manifestById.get(recordId), now)) blockers.push(`${recordId} does not have a current approved media decision.`);
  }
  const currentRegistryIssues = validateCampusMediaPublicationRegistry({ registry, manifest, now });
  if (currentRegistryIssues.length) blockers.push(`The current campus binding registry is invalid: ${currentRegistryIssues.join(" ")}`);
  if (stagedAudit.status !== "verified") blockers.push(...stagedAudit.issues);
  const existingBindings = Array.isArray(registry.bindings)
    ? registry.bindings.filter((binding) => isObject(binding)
      && typeof binding.recordId === "string"
      && binding.recordId in campusMediaPublicationRoles)
    : [];
  if (existingBindings.length) blockers.push("First-publication planning refuses an existing campus binding; replacement requires a future versioned-media workflow.");
  for (const target of publicTargetStates) {
    if (!campusMasterPreflightRecordIds.includes(target.recordId) || target.state !== "absent") {
      blockers.push(`${target.recordId} public target is not absent; first-publication planning refuses replacement.`);
    }
  }

  const nextRegistry = stagedAudit.status === "verified" && Array.isArray(registry.bindings)
    ? { ...registry, bindings: [...registry.bindings, ...stagedAudit.proposals] }
    : registry;
  if (stagedAudit.status === "verified") {
    const nextRegistryIssues = validateCampusMediaPublicationRegistry({ registry: nextRegistry, manifest, now });
    if (nextRegistryIssues.length) blockers.push(`The proposed four-binding registry is invalid: ${nextRegistryIssues.join(" ")}`);
  }
  const nextRegistryText = `${JSON.stringify(nextRegistry, null, 2)}\n`;
  const sourceDigest = stagedAudit.status === "verified"
    ? sha256(stagedAudit.proposals.map((proposal) => `${proposal.recordId}:${proposal.sourceSha256}`).join("\n"))
    : null;

  return {
    planVersion: 1,
    planId: CAMPUS_MEDIA_PUBLICATION_BATCH_PLAN_ID,
    generatedAt: now.toISOString(),
    status: blockers.length ? "blocked" : "ready-for-explicit-first-publication",
    publicationBatchId: sourceDigest ? `campus-first-publication-${sourceDigest.slice(0, 12)}` : null,
    stagingBatchSha256: stagedAudit.batchSha256,
    registrySha256Before: sha256(registryText),
    registrySha256Proposed: sha256(nextRegistryText),
    records: campusMasterPreflightRecordIds.map((recordId) => {
      const proposal = stagedAudit.proposals.find((binding) => binding.recordId === recordId);
      const approvalReady = currentApproval(manifestById.get(recordId), now);
      const target = publicTargetStates.find((candidate) => candidate.recordId === recordId);
      return {
        recordId,
        role: campusMediaPublicationRoles[recordId],
        approvalReady,
        stagingVerified: Boolean(proposal),
        publicTargetState: target?.state ?? "unknown",
        sourceSha256: proposal?.sourceSha256 ?? null,
        variants: proposal?.variants.length ?? 0,
        proposedBindingId: proposal?.bindingId ?? null,
      };
    }),
    nextRegistry,
    blockers,
    guardrails: {
      planOnly: true,
      firstPublicationOnly: true,
      replacementSupported: false,
      stagedFilesChanged: false,
      publicFilesWritten: false,
      registryWritePerformed: false,
      approvalGranted: false,
      deploymentPerformed: false,
      sourceLocationsStored: false,
      sourceFilenamesStored: false,
    },
  };
}
