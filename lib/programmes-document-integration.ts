import approvalManifestData from "../content/approval-manifest.json" with { type: "json" };

import {
  createPublicDocumentPublicationIndex,
  publicDocumentPublicationRegistry,
  publicDocumentUrl,
  validatePublicDocumentPublicationRegistry,
  type PublicDocumentApprovalManifestInput,
  type PublicDocumentId,
  type PublicDocumentPublicationRegistryInput,
} from "./public-document-publication.ts";
import {
  PROGRAMMES_PUBLICATION_ROUTES,
  type ProgrammesPublicationRoute,
} from "./programmes-publication-routes.ts";

export const PROGRAMME_DOCUMENT_KINDS = [
  "brochure",
  "timetable",
  "fee-circular",
  "affiliation-document",
] as const;

export type ProgrammeDocumentKind = (typeof PROGRAMME_DOCUMENT_KINDS)[number];

export const PROGRAMME_DOCUMENT_COMPATIBILITY = Object.freeze({
  brochure: Object.freeze([] as PublicDocumentId[]),
  timetable: Object.freeze(["mpd-c-2"] as PublicDocumentId[]),
  "fee-circular": Object.freeze(["mpd-c-1"] as PublicDocumentId[]),
  "affiliation-document": Object.freeze(["mpd-b-1", "mpd-b-3", "mpd-b-4"] as PublicDocumentId[]),
}) satisfies Readonly<Record<ProgrammeDocumentKind, readonly PublicDocumentId[]>>;

export type ProgrammeDocumentReference = Readonly<{
  id: string;
  kind: ProgrammeDocumentKind;
  documentId: PublicDocumentId;
}>;

export type ApprovedProgrammeDocument = Readonly<{
  source: "guarded-public-document-pipeline";
  id: string;
  kind: ProgrammeDocumentKind;
  title: string;
  description: string;
  href: string;
  format: "PDF";
  size: string;
  pages: number;
  status: "current" | "expiring-soon";
  academicYear: string | null;
  publicationYear: string | null;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string | null;
  language: "English" | "Marathi" | "English and Marathi";
  accessibilityStatus: "Tagged and accessible" | "Text-readable";
}>;

export type ProgrammeDocumentIntegrationIssue = Readonly<{
  code:
    | "INVALID_ROUTE"
    | "INVALID_REFERENCE"
    | "DUPLICATE_REFERENCE_ID"
    | "DUPLICATE_DOCUMENT_ID"
    | "INCOMPATIBLE_DOCUMENT_KIND"
    | "DOCUMENT_PIPELINE_INVALID"
    | "APPROVED_BINDING_MISSING"
    | "ROUTE_NOT_APPROVED";
  path: string;
  message: string;
}>;

type ManifestRecord = NonNullable<PublicDocumentApprovalManifestInput["records"]>[number];
type JsonRecord = Record<string, unknown>;

const documentKinds = new Set<string>(PROGRAMME_DOCUMENT_KINDS);
const programmeRoutes = new Set<string>(PROGRAMMES_PUBLICATION_ROUTES);
const referenceKeys = new Set(["id", "kind", "documentId"]);
const referenceIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const issuedDocuments = new WeakSet<object>();

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function issue(
  code: ProgrammeDocumentIntegrationIssue["code"],
  path: string,
  message: string,
): ProgrammeDocumentIntegrationIssue {
  return Object.freeze({ code, path, message });
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as JsonRecord)) deepFreeze(child);
  }
  return value;
}

function readableFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function targetApproved(record: ManifestRecord | undefined, route: ProgrammesPublicationRoute) {
  return Array.isArray(record?.publicTargets)
    && record.publicTargets.every((target) => typeof target === "string")
    && record.publicTargets.includes(route);
}

function validReference(value: unknown): value is ProgrammeDocumentReference {
  return isRecord(value)
    && Object.keys(value).every((key) => referenceKeys.has(key))
    && typeof value.id === "string"
    && referenceIdPattern.test(value.id)
    && typeof value.kind === "string"
    && documentKinds.has(value.kind)
    && typeof value.documentId === "string";
}

export function isPipelineApprovedProgrammeDocument(value: unknown): value is ApprovedProgrammeDocument {
  return Boolean(value && typeof value === "object" && issuedDocuments.has(value as object));
}

