import approvalManifestData from "../content/approval-manifest.json" with { type: "json" };
import registryData from "../content/public-document-publication-bindings.json" with { type: "json" };

type UnknownRecord = Record<string, unknown>;
type ApprovalRecordInput = {
  id?: unknown;
  kind?: unknown;
  publicTargets?: unknown;
  checkProfile?: unknown;
  decision?: unknown;
  checks?: unknown;
  evidenceReferences?: unknown;
  approvedByRole?: unknown;
  approvedAt?: unknown;
  expiresAt?: unknown;
};

export type PublicDocumentApprovalManifestInput = { records?: readonly ApprovalRecordInput[] };
export type PublicDocumentMetadata = {
  label: string;
  status: "current" | "expiring-soon";
  academicYear: string | null;
  publicationYear: string | null;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string | null;
  language: "English" | "Marathi" | "English and Marathi";
  publicNote: string;
};
export type PublicDocumentPublicationBinding = {
  bindingId: string;
  recordId: PublicDocumentRecordId;
  documentId: PublicDocumentId;
  publicFilename: string;
  sourceSha256: string;
  stagedReceiptSha256: string;
  bytes: number;
  pages: number;
  accessibilityStatus: "Tagged and accessible" | "Text-readable";
  publishedOn: string;
  metadata: PublicDocumentMetadata;
  notes: string;
};
export type PublicDocumentPublicationRegistryInput = {
  $schema?: unknown;
  schemaVersion?: unknown;
  registryId?: unknown;
  publicBasePath?: unknown;
  policy?: unknown;
  bindings?: unknown;
};
export type PublicDocumentActivationMetadataInput = PublicDocumentMetadata & {
  schemaVersion?: unknown;
  recordId?: unknown;
  publicFilename?: unknown;
  notes?: unknown;
};

const recordToDocument = {
  "document-mpd-b-1": "mpd-b-1",
  "document-mpd-b-2": "mpd-b-2",
  "document-mpd-b-3": "mpd-b-3",
  "document-mpd-b-4": "mpd-b-4",
  "document-mpd-b-5": "mpd-b-5",
  "document-mpd-b-6": "mpd-b-6",
  "document-mpd-b-7": "mpd-b-7",
  "document-mpd-b-8": "mpd-b-8",
  "document-mpd-c-1": "mpd-c-1",
  "document-mpd-c-2": "mpd-c-2",
  "document-mpd-c-3": "mpd-c-3",
  "document-mpd-c-4": "mpd-c-4",
} as const;

export type PublicDocumentRecordId = keyof typeof recordToDocument;
export type PublicDocumentId = (typeof recordToDocument)[PublicDocumentRecordId];

const sha256Pattern = /^[a-f0-9]{64}$/;
const bindingIdPattern = /^public-document-mpd-[bc]-[1-8]-[a-f0-9]{12}$/;
const filenamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*\.pdf$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const academicYearPattern = /^20\d{2}(?:[-–]20\d{2})?$/;
const evidenceReferencePattern = /^[A-Z0-9][A-Z0-9._/-]{2,79}$/;
const allowedLanguages = new Set(["English", "Marathi", "English and Marathi"]);
const topLevelKeys = new Set(["$schema", "schemaVersion", "registryId", "publicBasePath", "policy", "bindings"]);
const policyKeys = new Set(["approvedManifestRequired", "exactStagedReceiptHashRequired", "exactPublicPdfHashRequired", "externalMalwareEvidenceRequired", "privateEvidenceStoredInRepository", "notes"]);
const bindingKeys = new Set(["bindingId", "recordId", "documentId", "publicFilename", "sourceSha256", "stagedReceiptSha256", "bytes", "pages", "accessibilityStatus", "publishedOn", "metadata", "notes"]);
const metadataKeys = new Set(["label", "status", "academicYear", "publicationYear", "issuingAuthority", "issueDate", "expiryDate", "language", "publicNote"]);
const activationMetadataKeys = new Set(["schemaVersion", "recordId", "publicFilename", ...metadataKeys, "notes"]);

