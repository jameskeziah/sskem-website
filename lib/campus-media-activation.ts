import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import sharp from "sharp";

import approvalManifestData from "../content/approval-manifest.json" with { type: "json" };
import {
  campusMediaPublicationRoles,
  createCampusMediaBindingProposal,
  validateCampusMediaPublicationRegistry,
  type CampusMediaApprovalManifestInput,
  type CampusMediaPublicationBinding,
  type CampusMediaPublicationRegistryInput,
  type CampusRecordId,
} from "./campus-media-publication.ts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const defaultRegistryPath = path.resolve(projectRoot, "content", "campus-media-publication-bindings.json");
const defaultPublicRoot = path.resolve(projectRoot, "public", "media", "home", "production");

sharp.cache({ files: 0 });

export const CAMPUS_MEDIA_ACTIVATION_ACKNOWLEDGEMENT = "activate-approved-campus-media";

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

function encodedFormatMatches(buffer: Buffer, detectedFormat: string | undefined, expectedFormat: CampusMediaPublicationBinding["variants"][number]["format"]) {
  if (expectedFormat === "avif") {
    const brand = buffer.length >= 12 ? buffer.subarray(8, 12).toString("ascii") : "";
    return detectedFormat === "heif" && (brand === "avif" || brand === "avis");
  }
  return detectedFormat === expectedFormat;
}

