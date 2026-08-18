import approvalManifestData from "../content/approval-manifest.json" with { type: "json" };

type UnknownRecord = Record<string, unknown>;
type ApprovalRecordInput = {
  id?: unknown;
  kind?: unknown;
  sourcePointer?: unknown;
  publicTargets?: unknown;
  checkProfile?: unknown;
  checks?: unknown;
  decision?: unknown;
  evidenceReferences?: unknown;
  approvedByRole?: unknown;
  approvedAt?: unknown;
  expiresAt?: unknown;
};

export type HomepageAchievementApprovalManifestInput = {
  records?: readonly ApprovalRecordInput[];
};

const releaseCheckStates = new Set(["verified", "not-applicable"]);
const requiredChecksByProfile = {
  "pupil-media": ["accuracy", "rights", "guardian-consent", "privacy", "institutional-status", "management-approval"],
  "result-claim": ["accuracy", "authoritative-source", "guardian-consent", "privacy", "institutional-status", "management-approval"],
  "institutional-claim": ["accuracy", "authoritative-source", "institutional-status", "management-approval"],
} as const;
const evidenceReferencePattern = /^[A-Z0-9][A-Z0-9._/-]{2,79}$/;
const rolePattern = /^[a-z][a-z0-9-]{2,63}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const homepageAchievementArtwork = [
  {
    src: "/media/home/class-x-results-2025-26.jpeg",
    sourcePointer: "public/media/home/class-x-results-2025-26.jpeg",
    mediaRecordId: "media-class-x-results-2025-26",
    claimRecordId: "claim-class-x-results-2025-26",
    claimProfile: "result-claim",
    title: "Class X results",
    meta: "School-supplied creative · 2025–26",
    alt: "SSKEMS Class X results artwork showing six student achievers and their published percentages.",
  },
  {
    src: "/media/home/xii-science-2025-26.jpeg",
    sourcePointer: "public/media/home/xii-science-2025-26.jpeg",
    mediaRecordId: "media-xii-science-2025-26",
    claimRecordId: "claim-xii-science-results-2025-26",
    claimProfile: "result-claim",
    title: "XII Science batch",
    meta: "School-supplied creative · 2025–26",
    alt: "SSKEMS XII Science batch results artwork showing seven student achievers and their published percentages.",
  },
  {
    src: "/media/home/rangotsav-2025-26.jpeg",
    sourcePointer: "public/media/home/rangotsav-2025-26.jpeg",
    mediaRecordId: "media-rangotsav-2025-26",
    claimRecordId: "claim-rangotsav-awards-2025-26",
    claimProfile: "result-claim",
    title: "Rangotsav recognition",
    meta: "School-supplied creative · 2025–26",
    alt: "SSKEMS Rangotsav celebration artwork showing five pupils named as Art Maestro award recipients.",
  },
  {
    src: "/media/home/result-and-admissions-2025-26.jpg",
    sourcePointer: "public/media/home/result-and-admissions-2025-26.jpg",
    mediaRecordId: "media-result-admissions-2025-26",
    claimRecordId: "claim-engineering-medical-guidance",
    claimProfile: "institutional-claim",
    title: "Results and admissions update",
    meta: "School-supplied creative · 2025–26",
    alt: "Combined SSKEMS Class X first-rank and engineering and medical admissions guidance artwork.",
  },
] as const;

export type HomepageAchievementArtwork = (typeof homepageAchievementArtwork)[number];
export type HomepageAchievementPublicationMode = "private-review" | "public";

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toTime(value: Date | string | number | undefined) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return Date.parse(value);
  return Date.now();
}

function validCurrentApproval(record: ApprovalRecordInput | undefined, now: number) {
  if (!record || record.decision !== "approved") return false;
  if (!isRecord(record.checks) || !Object.keys(record.checks).length) return false;
  if (typeof record.checkProfile !== "string" || !(record.checkProfile in requiredChecksByProfile)) return false;
  const checks = record.checks;
  const requiredChecks = requiredChecksByProfile[record.checkProfile as keyof typeof requiredChecksByProfile];
  if (requiredChecks.some((check) => !releaseCheckStates.has(String(checks[check])))) return false;
  if (Object.keys(checks).length !== requiredChecks.length) return false;
  if (!Array.isArray(record.evidenceReferences) || !record.evidenceReferences.length) return false;
  if (record.evidenceReferences.some((reference) => typeof reference !== "string" || !evidenceReferencePattern.test(reference))) return false;
  if (typeof record.approvedByRole !== "string" || !rolePattern.test(record.approvedByRole)) return false;
  if (typeof record.approvedAt !== "string" || Number.isNaN(Date.parse(record.approvedAt)) || Date.parse(record.approvedAt) > now) return false;
  if (record.expiresAt === null || record.expiresAt === undefined) return true;
  if (typeof record.expiresAt !== "string" || !datePattern.test(record.expiresAt)) return false;
  return Date.parse(`${record.expiresAt}T23:59:59.999Z`) >= now;
}

