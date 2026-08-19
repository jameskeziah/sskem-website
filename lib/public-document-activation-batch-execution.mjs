import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";

import {
  createPublicDocumentActivationBatchPlan,
} from "./public-document-activation-batch-plan.mjs";
import { auditPublicDocumentPublicationArtifacts } from "./public-document-activation.ts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const defaultRegistryPath = path.resolve(projectRoot, "content", "public-document-publication-bindings.json");
const defaultStagingRoot = path.resolve(projectRoot, "work", "document-intake");
const defaultPublicRoot = path.resolve(projectRoot, "public", "documents", "production");

export const PUBLIC_DOCUMENT_ACTIVATION_BATCH_ACKNOWLEDGEMENT = "activate-complete-appendix-ix-document-batch";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedNow(value) {
  const now = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(now.getTime())) throw new Error("Appendix IX batch activation requires a valid time.");
  return now;
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
      if (!new Set(["EACCES", "EBUSY", "ENOTEMPTY", "EPERM"]).has(error?.code) || attempt === 19) throw error;
      await delay(100);
    }
  }
}

function plansMatch(initial, current) {
  return current.status === "ready-for-explicit-batch-activation"
    && current.activationBatchId === initial.activationBatchId
    && current.metadataBatchSha256 === initial.metadataBatchSha256
    && current.registrySha256Before === initial.registrySha256Before
    && current.registrySha256Proposed === initial.registrySha256Proposed
    && isDeepStrictEqual(current.nextRegistry, initial.nextRegistry);
}

export async function executePublicDocumentActivationBatch({
  batch,
  registryPath: suppliedRegistryPath,
  stagingRoot: suppliedStagingRoot,
  publicRoot: suppliedPublicRoot,
  manifest,
  now: suppliedNow,
  apply = false,
  acknowledgement,
  activationBatchId,
  beforeRegistryCommit,
} = {}) {
  const now = normalizedNow(suppliedNow);
  const registryPath = path.resolve(suppliedRegistryPath ?? defaultRegistryPath);
  const stagingRoot = path.resolve(suppliedStagingRoot ?? defaultStagingRoot);
  const publicRoot = path.resolve(suppliedPublicRoot ?? defaultPublicRoot);
  if (registryPath === stagingRoot
    || registryPath === publicRoot
    || withinDirectory(registryPath, stagingRoot)
    || withinDirectory(registryPath, publicRoot)) {
    throw new Error("Appendix IX registry, staging and public paths must not overlap.");
  }

  const planOptions = { batch, registryPath, stagingRoot, publicRoot, manifest, now };
  const plan = await createPublicDocumentActivationBatchPlan(planOptions);
  if (!apply) return { mode: "local-plan", plan };
  if (plan.status !== "ready-for-explicit-batch-activation") {
    throw new Error(`Appendix IX batch activation is blocked: ${plan.blockers.join(" ")} No registry write was made.`);
  }
  if (acknowledgement !== PUBLIC_DOCUMENT_ACTIVATION_BATCH_ACKNOWLEDGEMENT) {
    throw new Error(`Appendix IX batch activation requires --acknowledge-local-write=${PUBLIC_DOCUMENT_ACTIVATION_BATCH_ACKNOWLEDGEMENT}. No registry write was made.`);
  }
  if (activationBatchId !== plan.activationBatchId) {
    throw new Error(`Appendix IX batch activation requires --activation-batch-id=${plan.activationBatchId} from the current reviewed plan. No registry write was made.`);
  }

  const proposedRegistryText = `${JSON.stringify(plan.nextRegistry, null, 2)}\n`;
  if (sha256(proposedRegistryText) !== plan.registrySha256Proposed) {
    throw new Error("The proposed Appendix IX registry no longer matches the reviewed plan. No registry write was made.");
  }
  const initialArtifactIssues = await auditPublicDocumentPublicationArtifacts({
    registry: plan.nextRegistry,
    manifest,
    publicRoot,
    now,
  });
  if (initialArtifactIssues.length) {
    throw new Error(`Appendix IX public artifacts changed after planning: ${initialArtifactIssues.join(" ")} No registry write was made.`);
  }

  await mkdir(path.dirname(registryPath), { recursive: true });
  const nonce = `${process.pid}-${Date.now()}`;
  const temporaryRegistryPath = path.join(path.dirname(registryPath), `.${path.basename(registryPath)}.${nonce}.tmp`);
  if (!withinDirectory(temporaryRegistryPath, path.dirname(registryPath))) {
    throw new Error("The Appendix IX registry transaction path escaped its controlled parent.");
  }

  let registryCommitted = false;
  try {
    await writeFile(temporaryRegistryPath, proposedRegistryText, { encoding: "utf8", flag: "wx" });

    const finalPlan = await createPublicDocumentActivationBatchPlan(planOptions);
    if (!plansMatch(plan, finalPlan)) {
      throw new Error("The Appendix IX batch, receipts, approvals, public PDFs or registry changed after planning. No registry write was made.");
    }
    const registryBeforeCommit = await readFile(registryPath, "utf8");
    if (sha256(registryBeforeCommit) !== plan.registrySha256Before) {
      throw new Error("The Appendix IX publication registry changed after planning. No registry write was made.");
    }

    if (beforeRegistryCommit) await beforeRegistryCommit();
    const registryImmediatelyBeforeCommit = await readFile(registryPath, "utf8");
    if (sha256(registryImmediatelyBeforeCommit) !== plan.registrySha256Before) {
      throw new Error("The Appendix IX publication registry changed during commit.");
    }
    const commitPlan = await createPublicDocumentActivationBatchPlan(planOptions);
    if (!plansMatch(plan, commitPlan)) {
      throw new Error("The Appendix IX batch, receipts, approvals or public PDFs changed during commit. No registry write was made.");
    }
    const finalRegistryText = await readFile(registryPath, "utf8");
    if (sha256(finalRegistryText) !== plan.registrySha256Before) {
      throw new Error("The Appendix IX publication registry changed during commit.");
    }

    await renameWithRetry(temporaryRegistryPath, registryPath);
    registryCommitted = true;

    return {
      mode: "local-atomic-document-batch-activation",
      status: "twelve-document-registry-activated-locally",
      receipt: {
        receiptVersion: 1,
        activationBatchId: plan.activationBatchId,
        metadataBatchSha256: plan.metadataBatchSha256,
        registrySha256Before: plan.registrySha256Before,
        registrySha256After: plan.registrySha256Proposed,
        records: plan.records.map((record) => ({
          recordId: record.recordId,
          bindingId: record.bindingId,
          sourceSha256: record.sourceSha256,
          stagedReceiptSha256: record.stagedReceiptSha256,
          publicFilename: record.publicFilename,
          bytes: record.bytes,
          pages: record.pages,
        })),
        recordsActivated: plan.records.length,
        totalBytes: plan.records.reduce((total, record) => total + record.bytes, 0),
        totalPages: plan.records.reduce((total, record) => total + record.pages, 0),
        publicFilesChanged: false,
        stagingPreserved: true,
        manifestApprovalGrantedByActivator: false,
        externalMalwareScanPerformed: false,
        deploymentPerformed: false,
        privateEvidenceIncluded: false,
        controlledPathsStored: false,
      },
    };
  } finally {
    if (!registryCommitted) await rm(temporaryRegistryPath, { force: true });
  }
}
