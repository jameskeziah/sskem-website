import approvalManifestData from "../content/approval-manifest.json" with { type: "json" };
import publicationRegistryData from "../content/homepage-achievement-publication-bindings.json" with { type: "json" };

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

export type HomepageAchievementPublicationBinding = {
  bindingId: string;
  mediaRecordId: HomepageAchievementMediaRecordId;
  claimRecordId: HomepageAchievementClaimRecordId;
  publicPath: string;
  sourceSha256: string;
  bytes: number;
  width: 1400;
  height: 500;
  format: "jpeg";
  activatedOn: string;
  notes: string;
};

export type HomepageAchievementPublicationRegistryInput = {
  $schema?: unknown;
  schemaVersion?: unknown;
  registryId?: unknown;
  policy?: unknown;
  bindings?: unknown;
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
const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const bindingIdPattern = /^achievement-media-[a-z0-9-]+-[a-f0-9]{12}$/;
const topLevelKeys = new Set(["$schema", "schemaVersion", "registryId", "policy", "bindings"]);
const policyKeys = new Set(["approvedMediaAndClaimRequired", "exactSourceHashRequired", "sourceReplacementRequiresReapproval", "privateReviewBypassesBindings", "notes"]);
const bindingKeys = new Set(["bindingId", "mediaRecordId", "claimRecordId", "publicPath", "sourceSha256", "bytes", "width", "height", "format", "activatedOn", "notes"]);
export const HOMEPAGE_ACHIEVEMENT_BINDING_NOTES = "Activates only this exact reviewed artwork; approval evidence remains in the controlled system.";

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
export type HomepageAchievementMediaRecordId = HomepageAchievementArtwork["mediaRecordId"];
export type HomepageAchievementClaimRecordId = HomepageAchievementArtwork["claimRecordId"];
export type HomepageAchievementPublicationMode = "private-review" | "public";
export const homepageAchievementPublicationRegistry = publicationRegistryData as unknown as HomepageAchievementPublicationRegistryInput;

const artworkByMediaRecordId = new Map<HomepageAchievementMediaRecordId, HomepageAchievementArtwork>(
  homepageAchievementArtwork.map((artwork) => [artwork.mediaRecordId, artwork]),
);

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function unknownKeys(value: unknown, allowed: Set<string>) {
  return isRecord(value) ? Object.keys(value).filter((key) => !allowed.has(key)) : [];
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

function validRegistryPolicy(registry: HomepageAchievementPublicationRegistryInput) {
  return registry.$schema === "./homepage-achievement-publication-bindings.schema.json"
    && registry.schemaVersion === 1
    && registry.registryId === "sskem-homepage-achievement-publication-bindings"
    && isRecord(registry.policy)
    && registry.policy.approvedMediaAndClaimRequired === true
    && registry.policy.exactSourceHashRequired === true
    && registry.policy.sourceReplacementRequiresReapproval === true
    && registry.policy.privateReviewBypassesBindings === true
    && typeof registry.policy.notes === "string"
    && registry.policy.notes.trim().length >= 20
    && unknownKeys(registry.policy, policyKeys).length === 0;
}

export function createHomepageAchievementBindingProposal(options: {
  mediaRecordId: HomepageAchievementMediaRecordId;
  sourceSha256: string;
  bytes: number;
  width: number;
  height: number;
  format: string;
  activatedOn: string;
}) {
  const artwork = artworkByMediaRecordId.get(options.mediaRecordId);
  if (!artwork) throw new Error(`Unknown homepage achievement media record: ${options.mediaRecordId}.`);
  return {
    bindingId: `achievement-${options.mediaRecordId}-${options.sourceSha256.slice(0, 12)}`,
    mediaRecordId: artwork.mediaRecordId,
    claimRecordId: artwork.claimRecordId,
    publicPath: artwork.src,
    sourceSha256: options.sourceSha256,
    bytes: options.bytes,
    width: options.width,
    height: options.height,
    format: options.format,
    activatedOn: options.activatedOn,
    notes: HOMEPAGE_ACHIEVEMENT_BINDING_NOTES,
  } as HomepageAchievementPublicationBinding;
}

export function validateHomepageAchievementPublicationRegistry(options: {
  registry?: HomepageAchievementPublicationRegistryInput;
  manifest?: HomepageAchievementApprovalManifestInput;
  now?: Date | string | number;
} = {}) {
  const registry = options.registry ?? homepageAchievementPublicationRegistry;
  const manifest = options.manifest ?? approvalManifestData as HomepageAchievementApprovalManifestInput;
  const now = toTime(options.now);
  const issues: string[] = [];
  if (!Number.isFinite(now)) return ["Homepage achievement binding validation requires a valid time."];
  if (unknownKeys(registry, topLevelKeys).length) issues.push("The homepage achievement registry contains unknown top-level fields.");
  if (!validRegistryPolicy(registry)) issues.push("The homepage achievement registry identity or policy is invalid.");
  if (!Array.isArray(registry.bindings)) return [...issues, "The homepage achievement registry bindings must be an array."];
  if (!Array.isArray(manifest.records)) return [...issues, "The approval manifest records must be an array."];

  const manifestById = new Map(manifest.records.map((record) => [String(record.id), record]));
  const seenBindingIds = new Set<string>();
  const seenMediaRecords = new Set<string>();
  const seenPublicPaths = new Set<string>();
  for (const [index, value] of registry.bindings.entries()) {
    const path = `bindings[${index}]`;
    if (!isRecord(value)) {
      issues.push(`${path} must be an object.`);
      continue;
    }
    if (unknownKeys(value, bindingKeys).length) issues.push(`${path} contains unknown fields.`);
    if (typeof value.mediaRecordId !== "string" || !artworkByMediaRecordId.has(value.mediaRecordId as HomepageAchievementMediaRecordId)) {
      issues.push(`${path}.mediaRecordId is not a governed homepage achievement record.`);
      continue;
    }
    const artwork = artworkByMediaRecordId.get(value.mediaRecordId as HomepageAchievementMediaRecordId)!;
    if (seenMediaRecords.has(artwork.mediaRecordId)) issues.push(`${path}.mediaRecordId is duplicated.`);
    else seenMediaRecords.add(artwork.mediaRecordId);
    if (value.claimRecordId !== artwork.claimRecordId) issues.push(`${path}.claimRecordId does not match ${artwork.mediaRecordId}.`);
    if (value.publicPath !== artwork.src) issues.push(`${path}.publicPath does not match ${artwork.mediaRecordId}.`);
    else if (seenPublicPaths.has(artwork.src)) issues.push(`${path}.publicPath is duplicated.`);
    else seenPublicPaths.add(artwork.src);
    if (typeof value.sourceSha256 !== "string" || !sha256Pattern.test(value.sourceSha256)) issues.push(`${path}.sourceSha256 is invalid.`);
    const expectedBindingId = typeof value.sourceSha256 === "string" ? `achievement-${artwork.mediaRecordId}-${value.sourceSha256.slice(0, 12)}` : null;
    if (typeof value.bindingId !== "string" || !bindingIdPattern.test(value.bindingId) || value.bindingId !== expectedBindingId) issues.push(`${path}.bindingId does not match its media record and source hash.`);
    else if (seenBindingIds.has(value.bindingId)) issues.push(`${path}.bindingId is duplicated.`);
    else seenBindingIds.add(value.bindingId);
    if (!Number.isInteger(value.bytes) || (value.bytes as number) < 10_000 || (value.bytes as number) > 2_000_000) issues.push(`${path}.bytes is outside the reviewed artwork bounds.`);
    if (value.width !== 1400 || value.height !== 500 || value.format !== "jpeg") issues.push(`${path} does not preserve the canonical 1400 by 500 JPEG format.`);
    const activatedOn = typeof value.activatedOn === "string" ? Date.parse(value.activatedOn) : Number.NaN;
    if (typeof value.activatedOn !== "string" || !dateTimePattern.test(value.activatedOn) || Number.isNaN(activatedOn) || activatedOn > now) issues.push(`${path}.activatedOn is invalid.`);
    if (typeof value.notes !== "string" || value.notes !== HOMEPAGE_ACHIEVEMENT_BINDING_NOTES) issues.push(`${path}.notes do not preserve the activation boundary.`);
    const mediaRecord = manifestById.get(artwork.mediaRecordId);
    const claimRecord = manifestById.get(artwork.claimRecordId);
    const mediaApprovalValid = validCurrentApproval(mediaRecord, now);
    const claimApprovalValid = validCurrentApproval(claimRecord, now);
    if (!mediaApprovalValid) issues.push(`${path} requires a current approved media record.`);
    if (!claimApprovalValid) issues.push(`${path} requires a current approved paired claim record.`);
    if (
      Number.isFinite(activatedOn)
      && mediaApprovalValid
      && claimApprovalValid
      && [mediaRecord, claimRecord].some((record) => typeof record?.approvedAt !== "string" || Date.parse(record.approvedAt) > activatedOn)
    ) issues.push(`${path}.activatedOn must not predate either approval.`);
  }
  return issues;
}

export function createHomepageAchievementPublicationIndex(options: {
  registry?: HomepageAchievementPublicationRegistryInput;
  manifest?: HomepageAchievementApprovalManifestInput;
  now?: Date | string | number;
} = {}) {
  const registry = options.registry ?? homepageAchievementPublicationRegistry;
  if (validateHomepageAchievementPublicationRegistry({ ...options, registry }).length || !Array.isArray(registry.bindings)) {
    return new Map<HomepageAchievementMediaRecordId, HomepageAchievementPublicationBinding>();
  }
  return new Map(
    (registry.bindings as HomepageAchievementPublicationBinding[]).map((binding) => [binding.mediaRecordId, binding]),
  );
}

function publicationState(options: {
  manifest?: HomepageAchievementApprovalManifestInput;
  registry?: HomepageAchievementPublicationRegistryInput;
  now?: Date | string | number;
} = {}) {
  const manifest = options.manifest ?? approvalManifestData as HomepageAchievementApprovalManifestInput;
  const now = toTime(options.now);
  const issues: string[] = [];
  if (!Number.isFinite(now)) return { eligible: new Set<string>(), approvedPairs: 0, issues: ["Homepage achievement publication requires a valid time."] };
  if (!Array.isArray(manifest.records)) return { eligible: new Set<string>(), approvedPairs: 0, issues: ["The approval manifest records must be an array."] };

  const relevantIds = new Set(homepageAchievementArtwork.flatMap((artwork) => [artwork.mediaRecordId, artwork.claimRecordId]));
  const relevantRecords = manifest.records.filter((record) => typeof record.id === "string" && relevantIds.has(record.id));
  const counts = new Map<string, number>();
  for (const record of relevantRecords) counts.set(String(record.id), (counts.get(String(record.id)) ?? 0) + 1);
  for (const [id, count] of counts) if (count > 1) issues.push(`${id} is duplicated in the approval manifest.`);
  const byId = new Map(relevantRecords.map((record) => [String(record.id), record]));
  const eligible = new Set<string>();
  let approvedPairs = 0;

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
      approvedPairs += 1;
    }
  }

  const registry = options.registry ?? homepageAchievementPublicationRegistry;
  const registryIssues = validateHomepageAchievementPublicationRegistry({ registry, manifest, now });
  issues.push(...registryIssues);
  if (!registryIssues.length) {
    const bindings = createHomepageAchievementPublicationIndex({ registry, manifest, now });
    for (const artwork of homepageAchievementArtwork) {
      const media = byId.get(artwork.mediaRecordId);
      const claim = byId.get(artwork.claimRecordId);
      if (validCurrentApproval(media, now) && validCurrentApproval(claim, now) && bindings.has(artwork.mediaRecordId)) {
        eligible.add(artwork.src);
      }
    }
  }

  return { eligible, approvedPairs, issues: [...new Set(issues)] };
}

export function selectHomepageAchievementArtwork(options: {
  mode: HomepageAchievementPublicationMode;
  manifest?: HomepageAchievementApprovalManifestInput;
  registry?: HomepageAchievementPublicationRegistryInput;
  now?: Date | string | number;
}) {
  if (options.mode === "private-review") return [...homepageAchievementArtwork];
  const state = publicationState(options);
  if (state.issues.length) return [];
  return homepageAchievementArtwork.filter((artwork) => state.eligible.has(artwork.src));
}

export function homepageAchievementPublicationSummary(options: {
  manifest?: HomepageAchievementApprovalManifestInput;
  registry?: HomepageAchievementPublicationRegistryInput;
  now?: Date | string | number;
} = {}) {
  const state = publicationState(options);
  const required = homepageAchievementArtwork.length;
  const approved = state.approvedPairs;
  const active = state.eligible.size;
  return {
    approved,
    active,
    required,
    publicProjectionSafe: state.issues.length === 0,
    releaseReady: state.issues.length === 0 && active === required,
    issues: state.issues,
  } as const;
}
