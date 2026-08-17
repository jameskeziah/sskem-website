import approvalManifestData from "../content/approval-manifest.json" with { type: "json" };
import campusMediaConfigData from "../content/campus-media-pipeline.json" with { type: "json" };
import registryData from "../content/campus-media-publication-bindings.json" with { type: "json" };

type UnknownRecord = Record<string, unknown>;
type ApprovalRecordInput = { id?: unknown; kind?: unknown; decision?: unknown; expiresAt?: unknown };
export type CampusMediaApprovalManifestInput = { records?: readonly ApprovalRecordInput[] };
export type CampusMediaPublicationRegistryInput = {
  $schema?: unknown;
  schemaVersion?: unknown;
  registryId?: unknown;
  publicBasePath?: unknown;
  policy?: unknown;
  bindings?: unknown;
};
type CampusReceiptInput = {
  schemaVersion?: unknown;
  pipelineId?: unknown;
  recordId?: unknown;
  decisionAtPreparation?: unknown;
  mode?: unknown;
  generatedAt?: unknown;
  source?: unknown;
  output?: unknown;
};

const sha256Pattern = /^[a-f0-9]{64}$/;
const bindingIdPattern = /^campus-media-[a-z0-9-]+-[a-f0-9]{12}$/;
const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const rolesByRecordId = {
  "media-campus-main": "home-hero",
  "media-campus-grounds": "campus-grounds",
  "media-campus-entrance": "campus-entrance",
  "media-campus-courtyard": "campus-courtyard",
} as const;
const allowedBindingKeys = new Set(["bindingId", "recordId", "role", "profile", "sourceSha256", "publishedOn", "variants", "notes"]);
const allowedVariantKeys = new Set(["filename", "format", "width", "height", "bytes", "quality", "sha256", "embeddedMetadataRemoved", "colourSpace"]);

export type CampusRecordId = keyof typeof rolesByRecordId;
type CampusRole = (typeof rolesByRecordId)[CampusRecordId];
export type CampusMediaPublicationVariant = {
  filename: string;
  format: "avif" | "webp" | "jpeg";
  width: number;
  height: number;
  bytes: number;
  quality: number;
  sha256: string;
  embeddedMetadataRemoved: true;
  colourSpace: "srgb" | "rgb";
};
export type CampusMediaPublicationBinding = {
  bindingId: string;
  recordId: CampusRecordId;
  role: CampusRole;
  profile: "campus-responsive";
  sourceSha256: string;
  publishedOn: string;
  variants: CampusMediaPublicationVariant[];
  notes: string;
};

export const campusMediaPublicationRegistry = registryData as unknown as CampusMediaPublicationRegistryInput;
export const campusMediaPublicationRoles = rolesByRecordId;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function unknownKeys(value: unknown, allowed: Set<string>) {
  return isRecord(value) ? Object.keys(value).filter((key) => !allowed.has(key)) : [];
}

function validApproval(record: ApprovalRecordInput | undefined, now: number) {
  if (!record || record.kind !== "media" || record.decision !== "approved") return false;
  if (record.expiresAt === null || record.expiresAt === undefined) return true;
  if (typeof record.expiresAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(record.expiresAt)) return false;
  return Date.parse(`${record.expiresAt}T23:59:59.999Z`) >= now;
}

function expectedVariantNames(recordId: CampusRecordId) {
  const profile = campusMediaConfigData.profiles["campus-responsive"];
  return profile.widths.flatMap((width) => [
    `${recordId}-${width}.avif`,
    `${recordId}-${width}.webp`,
    `${recordId}-${width}.jpg`,
  ]);
}