async function readJsonObject(filePath: string, label: string) {
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch {
    throw new Error(`${label} is missing or unreadable.`);
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  if (!isRecord(value)) throw new Error(`${label} must contain one JSON object.`);
  return { text, value };
}

export async function verifyCampusMediaBindingArtifacts(options: {
  binding: CampusMediaPublicationBinding;
  publicRoot?: string;
}) {
  const publicRoot = path.resolve(options.publicRoot ?? defaultPublicRoot);
  const outputDirectory = path.resolve(publicRoot, options.binding.recordId);
  const issues: string[] = [];
  if (!withinDirectory(outputDirectory, publicRoot)) return [`${options.binding.recordId} resolves outside the production media root.`];

  for (const variant of options.binding.variants) {
    const variantPath = path.resolve(outputDirectory, variant.filename);
    if (!withinDirectory(variantPath, outputDirectory)) {
      issues.push(`${options.binding.recordId}/${variant.filename} resolves outside its derivative directory.`);
      continue;
    }
    try {
      const buffer = await readFile(variantPath);
      const metadata = await sharp(buffer).metadata();
      if (buffer.length !== variant.bytes) issues.push(`${options.binding.recordId}/${variant.filename} byte size does not match its binding.`);
      if (sha256(buffer) !== variant.sha256) issues.push(`${options.binding.recordId}/${variant.filename} hash does not match its binding.`);
      if (!encodedFormatMatches(buffer, metadata.format, variant.format)) issues.push(`${options.binding.recordId}/${variant.filename} encoded format does not match its binding.`);
      if (metadata.width !== variant.width || metadata.height !== variant.height) issues.push(`${options.binding.recordId}/${variant.filename} dimensions do not match its binding.`);
      if (metadata.space !== variant.colourSpace) issues.push(`${options.binding.recordId}/${variant.filename} colour space does not match its binding.`);
      if (metadata.exif || metadata.xmp || metadata.iptc) issues.push(`${options.binding.recordId}/${variant.filename} contains forbidden embedded metadata.`);
    } catch {
      issues.push(`${options.binding.recordId}/${variant.filename} is missing or unreadable.`);
    }
  }
  return issues;
}

export async function createCampusMediaActivationPlan(options: {
  recordId: CampusRecordId;
  replace?: boolean;
  registryPath?: string;
  publicRoot?: string;
  manifest?: CampusMediaApprovalManifestInput;
  now?: Date | string | number;
}) {
  if (!(options.recordId in campusMediaPublicationRoles)) throw new Error(`Unknown homepage campus media record: ${options.recordId}.`);

  const registryPath = path.resolve(options.registryPath ?? defaultRegistryPath);
  const publicRoot = path.resolve(options.publicRoot ?? defaultPublicRoot);
  const outputDirectory = path.resolve(publicRoot, options.recordId);
  if (!withinDirectory(outputDirectory, publicRoot)) throw new Error(`${options.recordId} resolves outside the production media root.`);

  const [{ text: registryText, value: registryValue }, { value: receipt }] = await Promise.all([
    readJsonObject(registryPath, "Campus media publication registry"),
    readJsonObject(path.join(outputDirectory, "intake-receipt.json"), `${options.recordId} public intake receipt`),
  ]);
  const registry = registryValue as CampusMediaPublicationRegistryInput;
  if (!Array.isArray(registry.bindings)) throw new Error("Campus media publication registry bindings must be an array.");
  const proposal = createCampusMediaBindingProposal(receipt);
  if (proposal.recordId !== options.recordId) throw new Error(`The public intake receipt belongs to ${proposal.recordId}, not ${options.recordId}.`);

  const artifactIssues = await verifyCampusMediaBindingArtifacts({ binding: proposal, publicRoot });
  if (artifactIssues.length) throw new Error(`Campus media activation artifact verification failed: ${artifactIssues.join(" ")}`);

  const bindings = registry.bindings;
  const existingIndex = bindings.findIndex((binding) => isRecord(binding) && binding.recordId === options.recordId);
  const existing = existingIndex >= 0 ? bindings[existingIndex] : null;
  const unchanged = existing !== null && isDeepStrictEqual(existing, proposal);
  const replacementBlocked = existing !== null && !unchanged && !options.replace;
  const nextBindings = unchanged || replacementBlocked
    ? bindings
    : existingIndex >= 0
      ? bindings.map((binding, index) => index === existingIndex ? proposal : binding)
      : [...bindings, proposal];
  const nextRegistry = { ...registry, bindings: nextBindings } as CampusMediaPublicationRegistryInput;
  const validationIssues = validateCampusMediaPublicationRegistry({
    registry: nextRegistry,
    manifest: options.manifest ?? approvalManifestData,
    now: options.now,
  });
  const blockers = [
    ...(replacementBlocked ? [`${options.recordId} already has a different binding; use --replace only after reviewing the new receipt.`] : []),
    ...validationIssues,
  ];
  const status = blockers.length
    ? "blocked"
    : unchanged
      ? "already-active"
      : "ready-for-explicit-write";

  return {
    planVersion: 1,
    recordId: options.recordId,
    status,
    blockers,
    proposal,
    nextRegistry,
    registrySha256Before: sha256(registryText),
    replacesBindingId: existing && isRecord(existing) && typeof existing.bindingId === "string" && !unchanged
      ? existing.bindingId
      : null,
    guardrails: {
      localWritePerformed: false,
      defaultMode: "local-plan",
      exactPublicReceiptRequired: true,
      exactArtifactHashesRequired: true,
      manifestApprovalGrantedByActivator: false,
      replacementRequiresFlag: true,
      privateEvidenceIncluded: false,
    },
  } as const;
}

export async function executeCampusMediaActivation(options: {
  recordId: CampusRecordId;
  apply?: boolean;
  acknowledgement?: string;
  replace?: boolean;
  registryPath?: string;
  publicRoot?: string;
  manifest?: CampusMediaApprovalManifestInput;
  now?: Date | string | number;
}) {
  const plan = await createCampusMediaActivationPlan(options);
  if (!options.apply) return { mode: "local-plan", plan } as const;
  if (plan.status === "already-active") {
    return { mode: "no-change", recordId: plan.recordId, bindingId: plan.proposal.bindingId } as const;
  }
  if (plan.status !== "ready-for-explicit-write") {
    throw new Error(`Campus media activation is blocked: ${plan.blockers.join(" ")} No registry write was made.`);
  }
  if (options.acknowledgement !== CAMPUS_MEDIA_ACTIVATION_ACKNOWLEDGEMENT) {
    throw new Error(`Campus media activation requires --acknowledge-local-write=${CAMPUS_MEDIA_ACTIVATION_ACKNOWLEDGEMENT}. No registry write was made.`);
  }

  const registryPath = path.resolve(options.registryPath ?? defaultRegistryPath);
  const currentText = await readFile(registryPath, "utf8");
  if (sha256(currentText) !== plan.registrySha256Before) {
    throw new Error("The campus media publication registry changed after planning. Review a fresh plan; no registry write was made.");
  }
  const finalArtifactIssues = await verifyCampusMediaBindingArtifacts({
    binding: plan.proposal,
    publicRoot: options.publicRoot,
  });
  if (finalArtifactIssues.length) {
    throw new Error(`Campus media derivatives changed after planning: ${finalArtifactIssues.join(" ")} No registry write was made.`);
  }

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
      variants: plan.proposal.variants.length,
      replacedBindingId: plan.replacesBindingId,
      localWritePerformed: true,
      manifestApprovalGrantedByActivator: false,
      privateEvidenceIncluded: false,
    },
  } as const;
}
