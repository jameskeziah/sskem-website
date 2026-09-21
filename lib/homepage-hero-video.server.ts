import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import approvalManifestData from "../content/approval-manifest.json" with { type: "json" };
import bindingData from "../content/homepage-hero-video-binding.json" with { type: "json" };

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

export type HomepageHeroVideoApprovalManifestInput = {
  checkProfiles?: unknown;
  records?: readonly ApprovalRecordInput[];
};

export type HomepageHeroVideoFileBinding = {
  recordId: string;
  publicPath: string;
  sha256: string;
  bytes: number;
};

export type HomepageHeroVideoBinding = {
  bindingId: string;
  title: string;
  activatedOn: string;
  video: HomepageHeroVideoFileBinding & {
    type: "video/mp4" | "video/webm";
    width: number;
    height: number;
    durationMs: number;
  };
  poster: HomepageHeroVideoFileBinding & {
    format: "avif" | "jpeg" | "png" | "webp";
    width: number;
    height: number;
  };
  captions: HomepageHeroVideoFileBinding & {
    srcLang: string;
    label: string;
  };
};

export type HomepageHeroVideoBindingRegistryInput = {
  $schema?: unknown;
  schemaVersion?: unknown;
  registryId?: unknown;
  policy?: unknown;
  binding?: unknown;
};

export type HomepageHeroVideoAsset = Readonly<{
  title: string;
  poster: string;
  sources: readonly [
    Readonly<{
      src: string;
      type: "video/mp4" | "video/webm";
    }>,
  ];
  captions: Readonly<{
    src: string;
    srcLang: string;
    label: string;
  }>;
}>;

export type HomepageHeroVideoSelectionMode = "private-review" | "public";

export const HOMEPAGE_HERO_VIDEO_APPROVAL_PROFILE = "hero-media" as const;
export const HOMEPAGE_HERO_VIDEO_APPROVAL_CHECKS = Object.freeze([
  "authenticity",
  "accuracy",
  "rights",
  "source-assets",
  "guardian-consent",
  "privacy",
  "accessibility",
  "management-approval",
] as const);
export const HOMEPAGE_HERO_VIDEO_RECORD_IDS = Object.freeze({
  video: "media-homepage-hero-video",
  poster: "media-homepage-hero-video-poster",
  captions: "media-homepage-hero-video-captions",
} as const);

const defaultProjectRoot = fileURLToPath(new URL("../", import.meta.url));
const sha256Pattern = /^[a-f0-9]{64}$/;
const bindingIdPattern = /^homepage-hero-video-[a-f0-9]{12}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const evidenceReferencePattern = /^[A-Z0-9][A-Z0-9._/-]{2,79}$/;
const privateEvidenceLocationPattern = /^(?:[a-z]:[\\/]|file:|https?:\/\/|\\\\)|(?:^|\/)\.\.?($|\/)/i;
const rolePattern = /^[a-z][a-z0-9-]{2,63}$/;
const languagePattern = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;
const videoPathPattern = /^\/media\/home\/production\/homepage-hero-video\/[a-z0-9][a-z0-9._-]*\.(?:mp4|webm)$/;
const posterPathPattern = /^\/media\/home\/production\/homepage-hero-video\/[a-z0-9][a-z0-9._-]*\.(?:avif|jpe?g|png|webp)$/;
const captionsPathPattern = /^\/media\/home\/production\/homepage-hero-video\/[a-z0-9][a-z0-9._-]*\.vtt$/;
const releaseCheckStates = new Set(["verified", "not-applicable"]);
const topLevelKeys = new Set(["$schema", "schemaVersion", "registryId", "policy", "binding"]);
const policyKeys = new Set([
  "privateReviewOnly",
  "publicActivationAllowed",
  "currentApprovalsRequired",
  "exactPublicFileSha256Required",
  "posterRequired",
  "captionsRequired",
  "maximumVideoBytes",
  "maximumPosterBytes",
  "maximumCaptionsBytes",
  "initialVideoPreload",
  "notes",
]);
const bindingKeys = new Set(["bindingId", "title", "activatedOn", "video", "poster", "captions"]);
const videoKeys = new Set(["recordId", "publicPath", "type", "sha256", "bytes", "width", "height", "durationMs"]);
const posterKeys = new Set(["recordId", "publicPath", "format", "sha256", "bytes", "width", "height"]);
const captionsKeys = new Set(["recordId", "publicPath", "sha256", "bytes", "srcLang", "label"]);

