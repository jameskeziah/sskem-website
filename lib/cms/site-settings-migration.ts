import approvalManifestData from "../../content/approval-manifest.json" with { type: "json" };
import migrationData from "../../content/editorial-site-settings-migration.json" with { type: "json" };

// @ts-expect-error Node's native type-stripping test runner requires the explicit TypeScript extension.
import { siteFacts } from "../../app/data/site.ts";

type UnknownRecord = Record<string, unknown>;

type MigrationConfig = {
  $schema?: unknown;
  schemaVersion?: unknown;
  migrationId?: unknown;
  sourcePointer?: unknown;
  target?: unknown;
  policy?: unknown;
  fields?: unknown;
};

type ApprovalRecordInput = {
  id?: unknown;
  kind?: unknown;
  title?: unknown;
  decision?: unknown;
  expiresAt?: unknown;
};

type ApprovalManifestInput = {
  records?: readonly ApprovalRecordInput[];
};

const fieldValues = {
  "contact.location": siteFacts.location,
  "contact.phone": siteFacts.phone,
  "contact.mobile": siteFacts.mobile,
  "contact.email": siteFacts.email,
  "contact.principalEmail": siteFacts.principalEmail,
  "contact.workingHours.weekdays": siteFacts.workingHours.weekdays,
  "contact.workingHours.saturday": siteFacts.workingHours.saturday,
} as const;

const expectedFields = new Set(Object.keys(fieldValues));
const claimIdPattern = /^claim-[a-z0-9-]+$/;

export const siteSettingsMigrationConfig = migrationData as unknown as MigrationConfig;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function unknownKeys(value: unknown, allowed: Set<string>) {
  return isRecord(value) ? Object.keys(value).filter((key) => !allowed.has(key)) : [];
}

function validApproval(record: ApprovalRecordInput | undefined, now: number) {
  if (!record || record.decision !== "approved") return false;
  if (record.expiresAt === null || record.expiresAt === undefined) return true;
  if (typeof record.expiresAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(record.expiresAt)) return false;
  return Date.parse(`${record.expiresAt}T23:59:59.999Z`) >= now;
}

export function validateSiteSettingsMigrationConfig(config: MigrationConfig) {
  const issues: string[] = [];
  if (unknownKeys(config, new Set(["$schema", "schemaVersion", "migrationId", "sourcePointer", "target", "policy", "fields"])).length) issues.push("The migration contains unknown top-level fields.");
  if (config.$schema !== "./editorial-site-settings-migration.schema.json") issues.push("The migration schema pointer is invalid.");
  if (config.schemaVersion !== 1 || config.migrationId !== "cms-site-settings-first-record") issues.push("The migration identity is invalid.");
  if (config.sourcePointer !== "app/data/site.ts#siteFacts") issues.push("The migration source must remain the reviewed local siteFacts record.");
  if (!isRecord(config.target) || config.target.contentType !== "siteSettings" || config.target.documentId !== "site-settings") issues.push("The migration target must remain the canonical siteSettings document.");
  if (unknownKeys(config.target, new Set(["contentType", "documentId"])).length) issues.push("The migration target contains unknown fields.");
  if (
    !isRecord(config.policy)
    || config.policy.externalWritePerformed !== false
    || config.policy.draftOnly !== true
    || config.policy.privateDataAllowed !== false
  ) issues.push("The migration must remain draft-only, local and public-safe.");
  if (unknownKeys(config.policy, new Set(["externalWritePerformed", "draftOnly", "privateDataAllowed", "notes"])).length) issues.push("The migration policy contains unknown fields.");
  if (isRecord(config.policy) && (typeof config.policy.notes !== "string" || config.policy.notes.trim().length < 3)) issues.push("The migration policy requires public-safe operational notes.");
  if (!Array.isArray(config.fields)) {
    issues.push("The migration field map is missing.");
    return issues;
  }

  const seenFields = new Set<string>();
  for (const entry of config.fields) {
    if (unknownKeys(entry, new Set(["field", "approvalRecordId"])).length) issues.push("A migration field mapping contains unknown fields.");
    if (!isRecord(entry) || typeof entry.field !== "string" || !expectedFields.has(entry.field)) {
      issues.push("The migration contains an unsupported field.");
      continue;
    }
    if (seenFields.has(entry.field)) issues.push(`The migration repeats ${entry.field}.`);
    seenFields.add(entry.field);
    if (typeof entry.approvalRecordId !== "string" || !claimIdPattern.test(entry.approvalRecordId)) issues.push(`${entry.field} has an invalid claim approval ID.`);
  }
  for (const field of expectedFields) if (!seenFields.has(field)) issues.push(`The migration omits ${field}.`);
  return issues;
}

