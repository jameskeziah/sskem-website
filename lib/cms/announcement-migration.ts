import approvalManifestData from "../../content/approval-manifest.json" with { type: "json" };
import intakeData from "../../content/editorial-announcement-intake.json" with { type: "json" };

type UnknownRecord = Record<string, unknown>;
type IntakeConfig = {
  $schema?: unknown;
  schemaVersion?: unknown;
  intakeId?: unknown;
  sourcePointer?: unknown;
  sourceStatus?: unknown;
  target?: unknown;
  policy?: unknown;
  approvalRecordId?: unknown;
  candidate?: unknown;
};
type ApprovalRecordInput = {
  id?: unknown;
  kind?: unknown;
  title?: unknown;
  decision?: unknown;
  expiresAt?: unknown;
};
type ApprovalManifestInput = { records?: readonly ApprovalRecordInput[] };

const claimIdPattern = /^claim-[a-z0-9-]+$/;

export const announcementIntakeConfig = intakeData as unknown as IntakeConfig;

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

function safeAnnouncementHref(value: unknown) {
  if (value === null) return true;
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > 500
    || value.trim() !== value
    || /[\\\u0000-\u001f\u007f<>"']/.test(value)
  ) return false;
  if (value.startsWith("/") && !value.startsWith("//")) {
    try {
      return new URL(value, "https://www.sskemschool.com").origin === "https://www.sskemschool.com";
    } catch {
      return false;
    }
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validateAnnouncementIntakeConfig(config: IntakeConfig) {
  const issues: string[] = [];
  if (unknownKeys(config, new Set(["$schema", "schemaVersion", "intakeId", "sourcePointer", "sourceStatus", "target", "policy", "approvalRecordId", "candidate"])).length) {
    issues.push("The announcement intake contains unknown top-level fields.");
  }
  if (config.$schema !== "./editorial-announcement-intake.schema.json") issues.push("The announcement intake schema pointer is invalid.");
  if (config.schemaVersion !== 1 || config.intakeId !== "cms-announcement-first-record") issues.push("The announcement intake identity is invalid.");
  if (config.sourcePointer !== "content/editorial-announcement-intake.json#candidate") issues.push("The announcement source pointer is invalid.");
  if (config.sourceStatus !== "awaiting-authoritative-source" && config.sourceStatus !== "candidate-ready") issues.push("The announcement source status is invalid.");
  if (!isRecord(config.target) || config.target.contentType !== "announcement" || config.target.documentId !== "announcement-homepage-first") {
    issues.push("The announcement target must remain the canonical first homepage record.");
  }
  if (unknownKeys(config.target, new Set(["contentType", "documentId"])).length) issues.push("The announcement target contains unknown fields.");
  if (
    !isRecord(config.policy)
    || config.policy.externalWritePerformed !== false
    || config.policy.draftOnly !== true
    || config.policy.privateDataAllowed !== false
    || config.policy.placeholderPublicationAllowed !== false
  ) issues.push("The announcement intake must remain draft-only, public-safe and placeholder-free.");
  if (unknownKeys(config.policy, new Set(["externalWritePerformed", "draftOnly", "privateDataAllowed", "placeholderPublicationAllowed", "notes"])).length) {
    issues.push("The announcement policy contains unknown fields.");
  }
  if (isRecord(config.policy) && (typeof config.policy.notes !== "string" || config.policy.notes.trim().length < 3)) issues.push("The announcement policy requires operational notes.");
  if (!isRecord(config.candidate) || unknownKeys(config.candidate, new Set(["title", "message", "href"])).length) {
    issues.push("The announcement candidate shape is invalid.");
    return issues;
  }

  if (config.sourceStatus === "awaiting-authoritative-source") {
    if (config.approvalRecordId !== null || config.candidate.title !== null || config.candidate.message !== null || config.candidate.href !== null) {
      issues.push("Awaiting-source intake must not contain placeholder announcement copy or an approval reference.");
    }
    return issues;
  }

  if (
    typeof config.candidate.title !== "string"
    || config.candidate.title.trim() !== config.candidate.title
    || config.candidate.title.length < 5
    || config.candidate.title.length > 100
  ) issues.push("Candidate-ready announcements require an exact 5-100 character title.");
  if (
    typeof config.candidate.message !== "string"
    || config.candidate.message.trim() !== config.candidate.message
    || config.candidate.message.length < 10
    || config.candidate.message.length > 500
  ) issues.push("Candidate-ready announcements require an exact 10-500 character public message.");
  if (!safeAnnouncementHref(config.candidate.href)) issues.push("The announcement link must be null, an internal path or an HTTPS URL.");
  if (config.approvalRecordId !== null && (typeof config.approvalRecordId !== "string" || !claimIdPattern.test(config.approvalRecordId))) {
    issues.push("The announcement approval record must be null or a claim ID.");
  }
  return issues;
}

export function createAnnouncementMigrationPacket(options: {
  config?: IntakeConfig;
  manifest?: ApprovalManifestInput;
  now?: Date | string | number;
} = {}) {
  const config = options.config ?? announcementIntakeConfig;
  const issues = validateAnnouncementIntakeConfig(config);
  if (issues.length || !isRecord(config.target) || !isRecord(config.candidate)) {
    throw new Error(`Announcement intake configuration failed: ${issues.join(" ")}`);
  }
  const now = options.now instanceof Date
    ? options.now.getTime()
    : typeof options.now === "number"
      ? options.now
      : typeof options.now === "string"
        ? Date.parse(options.now)
        : Date.now();
  if (!Number.isFinite(now)) throw new Error("Announcement intake requires a valid review time.");

  const manifest = options.manifest ?? approvalManifestData as unknown as ApprovalManifestInput;
  const approvalRecordId = typeof config.approvalRecordId === "string" ? config.approvalRecordId : null;
  const approvalRecord = approvalRecordId
    ? (manifest.records ?? []).find((record) => record.id === approvalRecordId)
    : undefined;
  if (approvalRecord && approvalRecord.kind !== "claim") throw new Error("The announcement approval reference must point to a claim record.");

  const sourceReady = config.sourceStatus === "candidate-ready";
  const approvalRecordReady = Boolean(approvalRecordId && approvalRecord?.kind === "claim");
  const approvalCurrent = approvalRecordReady && validApproval(approvalRecord, now);
  const status = !sourceReady
    ? "source-required"
    : !approvalRecordReady
      ? "approval-record-required"
      : approvalCurrent
        ? "ready-for-manual-draft"
        : "review-required";
  const approvalRecordIds = approvalRecordId ? [approvalRecordId] : [];
  const sanityDraft = sourceReady
    ? {
        _id: config.target.documentId,
        _type: config.target.contentType,
        title: config.candidate.title as string,
        message: config.candidate.message as string,
        ...(typeof config.candidate.href === "string" ? { href: config.candidate.href } : {}),
        publication: {
          state: "draft",
          ...(approvalRecordIds.length ? { approvalRecordIds } : {}),
          contentOwnerRole: "website-content-owner",
        },
      }
    : null;

  return {
    packetVersion: 1,
    intakeId: config.intakeId,
    generatedAt: new Date(now).toISOString(),
    status,
    source: { pointer: config.sourcePointer, status: config.sourceStatus },
    target: { contentType: config.target.contentType, documentId: config.target.documentId },
    candidate: sourceReady
      ? { title: config.candidate.title, message: config.candidate.message, href: config.candidate.href }
      : null,
    approval: {
      recordId: approvalRecordId,
      title: typeof approvalRecord?.title === "string" ? approvalRecord.title : null,
      decision: typeof approvalRecord?.decision === "string" ? approvalRecord.decision : "missing",
      current: Boolean(approvalCurrent),
    },
    blockingRequirements: [
      ...(!sourceReady ? ["authoritative-announcement-source"] : []),
      ...(!approvalRecordReady ? ["matching-claim-approval-record"] : []),
      ...(approvalRecordReady && !approvalCurrent ? ["current-claim-approval"] : []),
    ],
    blockingApprovalRecordIds: approvalRecordId && !approvalCurrent ? [approvalRecordId] : [],
    sanityDraft,
    reviewerActions: [
      "Supply the exact dated school announcement; do not create generic placeholder copy.",
      "Check the title, public message, destination, effective dates and content owner.",
      "Create or update the matching claim in the canonical manifest without storing evidence or identities in the repository.",
      "After claim approval, create a draft in Studio and complete exact-revision review before publication.",
    ],
    guardrails: {
      externalWritePerformed: false,
      publicationState: "draft",
      privateDataIncluded: false,
      placeholderCopyIncluded: false,
      approvalGrantedByPacket: false,
    },
  } as const;
}