export const homepageHeroVideoBindingRegistry = bindingData as unknown as HomepageHeroVideoBindingRegistryInput;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function unknownKeys(value: unknown, allowed: ReadonlySet<string>) {
  return isRecord(value) ? Object.keys(value).filter((key) => !allowed.has(key)) : [];
}

function toTime(value: Date | string | number | undefined) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return Date.parse(value);
  return Date.now();
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validDateTime(value: unknown): value is string {
  return typeof value === "string" && dateTimePattern.test(value) && !Number.isNaN(Date.parse(value));
}

function validPositiveInteger(value: unknown, maximum = Number.MAX_SAFE_INTEGER) {
  return Number.isInteger(value) && Number(value) > 0 && Number(value) <= maximum;
}

function exactStringSet(value: unknown, expected: readonly string[]) {
  return Array.isArray(value)
    && value.length === expected.length
    && expected.every((entry) => value.includes(entry));
}

function validPolicy(registry: HomepageHeroVideoBindingRegistryInput) {
  const policy = registry.policy;
  return isRecord(policy)
    && unknownKeys(policy, policyKeys).length === 0
    && policy.privateReviewOnly === true
    && policy.publicActivationAllowed === false
    && policy.currentApprovalsRequired === true
    && policy.exactPublicFileSha256Required === true
    && policy.posterRequired === true
    && policy.captionsRequired === true
    && policy.maximumVideoBytes === 3_000_000
    && policy.maximumPosterBytes === 250_000
    && policy.maximumCaptionsBytes === 100_000
    && policy.initialVideoPreload === "none"
    && typeof policy.notes === "string"
    && policy.notes.trim().length >= 20;
}

function expectedBundleBindingId(binding: UnknownRecord) {
  const video = isRecord(binding.video) ? binding.video.sha256 : null;
  const poster = isRecord(binding.poster) ? binding.poster.sha256 : null;
  const captions = isRecord(binding.captions) ? binding.captions.sha256 : null;
  if (![video, poster, captions].every((value) => typeof value === "string" && sha256Pattern.test(value))) return null;
  const digest = createHash("sha256").update(`${video}:${poster}:${captions}`, "utf8").digest("hex");
  return `homepage-hero-video-${digest.slice(0, 12)}`;
}

function validateVideo(value: unknown, issues: string[]) {
  if (!isRecord(value)) {
    issues.push("binding.video must be an object.");
    return;
  }
  if (unknownKeys(value, videoKeys).length) issues.push("binding.video contains unknown fields.");
  if (value.recordId !== HOMEPAGE_HERO_VIDEO_RECORD_IDS.video) issues.push("binding.video.recordId is not the canonical hero video approval record.");
  if (typeof value.publicPath !== "string" || !videoPathPattern.test(value.publicPath)) issues.push("binding.video.publicPath is not a canonical production hero video path.");
  if (value.type !== "video/mp4" && value.type !== "video/webm") issues.push("binding.video.type must be video/mp4 or video/webm.");
  if (typeof value.publicPath === "string") {
    const expectedType = value.publicPath.endsWith(".webm") ? "video/webm" : "video/mp4";
    if (value.type !== expectedType) issues.push("binding.video.type does not match its publicPath extension.");
  }
  if (typeof value.sha256 !== "string" || !sha256Pattern.test(value.sha256)) issues.push("binding.video.sha256 is invalid.");
  if (!validPositiveInteger(value.bytes, 3_000_000)) issues.push("binding.video.bytes exceeds the three-megabyte ceiling or is invalid.");
  if (!validPositiveInteger(value.width) || !validPositiveInteger(value.height)) issues.push("binding.video dimensions are invalid.");
  if (!validPositiveInteger(value.durationMs, 30_000) || Number(value.durationMs) < 1_000) issues.push("binding.video.durationMs must be between one and thirty seconds.");
}

