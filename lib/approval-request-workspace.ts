export const APPROVAL_REQUEST_WORKSPACE_CONFIRMATION = "confirm-controlled-publication-approval";

export type ApprovalRequestWorkspaceTemplate = {
  readonly requestVersion: unknown;
  readonly recordId: unknown;
  readonly expectedRecordDigest: unknown;
  readonly decision: unknown;
  readonly checks: unknown;
  readonly evidenceReferences: unknown;
  readonly approvedByRole: unknown;
  readonly approvedAt: unknown;
  readonly expiresAt: unknown;
};

export type ApprovalRequestWorkspaceInput = {
  checks?: unknown;
  evidenceReferences?: unknown;
  approvedByRole?: unknown;
  expiryChoice?: unknown;
  expiresAt?: unknown;
  approvalConfirmation?: unknown;
};

const templateKeys = new Set([
  "requestVersion",
  "recordId",
  "expectedRecordDigest",
  "decision",
  "checks",
  "evidenceReferences",
  "approvedByRole",
  "approvedAt",
  "expiresAt",
]);
const releaseCheckStates = new Set(["verified", "not-applicable"]);
const recordIdPattern = /^(media|claim|document)-[a-z0-9-]+$/;
const digestPattern = /^[a-f0-9]{64}$/;
const evidenceReferencePattern = /^[A-Z0-9][A-Z0-9._/-]{2,79}$/;
const rolePattern = /^[a-z][a-z0-9-]{2,63}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function resolvedTime(value: Date | string | number | undefined) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) throw new Error("Approval request completion requires a valid time.");
  return date;
}

function validatedTemplate(template: ApprovalRequestWorkspaceTemplate) {
  if (!isRecord(template) || Object.keys(template).length !== templateKeys.size
    || Object.keys(template).some((key) => !templateKeys.has(key))
    || template.requestVersion !== 1
    || typeof template.recordId !== "string" || !recordIdPattern.test(template.recordId)
    || typeof template.expectedRecordDigest !== "string" || !digestPattern.test(template.expectedRecordDigest)
    || template.decision !== "approved"
    || !isRecord(template.checks) || Object.keys(template.checks).length === 0
    || Object.values(template.checks).some((state) => state !== null)
    || !Array.isArray(template.evidenceReferences) || template.evidenceReferences.length !== 0
    || template.approvedByRole !== null || template.approvedAt !== null
    || (template.expiresAt !== null && !validDate(template.expiresAt))) {
    throw new Error("The approval request template is stale, filled or invalid. Open a fresh workspace.");
  }
  return template as ApprovalRequestWorkspaceTemplate & {
    recordId: string;
    expectedRecordDigest: string;
    checks: Record<string, null>;
    expiresAt: string | null;
  };
}

function validatedChecks(templateChecks: Record<string, null>, value: unknown) {
  if (!isRecord(value)) throw new Error("Every approval check requires an explicit decision.");
  const requiredChecks = Object.keys(templateChecks);
  const suppliedChecks = Object.keys(value);
  if (requiredChecks.length !== suppliedChecks.length || requiredChecks.some((check) => !suppliedChecks.includes(check))) {
    throw new Error("The completed request must contain the exact checks from the current template.");
  }
  for (const check of requiredChecks) {
    if (!releaseCheckStates.has(value[check] as string)) {
      throw new Error(`Choose verified or not applicable for ${check.replaceAll("-", " ")}.`);
    }
  }
  return Object.fromEntries(requiredChecks.map((check) => [check, value[check]]));
}

function isPrivatePathLike(reference: string) {
  return /^[A-Z]:[\\/]/i.test(reference)
    || /^file:/i.test(reference)
    || reference.includes("://")
    || /(^|\/)\.\.?($|\/)/.test(reference);
}

function validatedEvidenceReferences(value: unknown) {
  if (!Array.isArray(value)) throw new Error("Enter at least one opaque controlled-record reference.");
  const references = value
    .filter((reference): reference is string => typeof reference === "string")
    .map((reference) => reference.trim())
    .filter(Boolean);
  if (!references.length) throw new Error("Enter at least one opaque controlled-record reference.");
  if (new Set(references).size !== references.length) throw new Error("Controlled-record references must be unique.");
  if (references.some((reference) => !evidenceReferencePattern.test(reference) || isPrivatePathLike(reference))) {
    throw new Error("Evidence must use opaque controlled-record references only, never paths, URLs, names or evidence text.");
  }
  return references;
}

function resolvedExpiry(templateExpiry: string | null, choice: unknown, value: unknown) {
  if (choice === "retain" && templateExpiry !== null) return templateExpiry;
  if (choice === "none") return null;
  if (choice === "date" && validDate(value)) return value;
  throw new Error("Choose deliberately whether this approval expires.");
}

export function createApprovalRequestCompletion(options: {
  template: ApprovalRequestWorkspaceTemplate;
  input: ApprovalRequestWorkspaceInput;
  now?: Date | string | number;
}) {
  const template = validatedTemplate(options.template);
  if (options.input.approvalConfirmation !== APPROVAL_REQUEST_WORKSPACE_CONFIRMATION) {
    throw new Error("Explicit final confirmation is required before downloading a completed request.");
  }
  const checks = validatedChecks(template.checks, options.input.checks);
  const evidenceReferences = validatedEvidenceReferences(options.input.evidenceReferences);
  const approvedByRole = typeof options.input.approvedByRole === "string" ? options.input.approvedByRole.trim() : "";
  if (!rolePattern.test(approvedByRole)) {
    throw new Error("Enter a lowercase role identifier, never an approver name or identity.");
  }
  const expiresAt = resolvedExpiry(template.expiresAt, options.input.expiryChoice, options.input.expiresAt);
  const approvedAt = resolvedTime(options.now);
  if (expiresAt !== null && expiresAt <= approvedAt.toISOString().slice(0, 10)) {
    throw new Error("The approval expiry date must be later than today.");
  }

  const request = {
    requestVersion: 1,
    recordId: template.recordId,
    expectedRecordDigest: template.expectedRecordDigest,
    decision: "approved",
    checks,
    evidenceReferences,
    approvedByRole,
    approvedAt: approvedAt.toISOString(),
    expiresAt,
  };

  return {
    filename: `sskem-approval-completed-${template.recordId}-${approvedAt.toISOString().slice(0, 10)}.json`,
    body: `${JSON.stringify(request, null, 2)}\n`,
    request,
    validation: {
      status: "ready-for-local-planner",
      recordId: template.recordId,
      checksCompleted: Object.keys(checks).length,
      evidenceReferencesRecorded: evidenceReferences.length,
    },
    guardrails: {
      networkRequestPerformed: false,
      serverPersistencePerformed: false,
      manifestWritePerformed: false,
      approvalGrantedByWorkspace: false,
      privateEvidenceIncluded: false,
      approverIdentityIncluded: false,
    },
  } as const;
}
