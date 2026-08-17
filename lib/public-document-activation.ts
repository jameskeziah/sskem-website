import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import approvalManifestData from "../content/approval-manifest.json" with { type: "json" };
import {
  createPublicDocumentBindingProposal,
  publicDocumentPublicationRegistry,
  publicDocumentRecordMap,
  validatePublicDocumentActivationMetadata,
  validatePublicDocumentPublicationRegistry,
  type PublicDocumentActivationMetadataInput,
  type PublicDocumentApprovalManifestInput,
  type PublicDocumentPublicationBinding,
  type PublicDocumentPublicationRegistryInput,
  type PublicDocumentRecordId,
} from "./public-document-publication.ts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const defaultRegistryPath = path.resolve(projectRoot, "content", "public-document-publication-bindings.json");
const defaultStagingRoot = path.resolve(projectRoot, "work", "document-intake");
const defaultPublicRoot = path.resolve(projectRoot, "public", "documents", "production");

export const PUBLIC_DOCUMENT_ACTIVATION_ACKNOWLEDGEMENT = "activate-approved-public-document";

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

function publicationTime(value: Date | string | number | undefined) {
  const date = value instanceof Date ? value : value === undefined ? new Date() : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Public document activation requires a valid time.");
  return date.toISOString();
}

export async function verifyPublicDocumentBindingArtifact(options: {
  binding: PublicDocumentPublicationBinding;
  publicRoot?: string;
}) {
  const publicRoot = path.resolve(options.publicRoot ?? defaultPublicRoot);
  const outputDirectory = path.resolve(publicRoot, options.binding.recordId);
  const publicPath = path.resolve(outputDirectory, options.binding.publicFilename);
  const issues: string[] = [];
  if (!withinDirectory(outputDirectory, publicRoot) || !withinDirectory(publicPath, outputDirectory)) return [`${options.binding.recordId} resolves outside the production document root.`];
  try {
    const buffer = await readFile(publicPath);
    if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-", "ascii"))) issues.push(`${options.binding.recordId}/${options.binding.publicFilename} is not an encoded PDF.`);
    if (buffer.length !== options.binding.bytes) issues.push(`${options.binding.recordId}/${options.binding.publicFilename} byte size does not match its binding.`);
    if (sha256(buffer) !== options.binding.sourceSha256) issues.push(`${options.binding.recordId}/${options.binding.publicFilename} hash does not match its binding.`);
  } catch {
    issues.push(`${options.binding.recordId}/${options.binding.publicFilename} is missing or unreadable.`);
  }
  return issues;
}

export async function auditPublicDocumentPublicationArtifacts(options: {
  registry?: PublicDocumentPublicationRegistryInput;
  manifest?: PublicDocumentApprovalManifestInput;
  publicRoot?: string;
  now?: Date | string | number;
} = {}) {
  const registry = options.registry ?? publicDocumentPublicationRegistry;
  const issues = validatePublicDocumentPublicationRegistry({ registry, manifest: options.manifest, now: options.now });
  if (issues.length || !Array.isArray(registry.bindings)) return issues;
  const artifactIssues = await Promise.all((registry.bindings as PublicDocumentPublicationBinding[]).map((binding) => verifyPublicDocumentBindingArtifact({ binding, publicRoot: options.publicRoot })));
  return artifactIssues.flat();
}