function validatePoster(value: unknown, issues: string[]) {
  if (!isRecord(value)) {
    issues.push("binding.poster must be an object.");
    return;
  }
  if (unknownKeys(value, posterKeys).length) issues.push("binding.poster contains unknown fields.");
  if (value.recordId !== HOMEPAGE_HERO_VIDEO_RECORD_IDS.poster) issues.push("binding.poster.recordId is not the canonical hero poster approval record.");
  if (typeof value.publicPath !== "string" || !posterPathPattern.test(value.publicPath)) issues.push("binding.poster.publicPath is not a canonical production hero poster path.");
  if (!new Set(["avif", "jpeg", "png", "webp"]).has(String(value.format))) issues.push("binding.poster.format is invalid.");
  if (typeof value.publicPath === "string") {
    const extension = value.publicPath.split(".").at(-1);
    const expectedFormat = extension === "jpg" || extension === "jpeg" ? "jpeg" : extension;
    if (value.format !== expectedFormat) issues.push("binding.poster.format does not match its publicPath extension.");
  }
  if (typeof value.sha256 !== "string" || !sha256Pattern.test(value.sha256)) issues.push("binding.poster.sha256 is invalid.");
  if (!validPositiveInteger(value.bytes, 250_000)) issues.push("binding.poster.bytes exceeds the poster ceiling or is invalid.");
  if (!validPositiveInteger(value.width) || !validPositiveInteger(value.height)) issues.push("binding.poster dimensions are invalid.");
}

function validateCaptions(value: unknown, issues: string[]) {
  if (!isRecord(value)) {
    issues.push("binding.captions must be an object.");
    return;
  }
  if (unknownKeys(value, captionsKeys).length) issues.push("binding.captions contains unknown fields.");
  if (value.recordId !== HOMEPAGE_HERO_VIDEO_RECORD_IDS.captions) issues.push("binding.captions.recordId is not the canonical hero captions approval record.");
  if (typeof value.publicPath !== "string" || !captionsPathPattern.test(value.publicPath)) issues.push("binding.captions.publicPath is not a canonical production WebVTT path.");
  if (typeof value.sha256 !== "string" || !sha256Pattern.test(value.sha256)) issues.push("binding.captions.sha256 is invalid.");
  if (!validPositiveInteger(value.bytes, 100_000)) issues.push("binding.captions.bytes exceeds the captions ceiling or is invalid.");
  if (typeof value.srcLang !== "string" || !languagePattern.test(value.srcLang)) issues.push("binding.captions.srcLang is invalid.");
  if (typeof value.label !== "string" || value.label.trim().length < 2 || value.label.trim().length > 40) issues.push("binding.captions.label is invalid.");
}

function approvalIssues(options: {
  record: ApprovalRecordInput | undefined;
  expectedId: string;
  expectedSourcePointer: string;
  activatedOn: number;
  now: number;
}) {
  const { record, expectedId, expectedSourcePointer, activatedOn, now } = options;
  const issues: string[] = [];
  if (!record) return [`${expectedId} is missing from the approval manifest.`];
  if (record.id !== expectedId || record.kind !== "media") issues.push(`${expectedId} must be the canonical media approval record.`);
  if (record.sourcePointer !== expectedSourcePointer) issues.push(`${expectedId} does not point to the exact bound public file.`);
  if (!Array.isArray(record.publicTargets) || !record.publicTargets.includes("/")) issues.push(`${expectedId} must govern the homepage target.`);
  if (record.checkProfile !== HOMEPAGE_HERO_VIDEO_APPROVAL_PROFILE) issues.push(`${expectedId} must use the ${HOMEPAGE_HERO_VIDEO_APPROVAL_PROFILE} check profile.`);
  const checks = isRecord(record.checks) ? record.checks : null;
  if (!checks
    || Object.keys(checks).length !== HOMEPAGE_HERO_VIDEO_APPROVAL_CHECKS.length
    || HOMEPAGE_HERO_VIDEO_APPROVAL_CHECKS.some((check) => !releaseCheckStates.has(String(checks[check])))) {
    issues.push(`${expectedId} does not have every hero-media check verified or marked not applicable.`);
  }
  if (record.decision !== "approved") issues.push(`${expectedId} is not approved.`);
  if (!Array.isArray(record.evidenceReferences)
    || !record.evidenceReferences.length
    || record.evidenceReferences.some((reference) => typeof reference !== "string"
      || !evidenceReferencePattern.test(reference)
      || privateEvidenceLocationPattern.test(reference))) {
    issues.push(`${expectedId} requires at least one opaque controlled evidence reference.`);
  }
  if (typeof record.approvedByRole !== "string" || !rolePattern.test(record.approvedByRole)) issues.push(`${expectedId} requires an approving role identifier.`);
  if (!validDateTime(record.approvedAt)) {
    issues.push(`${expectedId} requires a valid approval timestamp.`);
  } else {
    const approvedAt = Date.parse(record.approvedAt);
    if (approvedAt > now) issues.push(`${expectedId} has a future approval timestamp.`);
    if (approvedAt > activatedOn) issues.push(`${expectedId} was approved after the bundle activation timestamp.`);
  }
  if (record.expiresAt !== null) {
    if (!validDate(record.expiresAt)) issues.push(`${expectedId} has an invalid expiry date.`);
    else if (Date.parse(`${record.expiresAt}T23:59:59.999Z`) < now) issues.push(`${expectedId} approval has expired.`);
  }
  return issues;
}

