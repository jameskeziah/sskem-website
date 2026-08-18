import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import sharp from "sharp";

import approvalManifestData from "../content/approval-manifest.json" with { type: "json" };
import {
  createHomepageAchievementBindingProposal,
  homepageAchievementArtwork,
  validateHomepageAchievementPublicationRegistry,
  type HomepageAchievementApprovalManifestInput,
  type HomepageAchievementMediaRecordId,
  type HomepageAchievementPublicationBinding,
  type HomepageAchievementPublicationRegistryInput,
} from "./homepage-achievement-publication.ts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const defaultRegistryPath = path.resolve(projectRoot, "content", "homepage-achievement-publication-bindings.json");
const defaultAssetRoot = path.resolve(projectRoot, "public", "media", "home");

export const HOMEPAGE_ACHIEVEMENT_ACTIVATION_ACKNOWLEDGEMENT = "activate-approved-achievement-artwork";

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function withinDirectory(candidate: string, parent: string) {
  const relative = path.relative(parent, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function artworkFor(recordId: HomepageAchievementMediaRecordId) {
  const artwork = homepageAchievementArtwork.find((candidate) => candidate.mediaRecordId === recordId);
  if (!artwork) throw new Error(`Unknown homepage achievement media record: ${recordId}.`);
  return artwork;
}

function assetPathFor(recordId: HomepageAchievementMediaRecordId, assetRoot = defaultAssetRoot) {
  const artwork = artworkFor(recordId);
  const assetPath = path.resolve(assetRoot, artwork.src.replace(/^\/media\/home\//, ""));
  if (!withinDirectory(assetPath, path.resolve(assetRoot))) throw new Error(`${recordId} resolves outside the homepage media root.`);
  return assetPath;
}

async function readRegistry(registryPath: string) {
  let text: string;
  try {
    text = await readFile(registryPath, "utf8");
  } catch {
    throw new Error("Homepage achievement publication registry is missing or unreadable.");
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Homepage achievement publication registry is not valid JSON.");
  }
  if (!isRecord(value)) throw new Error("Homepage achievement publication registry must contain one JSON object.");
  return { text, registry: value as HomepageAchievementPublicationRegistryInput };
}

export async function inspectHomepageAchievementAsset(options: {
  recordId: HomepageAchievementMediaRecordId;
  assetRoot?: string;
}) {
  const assetPath = assetPathFor(options.recordId, path.resolve(options.assetRoot ?? defaultAssetRoot));
  let buffer: Buffer;
  try {
    buffer = await readFile(assetPath);
  } catch {
    throw new Error(`${options.recordId} artwork is missing or unreadable.`);
  }
  const metadata = await sharp(buffer).metadata();
  return {
    sourceSha256: sha256(buffer),
    bytes: buffer.length,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    format: metadata.format ?? "unknown",
  };
}

export async function verifyHomepageAchievementBindingArtifact(options: {
  binding: HomepageAchievementPublicationBinding;
  assetRoot?: string;
}) {
  try {
    const inspected = await inspectHomepageAchievementAsset({
      recordId: options.binding.mediaRecordId,
      assetRoot: options.assetRoot,
    });
    return isDeepStrictEqual(
      inspected,
      {
        sourceSha256: options.binding.sourceSha256,
        bytes: options.binding.bytes,
        width: options.binding.width,
        height: options.binding.height,
        format: options.binding.format,
      },
    ) ? [] : [`${options.binding.mediaRecordId} no longer matches its exact activated bytes.`];
  } catch (error) {
    return [error instanceof Error ? error.message : `${options.binding.mediaRecordId} artwork verification failed.`];
  }
}

function sameActivatedSource(existing: unknown, proposal: HomepageAchievementPublicationBinding) {
  if (!isRecord(existing)) return false;
  return existing.mediaRecordId === proposal.mediaRecordId
    && existing.claimRecordId === proposal.claimRecordId
    && existing.publicPath === proposal.publicPath
    && existing.sourceSha256 === proposal.sourceSha256
    && existing.bytes === proposal.bytes
    && existing.width === proposal.width
    && existing.height === proposal.height
    && existing.format === proposal.format;
}

function replacementWasReapproved(
  existing: unknown,
  manifest: HomepageAchievementApprovalManifestInput,
  mediaRecordId: HomepageAchievementMediaRecordId,
  claimRecordId: string,
) {
  if (!isRecord(existing) || typeof existing.activatedOn !== "string" || !Array.isArray(manifest.records)) return false;
  const previousActivation = Date.parse(existing.activatedOn);
  if (Number.isNaN(previousActivation)) return false;
  return [mediaRecordId, claimRecordId].every((recordId) => {
    const record = manifest.records?.find((candidate) => candidate.id === recordId);
    return typeof record?.approvedAt === "string"
      && !Number.isNaN(Date.parse(record.approvedAt))
      && Date.parse(record.approvedAt) > previousActivation;
  });
}

export async function createHomepageAchievementActivationPlan(options: {
  recordId: HomepageAchievementMediaRecordId;
  replace?: boolean;
  registryPath?: string;
  assetRoot?: string;
  manifest?: HomepageAchievementApprovalManifestInput;
  now?: Date | string | number;
}) {
  artworkFor(options.recordId);
  const registryPath = path.resolve(options.registryPath ?? defaultRegistryPath);
  const { text: registryText, registry } = await readRegistry(registryPath);
  if (!Array.isArray(registry.bindings)) throw new Error("Homepage achievement publication registry bindings must be an array.");
  const now = options.now instanceof Date
    ? new Date(options.now.getTime())
    : options.now === undefined
      ? new Date()
      : new Date(options.now);
  if (Number.isNaN(now.getTime())) throw new Error("Homepage achievement activation requires a valid time.");
  const inspected = await inspectHomepageAchievementAsset({ recordId: options.recordId, assetRoot: options.assetRoot });
  const candidate = createHomepageAchievementBindingProposal({
    mediaRecordId: options.recordId,
    ...inspected,
    activatedOn: now.toISOString(),
  });
  const existingIndex = registry.bindings.findIndex((binding) => isRecord(binding) && binding.mediaRecordId === options.recordId);
  const existing = existingIndex >= 0 ? registry.bindings[existingIndex] : null;
  const unchanged = existing !== null && sameActivatedSource(existing, candidate);
  const proposal = unchanged ? existing as HomepageAchievementPublicationBinding : candidate;
  const replacementBlocked = existing !== null && !unchanged && !options.replace;
  const manifest = options.manifest ?? approvalManifestData as HomepageAchievementApprovalManifestInput;
  const replacementNeedsReapproval = existing !== null
    && !unchanged
    && options.replace
    && !replacementWasReapproved(existing, manifest, candidate.mediaRecordId, candidate.claimRecordId);
  const nextBindings = unchanged || replacementBlocked
    ? registry.bindings
    : existingIndex >= 0
      ? registry.bindings.map((binding, index) => index === existingIndex ? proposal : binding)
      : [...registry.bindings, proposal];
  const nextRegistry = { ...registry, bindings: nextBindings } as HomepageAchievementPublicationRegistryInput;
  const validationIssues = validateHomepageAchievementPublicationRegistry({
    registry: nextRegistry,
    manifest,
    now,
  });
  const blockers = [
    ...(replacementBlocked ? [`${options.recordId} already has a different binding; use --replace only after the changed artwork is separately reviewed and approved.`] : []),
    ...(replacementNeedsReapproval ? [`${options.recordId} replacement requires newer approval timestamps for both the media and paired claim records.`] : []),
    ...validationIssues,
  ];
  const status = blockers.length ? "blocked" : unchanged ? "already-active" : "ready-for-explicit-write";
  return {
    planVersion: 1,
    recordId: options.recordId,
    status,
    blockers,
    proposal,
    nextRegistry,
    registrySha256Before: sha256(registryText),
    replacesBindingId: existing && isRecord(existing) && typeof existing.bindingId === "string" && !unchanged ? existing.bindingId : null,
    guardrails: {
      localWritePerformed: false,
      defaultMode: "local-plan",
      exactArtworkHashRequired: true,
      approvedMediaAndClaimRequired: true,
      manifestApprovalGrantedByActivator: false,
      replacementRequiresFlag: true,
      privateEvidenceIncluded: false,
    },
  } as const;
}

export async function executeHomepageAchievementActivation(options: {
  recordId: HomepageAchievementMediaRecordId;
  apply?: boolean;
  acknowledgement?: string;
  replace?: boolean;
  registryPath?: string;
  assetRoot?: string;
  manifest?: HomepageAchievementApprovalManifestInput;
  now?: Date | string | number;
}) {
  const plan = await createHomepageAchievementActivationPlan(options);
  if (!options.apply) return { mode: "local-plan", plan } as const;
  if (plan.status === "already-active") return { mode: "no-change", recordId: plan.recordId, bindingId: plan.proposal.bindingId } as const;
  if (plan.status !== "ready-for-explicit-write") throw new Error(`Homepage achievement activation is blocked: ${plan.blockers.join(" ")} No registry write was made.`);
  if (options.acknowledgement !== HOMEPAGE_ACHIEVEMENT_ACTIVATION_ACKNOWLEDGEMENT) {
    throw new Error(`Homepage achievement activation requires --acknowledge-local-write=${HOMEPAGE_ACHIEVEMENT_ACTIVATION_ACKNOWLEDGEMENT}. No registry write was made.`);
  }

  const registryPath = path.resolve(options.registryPath ?? defaultRegistryPath);
  const currentText = await readFile(registryPath, "utf8");
  if (sha256(currentText) !== plan.registrySha256Before) throw new Error("The homepage achievement registry changed after planning. Review a fresh plan; no registry write was made.");
  const artifactIssues = await verifyHomepageAchievementBindingArtifact({ binding: plan.proposal, assetRoot: options.assetRoot });
  if (artifactIssues.length) throw new Error(`Homepage achievement artwork changed after planning: ${artifactIssues.join(" ")} No registry write was made.`);

  await mkdir(path.dirname(registryPath), { recursive: true });
  const temporaryPath = path.join(path.dirname(registryPath), `.${path.basename(registryPath)}.${process.pid}-${Date.now()}.tmp`);
  try {
    await writeFile(temporaryPath, `${JSON.stringify(plan.nextRegistry, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, registryPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
  return {
    mode: "local-registry-write",
    receipt: {
      receiptVersion: 1,
      recordId: plan.recordId,
      bindingId: plan.proposal.bindingId,
      sourceSha256: plan.proposal.sourceSha256,
      replacedBindingId: plan.replacesBindingId,
      localWritePerformed: true,
      manifestApprovalGrantedByActivator: false,
      privateEvidenceIncluded: false,
    },
  } as const;
}