function expectedRecordIssues(
  record: ApprovalRecordInput | undefined,
  artwork: HomepageAchievementArtwork,
  kind: "media" | "claim",
) {
  const recordId = kind === "media" ? artwork.mediaRecordId : artwork.claimRecordId;
  const profile = kind === "media" ? "pupil-media" : artwork.claimProfile;
  const issues: string[] = [];
  if (!record) return [`${recordId} is missing from the approval manifest.`];
  if (record.kind !== kind) issues.push(`${recordId} must remain a ${kind} record.`);
  if (record.sourcePointer !== artwork.sourcePointer) issues.push(`${recordId} no longer points to the exact governed artwork.`);
  if (record.checkProfile !== profile) issues.push(`${recordId} must use the ${profile} check profile.`);
  if (!Array.isArray(record.publicTargets) || !record.publicTargets.includes("/")) issues.push(`${recordId} must govern the homepage target.`);
  return issues;
}

function publicationState(options: {
  manifest?: HomepageAchievementApprovalManifestInput;
  now?: Date | string | number;
} = {}) {
  const manifest = options.manifest ?? approvalManifestData as HomepageAchievementApprovalManifestInput;
  const now = toTime(options.now);
  const issues: string[] = [];
  if (!Number.isFinite(now)) return { eligible: new Set<string>(), issues: ["Homepage achievement publication requires a valid time."] };
  if (!Array.isArray(manifest.records)) return { eligible: new Set<string>(), issues: ["The approval manifest records must be an array."] };

  const relevantIds = new Set(homepageAchievementArtwork.flatMap((artwork) => [artwork.mediaRecordId, artwork.claimRecordId]));
  const relevantRecords = manifest.records.filter((record) => typeof record.id === "string" && relevantIds.has(record.id));
  const counts = new Map<string, number>();
  for (const record of relevantRecords) counts.set(String(record.id), (counts.get(String(record.id)) ?? 0) + 1);
  for (const [id, count] of counts) if (count > 1) issues.push(`${id} is duplicated in the approval manifest.`);
  const byId = new Map(relevantRecords.map((record) => [String(record.id), record]));
  const eligible = new Set<string>();

  for (const artwork of homepageAchievementArtwork) {
    const media = byId.get(artwork.mediaRecordId);
    const claim = byId.get(artwork.claimRecordId);
    issues.push(...expectedRecordIssues(media, artwork, "media"));
    issues.push(...expectedRecordIssues(claim, artwork, "claim"));
    if (
      expectedRecordIssues(media, artwork, "media").length === 0
      && expectedRecordIssues(claim, artwork, "claim").length === 0
      && validCurrentApproval(media, now)
      && validCurrentApproval(claim, now)
    ) {
      eligible.add(artwork.src);
    }
  }

  return { eligible, issues: [...new Set(issues)] };
}

export function selectHomepageAchievementArtwork(options: {
  mode: HomepageAchievementPublicationMode;
  manifest?: HomepageAchievementApprovalManifestInput;
  now?: Date | string | number;
}) {
  if (options.mode === "private-review") return [...homepageAchievementArtwork];
  const state = publicationState(options);
  if (state.issues.length) return [];
  return homepageAchievementArtwork.filter((artwork) => state.eligible.has(artwork.src));
}

export function homepageAchievementPublicationSummary(options: {
  manifest?: HomepageAchievementApprovalManifestInput;
  now?: Date | string | number;
} = {}) {
  const state = publicationState(options);
  const required = homepageAchievementArtwork.length;
  const approved = state.eligible.size;
  return {
    approved,
    required,
    publicProjectionSafe: state.issues.length === 0,
    releaseReady: state.issues.length === 0 && approved === required,
    issues: state.issues,
  } as const;
}