export function resolveApprovedProgrammeDocuments(options: {
  route: ProgrammesPublicationRoute;
  references: readonly ProgrammeDocumentReference[];
  registry?: PublicDocumentPublicationRegistryInput;
  manifest?: PublicDocumentApprovalManifestInput;
  now?: Date | string | number;
}) {
  const registry = options.registry ?? publicDocumentPublicationRegistry;
  const manifest = options.manifest ?? approvalManifestData as PublicDocumentApprovalManifestInput;
  const issues: ProgrammeDocumentIntegrationIssue[] = [];

  if (!programmeRoutes.has(options.route)) {
    issues.push(issue("INVALID_ROUTE", "route", "Document integration requires a governed Programme route."));
  }
  if (!Array.isArray(options.references) || options.references.length > 12) {
    issues.push(issue("INVALID_REFERENCE", "references", "Programme document references must be an array containing at most twelve records."));
  }
  if (issues.length) return deepFreeze({ ok: false as const, documents: [] as const, issues });

  const seenReferenceIds = new Set<string>();
  const seenDocumentIds = new Set<string>();
  for (const [index, reference] of options.references.entries()) {
    const path = `references[${index}]`;
    if (!validReference(reference)) {
      issues.push(issue("INVALID_REFERENCE", path, "Document reference fields are incomplete, unknown or malformed."));
      continue;
    }
    if (seenReferenceIds.has(reference.id)) issues.push(issue("DUPLICATE_REFERENCE_ID", `${path}.id`, `Reference ID ${reference.id} is duplicated.`));
    else seenReferenceIds.add(reference.id);
    if (seenDocumentIds.has(reference.documentId)) issues.push(issue("DUPLICATE_DOCUMENT_ID", `${path}.documentId`, `Document ${reference.documentId} is requested more than once.`));
    else seenDocumentIds.add(reference.documentId);

    const compatibleIds = PROGRAMME_DOCUMENT_COMPATIBILITY[reference.kind];
    if (!compatibleIds.includes(reference.documentId)) {
      issues.push(issue(
        "INCOMPATIBLE_DOCUMENT_KIND",
        `${path}.documentId`,
        `${reference.documentId} is not a guarded ${reference.kind} record.`,
      ));
    }
  }

  const pipelineIssues = validatePublicDocumentPublicationRegistry({ registry, manifest, now: options.now });
  if (pipelineIssues.length) {
    issues.push(issue(
      "DOCUMENT_PIPELINE_INVALID",
      "registry",
      "The guarded public-document registry or its approvals are invalid.",
    ));
  }
  if (issues.length) return deepFreeze({ ok: false as const, documents: [] as const, issues });

  const index = createPublicDocumentPublicationIndex({ registry, manifest, now: options.now });
  const records = new Map((manifest.records ?? []).map((record) => [record.id, record]));
  const documents: ApprovedProgrammeDocument[] = [];

  for (const [referenceIndex, reference] of options.references.entries()) {
    const binding = index.get(reference.documentId);
    if (!binding) {
      issues.push(issue(
        "APPROVED_BINDING_MISSING",
        `references[${referenceIndex}].documentId`,
        `${reference.documentId} has no current exact public-document binding.`,
      ));
      continue;
    }
    if (!targetApproved(records.get(binding.recordId), options.route)) {
      issues.push(issue(
        "ROUTE_NOT_APPROVED",
        `references[${referenceIndex}].documentId`,
        `${binding.recordId} is not approved for placement on ${options.route}.`,
      ));
      continue;
    }

    const document = deepFreeze({
      source: "guarded-public-document-pipeline" as const,
      id: reference.id,
      kind: reference.kind,
      title: binding.metadata.label,
      description: binding.metadata.publicNote,
      href: publicDocumentUrl(binding, registry),
      format: "PDF" as const,
      size: readableFileSize(binding.bytes),
      pages: binding.pages,
      status: binding.metadata.status,
      academicYear: binding.metadata.academicYear,
      publicationYear: binding.metadata.publicationYear,
      issuingAuthority: binding.metadata.issuingAuthority,
      issueDate: binding.metadata.issueDate,
      expiryDate: binding.metadata.expiryDate,
      language: binding.metadata.language,
      accessibilityStatus: binding.accessibilityStatus,
    });
    issuedDocuments.add(document);
    documents.push(document);
  }

  if (issues.length) return deepFreeze({ ok: false as const, documents: [] as const, issues });
  return deepFreeze({ ok: true as const, documents, issues: [] as const });
}