export function validateHomepageHeroVideoBinding(options: {
  registry?: HomepageHeroVideoBindingRegistryInput;
  manifest?: HomepageHeroVideoApprovalManifestInput;
  now?: Date | string | number;
} = {}) {
  const registry = options.registry ?? homepageHeroVideoBindingRegistry;
  const manifest = options.manifest ?? approvalManifestData as unknown as HomepageHeroVideoApprovalManifestInput;
  const now = toTime(options.now);
  const issues: string[] = [];

  if (!Number.isFinite(now)) return ["Homepage hero video binding validation requires a valid time."];
  if (unknownKeys(registry, topLevelKeys).length) issues.push("The homepage hero video registry contains unknown top-level fields.");
  if (registry.$schema !== "./homepage-hero-video-binding.schema.json"
    || registry.schemaVersion !== 1
    || registry.registryId !== "sskem-homepage-hero-video-binding"
    || !validPolicy(registry)) {
    issues.push("The homepage hero video registry identity or policy is invalid.");
  }
  if (registry.binding === null) return issues;
  if (!isRecord(registry.binding)) return [...issues, "The homepage hero video binding must be null or one object."];

  const binding = registry.binding;
  if (unknownKeys(binding, bindingKeys).length) issues.push("The homepage hero video binding contains unknown fields.");
  const expectedBindingId = expectedBundleBindingId(binding);
  if (typeof binding.bindingId !== "string"
    || !bindingIdPattern.test(binding.bindingId)
    || binding.bindingId !== expectedBindingId) {
    issues.push("binding.bindingId does not match the exact three-file bundle digest.");
  }
  if (typeof binding.title !== "string" || binding.title.trim().length < 12 || binding.title.trim().length > 120) issues.push("binding.title is invalid.");
  if (!validDateTime(binding.activatedOn) || Date.parse(binding.activatedOn) > now) issues.push("binding.activatedOn is invalid or in the future.");
  validateVideo(binding.video, issues);
  validatePoster(binding.poster, issues);
  validateCaptions(binding.captions, issues);

  if (isRecord(binding.video) && isRecord(binding.poster)
    && validPositiveInteger(binding.video.width) && validPositiveInteger(binding.video.height)
    && validPositiveInteger(binding.poster.width) && validPositiveInteger(binding.poster.height)) {
    const videoRatio = Number(binding.video.width) / Number(binding.video.height);
    const posterRatio = Number(binding.poster.width) / Number(binding.poster.height);
    if (Math.abs(videoRatio - posterRatio) > 0.015) issues.push("The hero video and poster aspect ratios do not match.");
  }

  if (!isRecord(manifest.checkProfiles)
    || !exactStringSet(manifest.checkProfiles[HOMEPAGE_HERO_VIDEO_APPROVAL_PROFILE], HOMEPAGE_HERO_VIDEO_APPROVAL_CHECKS)) {
    issues.push(`The approval manifest must define the exact ${HOMEPAGE_HERO_VIDEO_APPROVAL_PROFILE} check profile.`);
  }
  if (!Array.isArray(manifest.records)) return [...issues, "The approval manifest records must be an array."];

  const relevantIds = new Set(Object.values(HOMEPAGE_HERO_VIDEO_RECORD_IDS));
  const relevantRecords = manifest.records.filter((record) => typeof record.id === "string" && relevantIds.has(record.id as typeof HOMEPAGE_HERO_VIDEO_RECORD_IDS[keyof typeof HOMEPAGE_HERO_VIDEO_RECORD_IDS]));
  const counts = new Map<string, number>();
  for (const record of relevantRecords) counts.set(String(record.id), (counts.get(String(record.id)) ?? 0) + 1);
  for (const [id, count] of counts) if (count > 1) issues.push(`${id} is duplicated in the approval manifest.`);
  const manifestById = new Map(relevantRecords.map((record) => [String(record.id), record]));
  const activatedOn = validDateTime(binding.activatedOn) ? Date.parse(binding.activatedOn) : Number.NaN;

  for (const key of ["video", "poster", "captions"] as const) {
    const boundAsset = binding[key];
    if (!isRecord(boundAsset) || typeof boundAsset.publicPath !== "string") continue;
    const expectedId = HOMEPAGE_HERO_VIDEO_RECORD_IDS[key];
    issues.push(...approvalIssues({
      record: manifestById.get(expectedId),
      expectedId,
      expectedSourcePointer: `public${boundAsset.publicPath}`,
      activatedOn,
      now,
    }));
  }

  return [...new Set(issues)];
}