export const publicDocumentPublicationRegistry = registryData as unknown as PublicDocumentPublicationRegistryInput;
export const publicDocumentRecordMap = recordToDocument;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function unknownKeys(value: unknown, allowed: Set<string>) {
  return isRecord(value) ? Object.keys(value).filter((key) => !allowed.has(key)) : [];
}

function validDate(value: unknown) {
  return typeof value === "string" && datePattern.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function toTime(value: Date | string | number | undefined) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return Date.parse(value);
  return Date.now();
}

function validApproval(record: ApprovalRecordInput | undefined, now: number) {
  if (!record || record.kind !== "document" || record.checkProfile !== "public-document" || record.decision !== "approved") return false;
  if (!isRecord(record.checks) || record.checks["malware-scan"] !== "verified" || Object.values(record.checks).some((state) => state !== "verified" && state !== "not-applicable")) return false;
  if (!Array.isArray(record.evidenceReferences) || !record.evidenceReferences.length || record.evidenceReferences.some((reference) => typeof reference !== "string" || !evidenceReferencePattern.test(reference))) return false;
  if (typeof record.approvedByRole !== "string" || record.approvedByRole.trim().length < 3) return false;
  if (typeof record.approvedAt !== "string" || Number.isNaN(Date.parse(record.approvedAt)) || Date.parse(record.approvedAt) > now) return false;
  if (record.expiresAt === null || record.expiresAt === undefined) return true;
  return validDate(record.expiresAt) && Date.parse(`${record.expiresAt}T23:59:59.999Z`) >= now;
}