export async function createPublicDocumentActivationPlan(options: {
  recordId: PublicDocumentRecordId;
  metadata: PublicDocumentActivationMetadataInput;
  replace?: boolean;
  registryPath?: string;
  stagingRoot?: string;
  publicRoot?: string;
  manifest?: PublicDocumentApprovalManifestInput;
  now?: Date | string | number;
}) {
  if (!(options.recordId in publicDocumentRecordMap)) throw new Error(`Unknown Appendix IX document record: ${options.recordId}.`);
  const publishedOn = publicationTime(options.now);
  const metadataIssues = validatePublicDocumentActivationMetadata(options.metadata, { recordId: options.recordId, now: publishedOn });
  if (metadataIssues.length) throw new Error(`Public document activation metadata is invalid: ${metadataIssues.join(" ")}`);

  const registryPath = path.resolve(options.registryPath ?? defaultRegistryPath);
  const stagingRoot = path.resolve(options.stagingRoot ?? defaultStagingRoot);
  const publicRoot = path.resolve(options.publicRoot ?? defaultPublicRoot);
  const receiptPath = path.resolve(stagingRoot, options.recordId, "intake-receipt.json");
  if (!withinDirectory(receiptPath, stagingRoot)) throw new Error(`${options.recordId} resolves outside the document staging root.`);

  const [{ text: registryText, value: registryValue }, { text: receiptText, value: receipt }] = await Promise.all([
    readJsonObject(registryPath, "Public document publication registry"),
    readJsonObject(receiptPath, `${options.recordId} staged intake receipt`),
  ]);
  const registry = registryValue as PublicDocumentPublicationRegistryInput;
  if (!Array.isArray(registry.bindings)) throw new Error("Public document publication registry bindings must be an array.");
  const proposal = createPublicDocumentBindingProposal({
    receipt,
    stagedReceiptSha256: sha256(receiptText),
    metadata: options.metadata,
    publishedOn,
  });
  if (proposal.recordId !== options.recordId) throw new Error(`The staged intake receipt belongs to ${proposal.recordId}, not ${options.recordId}.`);

  const artifactIssues = await verifyPublicDocumentBindingArtifact({ binding: proposal, publicRoot });
  if (artifactIssues.length) throw new Error(`Public document activation artifact verification failed: ${artifactIssues.join(" ")}`);

  const existingIndex = registry.bindings.findIndex((binding) => isRecord(binding) && binding.recordId === options.recordId);
  const existing = existingIndex >= 0 ? registry.bindings[existingIndex] : null;
  const unchanged = existing !== null && isDeepStrictEqual(existing, proposal);
  const replacementBlocked = existing !== null && !unchanged && !options.replace;
  const nextBindings = unchanged || replacementBlocked
    ? registry.bindings
    : existingIndex >= 0
      ? registry.bindings.map((binding, index) => index === existingIndex ? proposal : binding)
      : [...registry.bindings, proposal];
  const nextRegistry = { ...registry, bindings: nextBindings } as PublicDocumentPublicationRegistryInput;
  const validationIssues = validatePublicDocumentPublicationRegistry({
    registry: nextRegistry,
    manifest: options.manifest ?? approvalManifestData,
    now: publishedOn,
  });
  const blockers = [
    ...(replacementBlocked ? [`${options.recordId} already has a different binding; use --replace only after reviewing the new staged receipt and public metadata.`] : []),
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
      exactStagedReceiptRequired: true,
      exactPublicPdfHashRequired: true,
      manifestApprovalGrantedByActivator: false,
      externalMalwareEvidenceRequired: true,
      replacementRequiresFlag: true,
      privateEvidenceIncluded: false,
    },
  } as const;
}

export async function executePublicDocumentActivation(options: {
  recordId: PublicDocumentRecordId;
  metadata: PublicDocumentActivationMetadataInput;
  apply?: boolean;
  acknowledgement?: string;
  replace?: boolean;
  registryPath?: string;
  stagingRoot?: string;
  publicRoot?: string;
  manifest?: PublicDocumentApprovalManifestInput;
  now?: Date | string | number;
}) {
  const plan = await createPublicDocumentActivationPlan(options);
  if (!options.apply) return { mode: "local-plan", plan } as const;
  if (plan.status === "already-active") return { mode: "no-change", recordId: plan.recordId, bindingId: plan.proposal.bindingId } as const;
  if (plan.status !== "ready-for-explicit-write") throw new Error(`Public document activation is blocked: ${plan.blockers.join(" ")} No registry write was made.`);
  if (options.acknowledgement !== PUBLIC_DOCUMENT_ACTIVATION_ACKNOWLEDGEMENT) throw new Error(`Public document activation requires --acknowledge-local-write=${PUBLIC_DOCUMENT_ACTIVATION_ACKNOWLEDGEMENT}. No registry write was made.`);

  const registryPath = path.resolve(options.registryPath ?? defaultRegistryPath);
  const currentText = await readFile(registryPath, "utf8");
  if (sha256(currentText) !== plan.registrySha256Before) throw new Error("The public document publication registry changed after planning. Review a fresh plan; no registry write was made.");
  const finalArtifactIssues = await verifyPublicDocumentBindingArtifact({ binding: plan.proposal, publicRoot: options.publicRoot });
  if (finalArtifactIssues.length) throw new Error(`The public PDF changed after planning: ${finalArtifactIssues.join(" ")} No registry write was made.`);

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
      publicFilename: plan.proposal.publicFilename,
      replacedBindingId: plan.replacesBindingId,
      localWritePerformed: true,
      manifestApprovalGrantedByActivator: false,
      privateEvidenceIncluded: false,
    },
  } as const;
}