export function createSiteSettingsMigrationPacket(options: {
  config?: MigrationConfig;
  manifest?: ApprovalManifestInput;
  now?: Date | string | number;
} = {}) {
  const config = options.config ?? siteSettingsMigrationConfig;
  const issues = validateSiteSettingsMigrationConfig(config);
  if (issues.length || !Array.isArray(config.fields) || !isRecord(config.target)) {
    throw new Error(`Site settings migration configuration failed: ${issues.join(" ")}`);
  }

  const now = options.now instanceof Date
    ? options.now.getTime()
    : typeof options.now === "number"
      ? options.now
      : typeof options.now === "string"
        ? Date.parse(options.now)
        : Date.now();
  if (!Number.isFinite(now)) throw new Error("Site settings migration requires a valid review time.");

  const manifest = options.manifest ?? approvalManifestData as unknown as ApprovalManifestInput;
  const manifestRecords = new Map((manifest.records ?? []).map((record) => [record.id, record]));
  const referencedApprovalIds = [...new Set(config.fields.map((entry) => (entry as UnknownRecord).approvalRecordId as string))];
  const invalidReferences = referencedApprovalIds.filter((id) => manifestRecords.get(id)?.kind !== "claim");
  if (invalidReferences.length) throw new Error(`Site settings migration references missing or non-claim approvals: ${invalidReferences.join(", ")}.`);
  const fields = config.fields.map((entry) => {
    const field = (entry as UnknownRecord).field as keyof typeof fieldValues;
    const approvalRecordId = (entry as UnknownRecord).approvalRecordId as string;
    const approval = manifestRecords.get(approvalRecordId);
    return {
      field,
      value: fieldValues[field],
      approvalRecordId,
      approvalTitle: typeof approval?.title === "string" ? approval.title : "Missing claim record",
      decision: typeof approval?.decision === "string" ? approval.decision : "missing",
      approvalCurrent: approval?.kind === "claim" && validApproval(approval, now),
    };
  });
  const approvalRecordIds = [...new Set(fields.map((field) => field.approvalRecordId))].sort();
  const blockingApprovals = approvalRecordIds.map((id) => manifestRecords.get(id)).filter((record) => !record || record.kind !== "claim" || !validApproval(record, now));

  return {
    packetVersion: 1,
    migrationId: config.migrationId,
    generatedAt: new Date(now).toISOString(),
    status: blockingApprovals.length ? "review-required" : "ready-for-manual-draft",
    source: {
      pointer: config.sourcePointer,
      reviewStatus: siteFacts.factStatus,
    },
    target: {
      contentType: config.target.contentType,
      documentId: config.target.documentId,
    },
    fieldComparison: fields,
    blockingApprovalRecordIds: blockingApprovals.map((record) => typeof record?.id === "string" ? record.id : "missing-claim-record"),
    sanityDraft: {
      _id: config.target.documentId,
      _type: config.target.contentType,
      contact: {
        location: siteFacts.location,
        phone: siteFacts.phone,
        mobile: siteFacts.mobile,
        email: siteFacts.email,
        principalEmail: siteFacts.principalEmail,
        workingHours: { ...siteFacts.workingHours },
      },
      publication: {
        state: "draft",
        approvalRecordIds,
        contentOwnerRole: "website-content-owner",
      },
    },
    reviewerActions: [
      "Verify every field against its controlling school record.",
      "Complete each listed claim approval in the controlled system and canonical manifest.",
      "Set lastReviewedAt and the publication window in Studio only after review.",
      "Publish the exact reviewed revision, then use the private revision screen to create its binding receipt.",
    ],
    guardrails: {
      externalWritePerformed: false,
      publicationState: "draft",
      privateDataIncluded: false,
      approvalGrantedByPacket: false,
    },
  } as const;
}