function validateMetadata(value: unknown, issues: string[], path: string, now: number) {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object.`);
    return;
  }
  if (unknownKeys(value, metadataKeys).length) issues.push(`${path} contains unknown fields.`);
  if (typeof value.label !== "string" || value.label.trim().length < 3 || value.label.length > 100) issues.push(`${path}.label is invalid.`);
  if (value.status !== "current" && value.status !== "expiring-soon") issues.push(`${path}.status is invalid.`);
  if (value.academicYear !== null && (typeof value.academicYear !== "string" || !academicYearPattern.test(value.academicYear))) issues.push(`${path}.academicYear is invalid.`);
  if (value.publicationYear !== null && (typeof value.publicationYear !== "string" || !/^20\d{2}$/.test(value.publicationYear))) issues.push(`${path}.publicationYear is invalid.`);
  if (typeof value.issuingAuthority !== "string" || value.issuingAuthority.trim().length < 3 || value.issuingAuthority.length > 160 || /awaiting|unknown|pending|tbd/i.test(value.issuingAuthority)) issues.push(`${path}.issuingAuthority must be a verified public value.`);
  if (!validDate(value.issueDate) || Date.parse(`${value.issueDate}T00:00:00.000Z`) > now) issues.push(`${path}.issueDate must be a valid non-future date.`);
  if (value.expiryDate !== null && !validDate(value.expiryDate)) issues.push(`${path}.expiryDate is invalid.`);
  if (validDate(value.issueDate) && validDate(value.expiryDate)) {
    const expiry = Date.parse(`${value.expiryDate}T23:59:59.999Z`);
    if (expiry < Date.parse(`${value.issueDate}T00:00:00.000Z`)) issues.push(`${path}.expiryDate precedes the issue date.`);
    if (expiry < now) issues.push(`${path}.expiryDate has passed.`);
    const daysRemaining = (expiry - now) / 86_400_000;
    if (daysRemaining <= 90 && value.status !== "expiring-soon") issues.push(`${path}.status must be expiring-soon within 90 days of expiry.`);
    if (daysRemaining > 90 && value.status !== "current") issues.push(`${path}.status must be current when expiry is more than 90 days away.`);
  } else if (value.expiryDate === null && value.status !== "current") {
    issues.push(`${path}.status must be current when no expiry date applies.`);
  }
  if (!allowedLanguages.has(value.language as string)) issues.push(`${path}.language is invalid.`);
  if (typeof value.publicNote !== "string" || value.publicNote.trim().length < 10 || value.publicNote.length > 500) issues.push(`${path}.publicNote is invalid.`);
  if (/[A-Za-z]:[\\/]|\\\\/.test(JSON.stringify(value))) issues.push(`${path} must not contain a controlled filesystem path.`);
}

function validRegistryPolicy(registry: PublicDocumentPublicationRegistryInput) {
  return registry.$schema === "./public-document-publication-bindings.schema.json"
    && registry.schemaVersion === 1
    && registry.registryId === "sskem-public-document-publication-bindings"
    && registry.publicBasePath === "/documents/production"
    && isRecord(registry.policy)
    && registry.policy.approvedManifestRequired === true
    && registry.policy.exactStagedReceiptHashRequired === true
    && registry.policy.exactPublicPdfHashRequired === true
    && registry.policy.externalMalwareEvidenceRequired === true
    && registry.policy.privateEvidenceStoredInRepository === false
    && typeof registry.policy.notes === "string"
    && registry.policy.notes.trim().length >= 20
    && unknownKeys(registry.policy, policyKeys).length === 0;
}

export function validatePublicDocumentActivationMetadata(value: unknown, options: { recordId?: PublicDocumentRecordId; now?: Date | string | number } = {}) {
  const issues: string[] = [];
  const now = toTime(options.now);
  if (!Number.isFinite(now)) return ["Activation metadata validation requires a valid time."];
  if (!isRecord(value)) return ["Activation metadata must contain one object."];
  if (unknownKeys(value, activationMetadataKeys).length) issues.push("Activation metadata contains unknown fields.");
  if (value.schemaVersion !== 1) issues.push("Activation metadata schemaVersion must be 1.");
  if (typeof value.recordId !== "string" || !(value.recordId in recordToDocument)) issues.push("Activation metadata recordId is invalid.");
  if (options.recordId && value.recordId !== options.recordId) issues.push(`Activation metadata belongs to ${String(value.recordId)}, not ${options.recordId}.`);
  if (typeof value.publicFilename !== "string" || !filenamePattern.test(value.publicFilename)) issues.push("Activation metadata publicFilename is invalid.");
  if (typeof value.notes !== "string" || value.notes.trim().length < 3 || value.notes.length > 500) issues.push("Activation metadata notes are invalid.");
  const publicMetadata = Object.fromEntries([...metadataKeys].map((key) => [key, value[key]]));
  validateMetadata(publicMetadata, issues, "Activation metadata", now);
  if (/[A-Za-z]:[\\/]|\\\\/.test(JSON.stringify(value))) issues.push("Activation metadata must not contain a controlled filesystem path.");
  return issues;
}

export function validatePublicDocumentPublicationRegistry(options: {
  registry?: PublicDocumentPublicationRegistryInput;
  manifest?: PublicDocumentApprovalManifestInput;
  now?: Date | string | number;
} = {}) {
  const registry = options.registry ?? publicDocumentPublicationRegistry;
  const manifest = options.manifest ?? approvalManifestData as PublicDocumentApprovalManifestInput;
  const now = toTime(options.now);
  const issues: string[] = [];
  if (!Number.isFinite(now)) return ["Public document publication validation requires a valid time."];
  if (unknownKeys(registry, topLevelKeys).length) issues.push("The public document publication registry contains unknown top-level fields.");
  if (!validRegistryPolicy(registry)) issues.push("The public document publication registry identity or policy is invalid.");
  if (!Array.isArray(registry.bindings)) return [...issues, "The public document publication registry bindings must be an array."];

  const manifestById = new Map((manifest.records ?? []).map((record) => [record.id, record]));
  const seenBindings = new Set<string>();
  const seenRecords = new Set<string>();
  const seenDocuments = new Set<string>();
  const seenFilenames = new Set<string>();
  for (const [index, value] of registry.bindings.entries()) {
    const path = `bindings[${index}]`;
    if (!isRecord(value)) {
      issues.push(`${path} must be an object.`);
      continue;
    }
    if (unknownKeys(value, bindingKeys).length) issues.push(`${path} contains unknown fields.`);
    if (typeof value.bindingId !== "string" || !bindingIdPattern.test(value.bindingId)) issues.push(`${path}.bindingId is invalid.`);
    else if (seenBindings.has(value.bindingId)) issues.push(`${path}.bindingId is duplicated.`);
    else seenBindings.add(value.bindingId);
    if (typeof value.recordId !== "string" || !(value.recordId in recordToDocument)) {
      issues.push(`${path}.recordId is not an Appendix IX document record.`);
      continue;
    }
    const recordId = value.recordId as PublicDocumentRecordId;
    if (typeof value.sourceSha256 === "string" && value.bindingId !== `public-${recordId}-${value.sourceSha256.slice(0, 12)}`) issues.push(`${path}.bindingId does not match its record and source hash.`);
    if (seenRecords.has(recordId)) issues.push(`${path}.recordId is duplicated.`);
    else seenRecords.add(recordId);
    if (value.documentId !== recordToDocument[recordId]) issues.push(`${path}.documentId does not match ${recordId}.`);
    else if (seenDocuments.has(value.documentId as string)) issues.push(`${path}.documentId is duplicated.`);
    else seenDocuments.add(value.documentId as string);
    if (typeof value.publicFilename !== "string" || !filenamePattern.test(value.publicFilename)) issues.push(`${path}.publicFilename is invalid.`);
    else if (seenFilenames.has(value.publicFilename)) issues.push(`${path}.publicFilename is duplicated.`);
    else seenFilenames.add(value.publicFilename);
    if (typeof value.sourceSha256 !== "string" || !sha256Pattern.test(value.sourceSha256)) issues.push(`${path}.sourceSha256 is invalid.`);
    if (typeof value.stagedReceiptSha256 !== "string" || !sha256Pattern.test(value.stagedReceiptSha256)) issues.push(`${path}.stagedReceiptSha256 is invalid.`);
    if (!Number.isInteger(value.bytes) || (value.bytes as number) < 1 || (value.bytes as number) > 25_000_000) issues.push(`${path}.bytes is invalid.`);
    if (!Number.isInteger(value.pages) || (value.pages as number) < 1 || (value.pages as number) > 300) issues.push(`${path}.pages is invalid.`);
    if (value.accessibilityStatus !== "Tagged and accessible" && value.accessibilityStatus !== "Text-readable") issues.push(`${path}.accessibilityStatus is not publication-ready.`);
    if (typeof value.publishedOn !== "string" || !dateTimePattern.test(value.publishedOn) || Number.isNaN(Date.parse(value.publishedOn)) || Date.parse(value.publishedOn) > now) issues.push(`${path}.publishedOn is invalid.`);
    if (typeof value.notes !== "string" || value.notes.trim().length < 3 || value.notes.length > 500) issues.push(`${path}.notes are invalid.`);
    if (/[A-Za-z]:[\\/]|\\\\/.test(JSON.stringify(value))) issues.push(`${path} must not contain a controlled filesystem path.`);
    validateMetadata(value.metadata, issues, `${path}.metadata`, now);
    if (!validApproval(manifestById.get(recordId), now)) issues.push(`${path} requires a current approved document record with verified external malware-scan evidence.`);
  }
  return issues;
}

export function createPublicDocumentPublicationIndex(options: {
  registry?: PublicDocumentPublicationRegistryInput;
  manifest?: PublicDocumentApprovalManifestInput;
  now?: Date | string | number;
} = {}) {
  const registry = options.registry ?? publicDocumentPublicationRegistry;
  if (validatePublicDocumentPublicationRegistry({ ...options, registry }).length || !Array.isArray(registry.bindings)) return new Map<PublicDocumentId, PublicDocumentPublicationBinding>();
  return new Map((registry.bindings as PublicDocumentPublicationBinding[]).map((binding) => [binding.documentId, binding]));
}

export function publicDocumentPublicationSummary(options: {
  registry?: PublicDocumentPublicationRegistryInput;
  manifest?: PublicDocumentApprovalManifestInput;
  now?: Date | string | number;
} = {}) {
  const registry = options.registry ?? publicDocumentPublicationRegistry;
  const recorded = Array.isArray(registry.bindings) ? registry.bindings.length : 0;
  const issues = validatePublicDocumentPublicationRegistry({ ...options, registry });
  const valid = issues.length ? 0 : createPublicDocumentPublicationIndex({ ...options, registry }).size;
  const required = Object.keys(recordToDocument).length;
  return { recorded, valid, required, releaseReady: valid === required, issues } as const;
}

export function publicDocumentUrl(binding: PublicDocumentPublicationBinding, registry: PublicDocumentPublicationRegistryInput = publicDocumentPublicationRegistry) {
  const base = typeof registry.publicBasePath === "string" ? registry.publicBasePath : "/documents/production";
  return `${base}/${binding.recordId}/${binding.publicFilename}`;
}

export function createPublicDocumentBindingProposal(options: {
  receipt: unknown;
  stagedReceiptSha256: string;
  metadata: unknown;
  publishedOn?: string;
}) {
  const receipt = options.receipt;
  const metadata = options.metadata;
  if (!isRecord(receipt) || receipt.schemaVersion !== 1 || receipt.pipelineId !== "sskem-public-document" || receipt.mode !== "staging") throw new Error("Staged receipt has an unsupported document-pipeline contract.");
  if (typeof receipt.recordId !== "string" || !(receipt.recordId in recordToDocument)) throw new Error("Staged receipt does not belong to an Appendix IX document record.");
  const recordId = receipt.recordId as PublicDocumentRecordId;
  const metadataIssues = validatePublicDocumentActivationMetadata(metadata, { recordId, now: options.publishedOn });
  if (metadataIssues.length) throw new Error(`Public document activation metadata is invalid: ${metadataIssues.join(" ")}`);
  if (!isRecord(receipt.source) || typeof receipt.source.sha256 !== "string" || !sha256Pattern.test(receipt.source.sha256)) throw new Error("Staged receipt source hash is invalid.");
  if (!Number.isInteger(receipt.source.bytes) || (receipt.source.bytes as number) < 1 || (receipt.source.bytes as number) > 25_000_000) throw new Error("Staged receipt source byte count is invalid.");
  if (!Number.isInteger(receipt.source.pages) || (receipt.source.pages as number) < 1 || (receipt.source.pages as number) > 300) throw new Error("Staged receipt source page count is invalid.");
  if (receipt.source.encrypted !== false) throw new Error("Staged receipt does not establish an unencrypted PDF.");
  if (!isRecord(receipt.safety) || receipt.safety.activeOrEmbeddedContent !== "not-detected") throw new Error("Staged receipt does not establish a static PDF.");
  if (!isRecord(receipt.accessibility) || receipt.accessibility.assessment !== "text-readable") throw new Error("Staged receipt still requires accessibility remediation.");
  if (typeof options.stagedReceiptSha256 !== "string" || !sha256Pattern.test(options.stagedReceiptSha256)) throw new Error("Staged receipt digest is invalid.");
  const publishedOn = options.publishedOn ?? new Date().toISOString();
  if (!dateTimePattern.test(publishedOn) || Number.isNaN(Date.parse(publishedOn))) throw new Error("Publication time is invalid.");
  const typedMetadata = metadata as PublicDocumentActivationMetadataInput;
  return {
    bindingId: `public-${recordId}-${receipt.source.sha256.slice(0, 12)}`,
    recordId,
    documentId: recordToDocument[recordId],
    publicFilename: typedMetadata.publicFilename as string,
    sourceSha256: receipt.source.sha256,
    stagedReceiptSha256: options.stagedReceiptSha256,
    bytes: receipt.source.bytes as number,
    pages: receipt.source.pages as number,
    accessibilityStatus: receipt.source.tagged === true ? "Tagged and accessible" : "Text-readable",
    publishedOn,
    metadata: Object.fromEntries([...metadataKeys].map((key) => [key, typedMetadata[key as keyof PublicDocumentMetadata]])) as unknown as PublicDocumentMetadata,
    notes: typedMetadata.notes as string,
  } satisfies PublicDocumentPublicationBinding;
}