function validateVariant(value: unknown, recordId: CampusRecordId, issues: string[], path: string): value is CampusMediaPublicationVariant {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object.`);
    return false;
  }
  if (unknownKeys(value, allowedVariantKeys).length) issues.push(`${path} contains unknown fields.`);
  const expectedExtension = value.format === "jpeg" ? "jpg" : value.format;
  if (typeof value.filename !== "string" || value.filename !== `${recordId}-${value.width}.${expectedExtension}`) issues.push(`${path}.filename does not match its record, width and format.`);
  if (!new Set(["avif", "webp", "jpeg"]).has(value.format as string)) issues.push(`${path}.format is invalid.`);
  if (!campusMediaConfigData.profiles["campus-responsive"].widths.includes(value.width as number)) issues.push(`${path}.width is not in the approved profile.`);
  if (!Number.isInteger(value.height) || (value.height as number) < 1) issues.push(`${path}.height is invalid.`);
  const format = typeof value.format === "string" ? value.format as "avif" | "webp" | "jpeg" : null;
  const maximumBytes = format ? campusMediaConfigData.profiles["campus-responsive"].formats[format]?.maximumBytes : null;
  if (!Number.isInteger(value.bytes) || (value.bytes as number) < 1 || (maximumBytes && (value.bytes as number) > maximumBytes)) issues.push(`${path}.bytes exceeds the approved format budget.`);
  if (!Number.isInteger(value.quality) || (value.quality as number) < 1 || (value.quality as number) > 100) issues.push(`${path}.quality is invalid.`);
  if (typeof value.sha256 !== "string" || !sha256Pattern.test(value.sha256)) issues.push(`${path}.sha256 is invalid.`);
  if (value.embeddedMetadataRemoved !== true) issues.push(`${path} must confirm embedded metadata removal.`);
  if (value.colourSpace !== "srgb" && value.colourSpace !== "rgb") issues.push(`${path}.colourSpace is invalid.`);
  return true;
}

function validRegistryPolicy(registry: CampusMediaPublicationRegistryInput) {
  return registry.$schema === "./campus-media-publication-bindings.schema.json"
    && registry.schemaVersion === 1
    && registry.registryId === "sskem-campus-media-publication-bindings"
    && registry.publicBasePath === "/media/home/production"
    && isRecord(registry.policy)
    && registry.policy.approvedManifestRequired === true
    && registry.policy.exactReceiptRequired === true
    && registry.policy.exactVariantHashesRequired === true
    && registry.policy.prototypeFallbackPrivateOnly === true
    && typeof registry.policy.notes === "string"
    && registry.policy.notes.trim().length >= 3
    && unknownKeys(registry.policy, new Set(["approvedManifestRequired", "exactReceiptRequired", "exactVariantHashesRequired", "prototypeFallbackPrivateOnly", "notes"])).length === 0;
}

export function validateCampusMediaPublicationRegistry(options: {
  registry?: CampusMediaPublicationRegistryInput;
  manifest?: CampusMediaApprovalManifestInput;
  now?: Date | string | number;
} = {}) {
  const registry = options.registry ?? campusMediaPublicationRegistry;
  const manifest = options.manifest ?? approvalManifestData as unknown as CampusMediaApprovalManifestInput;
  const now = options.now instanceof Date
    ? options.now.getTime()
    : typeof options.now === "number"
      ? options.now
      : typeof options.now === "string"
        ? Date.parse(options.now)
        : Date.now();
  const issues: string[] = [];
  if (!Number.isFinite(now)) return ["Campus media publication validation requires a valid time."];
  if (unknownKeys(registry, new Set(["$schema", "schemaVersion", "registryId", "publicBasePath", "policy", "bindings"])).length) issues.push("The campus media publication registry contains unknown top-level fields.");
  if (!validRegistryPolicy(registry)) issues.push("The campus media publication registry identity or policy is invalid.");
  if (!Array.isArray(registry.bindings)) return [...issues, "The campus media publication registry bindings must be an array."];

  const manifestById = new Map((manifest.records ?? []).map((record) => [record.id, record]));
  const seenBindingIds = new Set<string>();
  const seenRecordIds = new Set<string>();
  const seenRoles = new Set<string>();
  for (const [index, binding] of registry.bindings.entries()) {
    const path = `bindings[${index}]`;
    if (!isRecord(binding)) {
      issues.push(`${path} must be an object.`);
      continue;
    }
    if (unknownKeys(binding, allowedBindingKeys).length) issues.push(`${path} contains unknown fields.`);
    if (typeof binding.bindingId !== "string" || !bindingIdPattern.test(binding.bindingId)) issues.push(`${path}.bindingId is invalid.`);
    else if (seenBindingIds.has(binding.bindingId)) issues.push(`${path}.bindingId is duplicated.`);
    else seenBindingIds.add(binding.bindingId);
    if (typeof binding.recordId !== "string" || !(binding.recordId in rolesByRecordId)) {
      issues.push(`${path}.recordId is not a homepage campus record.`);
      continue;
    }
    const recordId = binding.recordId as CampusRecordId;
    if (seenRecordIds.has(recordId)) issues.push(`${path}.recordId is duplicated.`);
    else seenRecordIds.add(recordId);
    if (binding.role !== rolesByRecordId[recordId]) issues.push(`${path}.role does not match ${recordId}.`);
    else if (seenRoles.has(binding.role)) issues.push(`${path}.role is duplicated.`);
    else seenRoles.add(binding.role as string);
    if (binding.profile !== "campus-responsive") issues.push(`${path}.profile is invalid.`);
    if (typeof binding.sourceSha256 !== "string" || !sha256Pattern.test(binding.sourceSha256)) issues.push(`${path}.sourceSha256 is invalid.`);
    if (typeof binding.publishedOn !== "string" || !dateTimePattern.test(binding.publishedOn) || Number.isNaN(Date.parse(binding.publishedOn))) issues.push(`${path}.publishedOn is invalid.`);
    if (typeof binding.notes !== "string" || binding.notes.trim().length < 3) issues.push(`${path}.notes are required.`);
    if (!validApproval(manifestById.get(recordId), now)) issues.push(`${path} requires a current approved media record.`);
    if (!Array.isArray(binding.variants)) {
      issues.push(`${path}.variants must be an array.`);
      continue;
    }
    const names = new Set<string>();
    for (const [variantIndex, variant] of binding.variants.entries()) {
      validateVariant(variant, recordId, issues, `${path}.variants[${variantIndex}]`);
      if (isRecord(variant) && typeof variant.filename === "string") {
        if (names.has(variant.filename)) issues.push(`${path}.variants repeats ${variant.filename}.`);
        names.add(variant.filename);
      }
    }
    const expectedNames = expectedVariantNames(recordId);
    if (binding.variants.length !== expectedNames.length || expectedNames.some((name) => !names.has(name))) issues.push(`${path}.variants must contain the exact 15-file responsive profile.`);
  }
  return issues;
}

export function createCampusMediaPublicationIndex(options: {
  registry?: CampusMediaPublicationRegistryInput;
  manifest?: CampusMediaApprovalManifestInput;
  now?: Date | string | number;
} = {}) {
  const registry = options.registry ?? campusMediaPublicationRegistry;
  if (validateCampusMediaPublicationRegistry({ ...options, registry }).length || !Array.isArray(registry.bindings)) return new Map<CampusRecordId, CampusMediaPublicationBinding>();
  return new Map((registry.bindings as CampusMediaPublicationBinding[]).map((binding) => [binding.recordId, binding]));
}

export function campusMediaPublicationSummary(options: {
  registry?: CampusMediaPublicationRegistryInput;
  manifest?: CampusMediaApprovalManifestInput;
  now?: Date | string | number;
} = {}) {
  const registry = options.registry ?? campusMediaPublicationRegistry;
  const recorded = Array.isArray(registry.bindings) ? registry.bindings.length : 0;
  const issues = validateCampusMediaPublicationRegistry({ ...options, registry });
  const valid = issues.length ? 0 : createCampusMediaPublicationIndex({ ...options, registry }).size;
  const required = Object.keys(rolesByRecordId).length;
  return { recorded, valid, required, releaseReady: valid === required, issues } as const;
}

export function resolveCampusMedia(options: {
  recordId: CampusRecordId;
  fallbackSrc: string;
  registry?: CampusMediaPublicationRegistryInput;
  manifest?: CampusMediaApprovalManifestInput;
  now?: Date | string | number;
}) {
  const binding = createCampusMediaPublicationIndex(options).get(options.recordId);
  if (!binding) return { mode: "prototype-review", recordId: options.recordId, fallbackSrc: options.fallbackSrc } as const;
  const publicBasePath = typeof options.registry?.publicBasePath === "string"
    ? options.registry.publicBasePath
    : campusMediaPublicationRegistry.publicBasePath as string;
  const pathFor = (variant: CampusMediaPublicationVariant) => `${publicBasePath}/${binding.recordId}/${variant.filename}`;
  const byFormat = (format: CampusMediaPublicationVariant["format"]) => binding.variants.filter((variant) => variant.format === format).sort((left, right) => left.width - right.width);
  const avif = byFormat("avif");
  const webp = byFormat("webp");
  const jpeg = byFormat("jpeg");
  const largestJpeg = jpeg.at(-1) as CampusMediaPublicationVariant;
  return {
    mode: "production",
    recordId: binding.recordId,
    bindingId: binding.bindingId,
    sources: {
      avif: avif.map((variant) => `${pathFor(variant)} ${variant.width}w`).join(", "),
      webp: webp.map((variant) => `${pathFor(variant)} ${variant.width}w`).join(", "),
      jpeg: jpeg.map((variant) => `${pathFor(variant)} ${variant.width}w`).join(", "),
    },
    fallback: { src: pathFor(largestJpeg), width: largestJpeg.width, height: largestJpeg.height },
  } as const;
}

export function createCampusMediaBindingProposal(receipt: CampusReceiptInput) {
  if (
    receipt.schemaVersion !== 1
    || receipt.pipelineId !== "sskem-campus-media"
    || receipt.mode !== "public"
    || typeof receipt.recordId !== "string"
    || !(receipt.recordId in rolesByRecordId)
    || receipt.decisionAtPreparation !== "approved"
    || typeof receipt.generatedAt !== "string"
    || !dateTimePattern.test(receipt.generatedAt)
    || !isRecord(receipt.source)
    || typeof receipt.source.sha256 !== "string"
    || !sha256Pattern.test(receipt.source.sha256)
    || !isRecord(receipt.output)
    || receipt.output.profile !== "campus-responsive"
    || receipt.output.crop !== "none"
    || !Array.isArray(receipt.output.variants)
  ) throw new Error("The campus publication binding requires an exact approved public derivative receipt.");
  const recordId = receipt.recordId as CampusRecordId;
  const candidate = {
    bindingId: `campus-${recordId}-${receipt.source.sha256.slice(0, 12)}`,
    recordId,
    role: rolesByRecordId[recordId],
    profile: "campus-responsive",
    sourceSha256: receipt.source.sha256,
    publishedOn: receipt.generatedAt,
    variants: receipt.output.variants,
    notes: "Generated from the exact public derivative receipt; approval evidence remains in the controlled system.",
  };
  const syntheticRegistry = {
    ...campusMediaPublicationRegistry,
    bindings: [candidate],
  };
  const syntheticManifest = {
    records: [{ id: recordId, kind: "media", decision: "approved", expiresAt: null }],
  };
  const issues = validateCampusMediaPublicationRegistry({ registry: syntheticRegistry, manifest: syntheticManifest, now: receipt.generatedAt });
  if (issues.length) throw new Error(`The campus publication binding proposal is invalid: ${issues.join(" ")}`);
  return candidate as CampusMediaPublicationBinding;
}