function exactPublicPath(rootDir: string, publicPath: string) {
  const publicRoot = path.resolve(rootDir, "public");
  const candidate = path.resolve(publicRoot, `.${publicPath}`);
  const relative = path.relative(publicRoot, candidate);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
  return candidate;
}

async function readBoundPublicFile(rootDir: string, publicPath: string) {
  const filePath = exactPublicPath(rootDir, publicPath);
  if (!filePath) throw new Error("The bound hero media path resolves outside the public directory.");
  return readFile(filePath);
}

function sha256(value: Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function validWebVtt(value: Uint8Array) {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(value).replace(/^\uFEFF/, "");
    return /^WEBVTT(?:[ \t].*)?\r?\n/.test(text) && /\d{2}:\d{2}(?::\d{2})?\.\d{3}\s+-->\s+\d{2}:\d{2}(?::\d{2})?\.\d{3}/.test(text);
  } catch {
    return false;
  }
}

export async function selectHomepageHeroVideo(options: {
  mode: HomepageHeroVideoSelectionMode;
  registry?: HomepageHeroVideoBindingRegistryInput;
  manifest?: HomepageHeroVideoApprovalManifestInput;
  now?: Date | string | number;
  rootDir?: string;
  readPublicFile?: (publicPath: string) => Promise<Uint8Array>;
}): Promise<HomepageHeroVideoAsset | null> {
  if (options.mode !== "private-review") return null;
  const registry = options.registry ?? homepageHeroVideoBindingRegistry;
  if (validateHomepageHeroVideoBinding({ ...options, registry }).length || !isRecord(registry.binding)) return null;
  const binding = registry.binding as unknown as HomepageHeroVideoBinding;
  const reader = options.readPublicFile ?? ((publicPath: string) => readBoundPublicFile(options.rootDir ?? defaultProjectRoot, publicPath));

  try {
    const [video, poster, captions] = await Promise.all([
      reader(binding.video.publicPath),
      reader(binding.poster.publicPath),
      reader(binding.captions.publicPath),
    ]);
    const exactFiles = [
      { bytes: video, binding: binding.video },
      { bytes: poster, binding: binding.poster },
      { bytes: captions, binding: binding.captions },
    ];
    if (exactFiles.some((entry) => entry.bytes.byteLength !== entry.binding.bytes || sha256(entry.bytes) !== entry.binding.sha256)) return null;
    if (!validWebVtt(captions)) return null;
  } catch {
    return null;
  }

  return Object.freeze({
    title: binding.title,
    poster: binding.poster.publicPath,
    sources: Object.freeze([
      Object.freeze({ src: binding.video.publicPath, type: binding.video.type }),
    ]) as HomepageHeroVideoAsset["sources"],
    captions: Object.freeze({
      src: binding.captions.publicPath,
      srcLang: binding.captions.srcLang,
      label: binding.captions.label,
    }),
  });
}
