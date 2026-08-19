import {
  PUBLIC_DOCUMENT_ACTIVATION_BATCH_CONFIRMATION,
  PUBLIC_DOCUMENT_ACTIVATION_BATCH_ID,
  publicDocumentActivationBatchRecordIds,
} from "./public-document-activation-batch-contract.ts";
import {
  validatePublicDocumentActivationMetadata,
  type PublicDocumentActivationMetadataInput,
  type PublicDocumentRecordId,
} from "./public-document-publication.ts";

export const PUBLIC_DOCUMENT_METADATA_RECORD_CONFIRMATION = "confirm-reviewed-public-document-metadata";

type NullableChoice = "none" | "value";
type ExpiryChoice = "none" | "date";

export type PublicDocumentMetadataWorkspaceInput = {
  publicFilename?: unknown;
  label?: unknown;
  status?: unknown;
  academicYearChoice?: unknown;
  academicYear?: unknown;
  publicationYearChoice?: unknown;
  publicationYear?: unknown;
  issuingAuthority?: unknown;
  issueDate?: unknown;
  expiryDateChoice?: unknown;
  expiryDate?: unknown;
  language?: unknown;
  publicNote?: unknown;
  notes?: unknown;
  recordConfirmation?: unknown;
};

export type PublicDocumentActivationBatchWorkspaceInput = {
  documents?: Partial<Record<PublicDocumentRecordId, PublicDocumentMetadataWorkspaceInput>>;
  batchConfirmation?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableValue(options: {
  recordId: PublicDocumentRecordId;
  label: string;
  choice: unknown;
  value: unknown;
  valueChoice: NullableChoice | ExpiryChoice;
}) {
  const value = text(options.value);
  if (options.choice === "none") {
    if (value) throw new Error(`${options.recordId}: clear ${options.label} when “not applicable” is selected.`);
    return null;
  }
  if (options.choice !== options.valueChoice) {
    throw new Error(`${options.recordId}: choose whether ${options.label} applies.`);
  }
  return value;
}

function metadataFor(recordId: PublicDocumentRecordId, input: PublicDocumentMetadataWorkspaceInput, now: Date) {
  if (input.recordConfirmation !== PUBLIC_DOCUMENT_METADATA_RECORD_CONFIRMATION) {
    throw new Error(`${recordId}: confirm that every public metadata field was checked against the controlled source.`);
  }
  const metadata: PublicDocumentActivationMetadataInput = {
    schemaVersion: 1,
    recordId,
    publicFilename: text(input.publicFilename),
    label: text(input.label),
    status: text(input.status) as PublicDocumentActivationMetadataInput["status"],
    academicYear: nullableValue({
      recordId,
      label: "the academic year",
      choice: input.academicYearChoice,
      value: input.academicYear,
      valueChoice: "value",
    }),
    publicationYear: nullableValue({
      recordId,
      label: "the publication year",
      choice: input.publicationYearChoice,
      value: input.publicationYear,
      valueChoice: "value",
    }),
    issuingAuthority: text(input.issuingAuthority),
    issueDate: text(input.issueDate),
    expiryDate: nullableValue({
      recordId,
      label: "the expiry date",
      choice: input.expiryDateChoice,
      value: input.expiryDate,
      valueChoice: "date",
    }),
    language: text(input.language) as PublicDocumentActivationMetadataInput["language"],
    publicNote: text(input.publicNote),
    notes: text(input.notes),
  };
  const issues = validatePublicDocumentActivationMetadata(metadata, { recordId, now });
  if (issues.length) throw new Error(`${recordId}: ${issues.join(" ")}`);
  return metadata;
}

export function createPublicDocumentActivationBatchCompletion(options: {
  input: PublicDocumentActivationBatchWorkspaceInput;
  now?: Date | string | number;
}) {
  if (options.input.batchConfirmation !== PUBLIC_DOCUMENT_ACTIVATION_BATCH_CONFIRMATION) {
    throw new Error("Explicit final confirmation is required for the complete twelve-document metadata batch.");
  }
  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  if (Number.isNaN(now.getTime())) throw new Error("Appendix IX metadata batch completion requires a valid time.");

  const documents = publicDocumentActivationBatchRecordIds.map((recordId) => {
    const input = options.input.documents?.[recordId];
    if (!input) throw new Error(`Complete the public metadata for ${recordId}.`);
    return metadataFor(recordId, input, now);
  });
  const filenames = documents.map((document) => document.publicFilename);
  if (new Set(filenames).size !== filenames.length) {
    throw new Error("Every Appendix IX document must have a unique stable public PDF filename.");
  }

  const generatedAt = now.toISOString();
  const batch = {
    batchVersion: 1,
    batchId: PUBLIC_DOCUMENT_ACTIVATION_BATCH_ID,
    generatedAt,
    documents,
    batchConfirmation: PUBLIC_DOCUMENT_ACTIVATION_BATCH_CONFIRMATION,
  } as const;

  return {
    filename: `sskem-appendix-ix-document-metadata-${generatedAt.slice(0, 10)}.json`,
    body: `${JSON.stringify(batch, null, 2)}\n`,
    batch,
    validation: {
      status: "ready-for-local-batch-planner",
      documentsCompleted: documents.length,
      recordIds: [...publicDocumentActivationBatchRecordIds],
    },
    guardrails: {
      networkRequestPerformed: false,
      serverPersistencePerformed: false,
      documentFilesRead: false,
      manifestWritePerformed: false,
      registryWritePerformed: false,
      approvalGrantedByWorkspace: false,
      malwareScanPerformed: false,
      activationPerformed: false,
      privateEvidenceIncluded: false,
      controlledPathsStored: false,
    },
  } as const;
}
