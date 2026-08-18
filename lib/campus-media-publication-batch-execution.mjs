import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { isDeepStrictEqual } from "node:util";

import {
  auditCampusMediaStagingBatch,
  createCampusMediaPublicationBatchPlan,
} from "./campus-media-publication-batch-plan.mjs";
import { campusMediaProjectRoot } from "./campus-media-pipeline.mjs";
import { verifyCampusMediaBindingArtifacts } from "./campus-media-activation.ts";
import { createCampusMediaBindingProposal } from "./campus-media-publication.ts";
import { campusMasterPreflightRecordIds } from "./campus-master-preflight.ts";

const defaultRegistryPath = path.resolve(campusMediaProjectRoot, "content", "campus-media-publication-bindings.json");
const defaultPublicRoot = path.resolve(campusMediaProjectRoot, "public", "media", "home", "production");

export const CAMPUS_MEDIA_PUBLICATION_BATCH_ACKNOWLEDGEMENT = "publish-four-approved-campus-media-records";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function withinDirectory(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function pathState(target) {
  try {
    const details = await stat(target);
    return details.isDirectory() ? "directory" : "non-directory";
  } catch (error) {
    if (error?.code === "ENOENT") return "absent";
    throw error;
  }
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

function publicReceiptFromStaging(stagingReceipt, proposal) {
  if (!isObject(stagingReceipt.source)
    || stagingReceipt.source.sha256 !== proposal.sourceSha256
    || !Number.isInteger(stagingReceipt.source.width)
    || !Number.isInteger(stagingReceipt.source.height)
    || !Number.isInteger(stagingReceipt.source.bytes)
    || typeof stagingReceipt.source.format !== "string"
    || typeof stagingReceipt.source.colourSpace !== "string"
    || stagingReceipt.source.containsEmbeddedMetadata !== false) {
    throw new Error(`${proposal.recordId} staging receipt does not contain the required public-safe source facts.`);
  }
  const receipt = {
    schemaVersion: 1,
    pipelineId: "sskem-campus-media",
    recordId: proposal.recordId,
    decisionAtPreparation: "approved",
    mode: "public",
    generatedAt: proposal.publishedOn,
    source: {
      format: stagingReceipt.source.format,
      width: stagingReceipt.source.width,
      height: stagingReceipt.source.height,
      colourSpace: stagingReceipt.source.colourSpace,
      bytes: stagingReceipt.source.bytes,
      containsEmbeddedMetadata: false,
      sha256: proposal.sourceSha256,
    },
    output: {
      profile: proposal.profile,
      crop: "none",
      embeddedMetadataPolicy: "EXIF, XMP and IPTC removed",
      variants: structuredClone(proposal.variants),
    },
  };
  if (!isDeepStrictEqual(createCampusMediaBindingProposal(receipt), proposal)) {
    throw new Error(`${proposal.recordId} public receipt does not reproduce the reviewed binding proposal.`);
  }
  return receipt;
}

async function preparePublicBatch({ plan, stagingRoot, temporaryPublicRoot }) {
  await mkdir(temporaryPublicRoot);
  for (const recordId of campusMasterPreflightRecordIds) {
    const proposal = plan.nextRegistry.bindings.find((binding) => binding?.recordId === recordId);
    if (!proposal) throw new Error(`${recordId} is missing from the reviewed publication plan.`);
    const stagedRecordRoot = path.resolve(stagingRoot, recordId);
    const targetRecordRoot = path.resolve(temporaryPublicRoot, recordId);
    if (!withinDirectory(stagedRecordRoot, stagingRoot) || !withinDirectory(targetRecordRoot, temporaryPublicRoot)) {
      throw new Error(`${recordId} escaped the campus publication transaction roots.`);
    }
    await mkdir(targetRecordRoot);
    const { value: stagingReceipt } = await readJsonObject(
      path.join(stagedRecordRoot, "intake-receipt.json"),
      `${recordId} staging receipt`,
    );
    const publicReceipt = publicReceiptFromStaging(stagingReceipt, proposal);
    await Promise.all(proposal.variants.map(async (variant) => {
      const source = path.resolve(stagedRecordRoot, variant.filename);
      const target = path.resolve(targetRecordRoot, variant.filename);
      if (!withinDirectory(source, stagedRecordRoot) || !withinDirectory(target, targetRecordRoot)) {
        throw new Error(`${recordId}/${variant.filename} escaped its derivative directory.`);
      }
      await copyFile(source, target);
    }));
    await writeFile(
      path.join(targetRecordRoot, "intake-receipt.json"),
      `${JSON.stringify(publicReceipt, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );
    const issues = await verifyCampusMediaBindingArtifacts({ binding: proposal, publicRoot: temporaryPublicRoot });
    if (issues.length) throw new Error(`Prepared ${recordId} publication failed verification: ${issues.join(" ")}`);
  }
}

export async function executeCampusMediaPublicationBatch({
  stagingPath,
  registryPath: suppliedRegistryPath,
  publicRoot: suppliedPublicRoot,
  manifest,
  now: suppliedNow,
  apply = false,
  acknowledgement,
  publicationBatchId,
  beforeRegistryCommit,
} = {}) {
  const now = suppliedNow instanceof Date ? suppliedNow : new Date(suppliedNow ?? Date.now());
  if (Number.isNaN(now.getTime())) throw new Error("Campus media first publication requires a valid time.");
  const registryPath = path.resolve(suppliedRegistryPath ?? defaultRegistryPath);
  const publicRoot = path.resolve(suppliedPublicRoot ?? defaultPublicRoot);
  const publicParent = path.dirname(publicRoot);
  if (publicParent === publicRoot || registryPath === publicRoot || withinDirectory(registryPath, publicRoot)) {
    throw new Error("Campus media publication paths overlap or are too broad for a first-publication transaction.");
  }

  const plan = await createCampusMediaPublicationBatchPlan({
    stagingPath,
    registryPath,
    publicRoot,
    manifest,
    now,
  });
  if (!apply) return { mode: "local-plan", plan };
  if (plan.status !== "ready-for-explicit-first-publication") {
    throw new Error(`Campus media first publication is blocked: ${plan.blockers.join(" ")} No public or registry write was made.`);
  }
  if (acknowledgement !== CAMPUS_MEDIA_PUBLICATION_BATCH_ACKNOWLEDGEMENT) {
    throw new Error(`Campus media first publication requires --acknowledge-local-write=${CAMPUS_MEDIA_PUBLICATION_BATCH_ACKNOWLEDGEMENT}. No public or registry write was made.`);
  }
  if (publicationBatchId !== plan.publicationBatchId) {
    throw new Error(`Campus media first publication requires --publication-batch-id=${plan.publicationBatchId} from the current reviewed plan. No public or registry write was made.`);
  }

  const startingStagedAudit = await auditCampusMediaStagingBatch({ stagingPath, now });
  if (startingStagedAudit.status !== "verified"
    || startingStagedAudit.batchSha256 !== plan.stagingBatchSha256
    || !isDeepStrictEqual(startingStagedAudit.proposals, plan.nextRegistry.bindings)) {
    throw new Error("The staged campus batch changed after planning. No public or registry write was made.");
  }
  const stagingRoot = path.resolve(startingStagedAudit.batchRoot);
  if (publicRoot === stagingRoot || withinDirectory(publicRoot, stagingRoot) || withinDirectory(stagingRoot, publicRoot)) {
    throw new Error("Private staging and public media roots must not overlap. No public or registry write was made.");
  }

  const nonce = `${process.pid}-${Date.now()}`;
  const temporaryPublicRoot = path.join(publicParent, `.${path.basename(publicRoot)}.${nonce}.tmp`);
  const temporaryRegistryPath = path.join(path.dirname(registryPath), `.${path.basename(registryPath)}.${nonce}.tmp`);
  if (!withinDirectory(temporaryPublicRoot, publicParent) || !withinDirectory(temporaryRegistryPath, path.dirname(registryPath))) {
    throw new Error("Campus publication transaction paths escaped their controlled parents.");
  }

  await Promise.all([
    mkdir(publicParent, { recursive: true }),
    mkdir(path.dirname(registryPath), { recursive: true }),
  ]);
  let publicCommitted = false;
  let registryCommitted = false;
  try {
    await preparePublicBatch({ plan, stagingRoot, temporaryPublicRoot });
    const proposedRegistryText = `${JSON.stringify(plan.nextRegistry, null, 2)}\n`;
    if (sha256(proposedRegistryText) !== plan.registrySha256Proposed) {
      throw new Error("The prepared registry no longer matches the reviewed publication plan.");
    }
    await writeFile(temporaryRegistryPath, proposedRegistryText, { encoding: "utf8", flag: "wx" });

    const finalStagedAudit = await auditCampusMediaStagingBatch({ stagingPath, now });
    if (finalStagedAudit.status !== "verified"
      || finalStagedAudit.batchSha256 !== plan.stagingBatchSha256
      || !isDeepStrictEqual(finalStagedAudit.proposals, plan.nextRegistry.bindings)) {
      throw new Error("The staged campus batch changed after planning. No public or registry write was made.");
    }
    const currentRegistryText = await readFile(registryPath, "utf8");
    if (sha256(currentRegistryText) !== plan.registrySha256Before) {
      throw new Error("The campus publication registry changed after planning. No public or registry write was made.");
    }
    if (await pathState(publicRoot) !== "absent") {
      throw new Error("The production campus media root appeared after planning. No public or registry write was made.");
    }

    await renameWithRetry(temporaryPublicRoot, publicRoot);
    publicCommitted = true;
    if (beforeRegistryCommit) await beforeRegistryCommit();
    const registryImmediatelyBeforeCommit = await readFile(registryPath, "utf8");
    if (sha256(registryImmediatelyBeforeCommit) !== plan.registrySha256Before) {
      throw new Error("The campus publication registry changed during commit.");
    }
    await renameWithRetry(temporaryRegistryPath, registryPath);
    registryCommitted = true;

    return {
      mode: "local-atomic-first-publication",
      status: "published-and-activated-locally",
      receipt: {
        receiptVersion: 1,
        publicationBatchId: plan.publicationBatchId,
        stagingBatchSha256: plan.stagingBatchSha256,
        registrySha256Before: plan.registrySha256Before,
        registrySha256After: plan.registrySha256Proposed,
        records: plan.records.map((record) => ({
          recordId: record.recordId,
          bindingId: record.proposedBindingId,
          sourceSha256: record.sourceSha256,
          variants: record.variants,
        })),
        recordsPublished: plan.records.length,
        derivativesPublished: plan.records.reduce((total, record) => total + record.variants, 0),
        stagingPreserved: true,
        manifestApprovalGrantedByPublisher: false,
        deploymentPerformed: false,
        sourceLocationsStored: false,
        sourceFilenamesStored: false,
      },
    };
  } catch (error) {
    let rollbackError = null;
    if (publicCommitted && !registryCommitted) {
      try {
        await renameWithRetry(publicRoot, temporaryPublicRoot);
        publicCommitted = false;
      } catch (failure) {
        rollbackError = failure;
      }
    }
    if (rollbackError) {
      throw new Error(`${error instanceof Error ? error.message : "Campus publication failed."} The newly prepared public root could not be rolled back automatically; the executor did not commit its registry change.`);
    }
    throw error;
  } finally {
    if (!publicCommitted) await rm(temporaryPublicRoot, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
    if (!registryCommitted) await rm(temporaryRegistryPath, { force: true });
  }
}
