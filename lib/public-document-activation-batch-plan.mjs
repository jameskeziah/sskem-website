import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadApprovalManifest, validateApprovalManifest } from "./approval-manifest.mjs";
import { createPublicDocumentActivationPlan } from "./public-document-activation.ts";
import {
  PUBLIC_DOCUMENT_ACTIVATION_BATCH_CONFIRMATION,
  PUBLIC_DOCUMENT_ACTIVATION_BATCH_ID,
  publicDocumentActivationBatchRecordIds,
} from "./public-document-activation-batch-contract.ts";
import {
  publicDocumentRecordMap,
  validatePublicDocumentActivationMetadata,
  validatePublicDocumentPublicationRegistry,
} from "./public-document-publication.ts";

export {
  PUBLIC_DOCUMENT_ACTIVATION_BATCH_CONFIRMATION,
  PUBLIC_DOCUMENT_ACTIVATION_BATCH_ID,
} from "./public-document-activation-batch-contract.ts";

const recordIds = [...publicDocumentActivationBatchRecordIds];
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const defaultRegistryPath = path.resolve(projectRoot, "content", "public-document-publication-bindings.json");
const defaultStagingRoot = path.resolve(projectRoot, "work", "document-intake");
const defaultPublicRoot = path.resolve(projectRoot, "public", "documents", "production");
const topLevelKeys = new Set(["batchVersion", "batchId", "generatedAt", "documents", "batchConfirmation"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function normalizedNow(value) {
  const now = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(now.getTime())) throw new Error("Appendix IX activation batch planning requires a valid time.");
  return now;
}

export function validatePublicDocumentActivationBatch(batch, { now: suppliedNow } = {}) {
  const now = normalizedNow(suppliedNow);
  const issues = [];
  if (!isObject(batch)) return ["The Appendix IX activation batch must contain one object."];
  const unknownKeys = Object.keys(batch).filter((key) => !topLevelKeys.has(key));
  if (unknownKeys.length) issues.push(`The Appendix IX activation batch contains unknown field(s): ${unknownKeys.join(", ")}.`);
  if (batch.batchVersion !== 1 || batch.batchId !== PUBLIC_DOCUMENT_ACTIVATION_BATCH_ID) issues.push("The Appendix IX activation batch identity is invalid.");
  if (typeof batch.generatedAt !== "string" || Number.isNaN(Date.parse(batch.generatedAt))) issues.push("The Appendix IX activation batch generatedAt is invalid.");
  else if (Date.parse(batch.generatedAt) > now.getTime()) issues.push("The Appendix IX activation batch generatedAt cannot be in the future.");
  if (batch.batchConfirmation !== PUBLIC_DOCUMENT_ACTIVATION_BATCH_CONFIRMATION) issues.push("The complete Appendix IX public-metadata confirmation is missing.");
  if (!Array.isArray(batch.documents) || batch.documents.length !== recordIds.length) {
    issues.push("The Appendix IX activation batch must contain exactly twelve document metadata records.");
    return issues;
  }

  const suppliedRecordIds = batch.documents.map((document) => document?.recordId);
  if (new Set(suppliedRecordIds).size !== suppliedRecordIds.length) issues.push("The Appendix IX activation batch contains duplicate document record IDs.");
  for (const recordId of recordIds) {
    if (!suppliedRecordIds.includes(recordId)) issues.push(`The Appendix IX activation batch is missing ${recordId}.`);
  }
  for (const recordId of suppliedRecordIds) {
    if (!recordIds.includes(recordId)) issues.push(`The Appendix IX activation batch contains unknown record ${String(recordId)}.`);
  }
  const filenames = batch.documents.map((document) => document?.publicFilename).filter((value) => typeof value === "string");
  if (new Set(filenames).size !== filenames.length) issues.push("The Appendix IX activation batch contains duplicate public filenames.");
  for (const [index, metadata] of batch.documents.entries()) {
    const metadataIssues = validatePublicDocumentActivationMetadata(metadata, {
      recordId: recordIds.includes(metadata?.recordId) ? metadata.recordId : undefined,
      now,
    });
    issues.push(...metadataIssues.map((issue) => `documents[${index}]: ${issue}`));
  }
  if (/[A-Za-z]:[\\/]|\\\\/.test(JSON.stringify(batch))) issues.push("The Appendix IX activation batch must not contain a controlled filesystem path.");
  return issues;
}

export async function loadPublicDocumentActivationBatch(batchPath) {
  return (await readJsonObject(path.resolve(batchPath), "Appendix IX activation metadata batch")).value;
}

export async function createPublicDocumentActivationBatchPlan({
  batch,
  registryPath: suppliedRegistryPath,
  stagingRoot: suppliedStagingRoot,
  publicRoot: suppliedPublicRoot,
  manifest: suppliedManifest,
  now: suppliedNow,
} = {}) {
  const now = normalizedNow(suppliedNow);
  const registryPath = path.resolve(suppliedRegistryPath ?? defaultRegistryPath);
  const stagingRoot = path.resolve(suppliedStagingRoot ?? defaultStagingRoot);
  const publicRoot = path.resolve(suppliedPublicRoot ?? defaultPublicRoot);
  const [manifest, registryLoaded] = await Promise.all([
    suppliedManifest ?? loadApprovalManifest(),
    readJsonObject(registryPath, "Public document publication registry"),
  ]);
  const registry = registryLoaded.value;
  const batchIssues = validatePublicDocumentActivationBatch(batch, { now });
  const manifestIssues = validateApprovalManifest(manifest);
  const registryIssues = validatePublicDocumentPublicationRegistry({ registry, manifest, now });
  const blockers = [
    ...batchIssues,
    ...(manifestIssues.length ? [`The canonical approval manifest is invalid: ${manifestIssues.length} issue(s).`] : []),
    ...(registryIssues.length ? [`The current public document registry is invalid: ${registryIssues.join(" ")}`] : []),
  ];
  const existingBindings = Array.isArray(registry.bindings) ? registry.bindings : [];
  if (existingBindings.length) blockers.push("First-batch activation requires an empty Appendix IX binding registry; replacement is not supported by this planner.");

  const metadataById = new Map(Array.isArray(batch?.documents) ? batch.documents.map((metadata) => [metadata?.recordId, metadata]) : []);
  const records = [];
  const proposals = [];
  for (const recordId of recordIds) {
    const metadata = metadataById.get(recordId);
    const recordBlockers = [];
    let proposal = null;
    if (!metadata) {
      recordBlockers.push(`${recordId} public metadata is missing.`);
    } else if (batchIssues.length || manifestIssues.length || existingBindings.length) {
      recordBlockers.push(`${recordId} cannot be planned until the complete batch, manifest and empty-registry checks pass.`);
    } else {
      try {
        const individual = await createPublicDocumentActivationPlan({
          recordId,
          metadata,
          registryPath,
          stagingRoot,
          publicRoot,
          manifest,
          now,
        });
        if (individual.status !== "ready-for-explicit-write") recordBlockers.push(...individual.blockers);
        else {
          proposal = individual.proposal;
          proposals.push(proposal);
        }
      } catch (error) {
        recordBlockers.push(error instanceof Error ? error.message : `${recordId} activation planning failed.`);
      }
    }
    blockers.push(...recordBlockers.map((issue) => `${recordId}: ${issue}`));
    records.push({
      recordId,
      documentId: publicDocumentRecordMap[recordId],
      status: recordBlockers.length ? "blocked" : "verified-for-batch-activation",
      publicFilename: metadata?.publicFilename ?? null,
      bindingId: proposal?.bindingId ?? null,
      sourceSha256: proposal?.sourceSha256 ?? null,
      stagedReceiptSha256: proposal?.stagedReceiptSha256 ?? null,
      bytes: proposal?.bytes ?? 0,
      pages: proposal?.pages ?? 0,
      blockers: recordBlockers,
    });
  }

  const nextRegistry = proposals.length === recordIds.length && Array.isArray(registry.bindings)
    ? { ...registry, bindings: [...registry.bindings, ...proposals] }
    : registry;
  if (proposals.length === recordIds.length) {
    const nextRegistryIssues = validatePublicDocumentPublicationRegistry({ registry: nextRegistry, manifest, now });
    if (nextRegistryIssues.length) blockers.push(`The proposed twelve-binding registry is invalid: ${nextRegistryIssues.join(" ")}`);
  }
  const registrySha256Before = sha256(registryLoaded.text);
  const batchSha256 = isObject(batch) ? sha256(JSON.stringify(batch)) : null;
  const activationDigest = proposals.length === recordIds.length && blockers.length === 0
    ? sha256([batchSha256, registrySha256Before, ...proposals.map((proposal) => `${proposal.recordId}:${proposal.sourceSha256}:${proposal.stagedReceiptSha256}`)].join("\n"))
    : null;
  const nextRegistryText = `${JSON.stringify(nextRegistry, null, 2)}\n`;

  return {
    planVersion: 1,
    planId: "sskem-appendix-ix-document-activation-batch-plan",
    generatedAt: now.toISOString(),
    status: blockers.length ? "blocked" : "ready-for-explicit-batch-activation",
    activationBatchId: activationDigest ? `appendix-ix-activation-${activationDigest.slice(0, 12)}` : null,
    metadataBatchSha256: batchSha256,
    registrySha256Before,
    registrySha256Proposed: sha256(nextRegistryText),
    records,
    nextRegistry,
    blockers,
    guardrails: {
      planOnly: true,
      firstBatchActivationOnly: true,
      replacementSupported: false,
      publicFilesWritten: false,
      registryWritePerformed: false,
      approvalGranted: false,
      externalMalwareScanPerformed: false,
      deploymentPerformed: false,
      privateEvidenceIncluded: false,
      controlledPathsStored: false,
    },
  };
}
