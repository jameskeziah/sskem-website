import approvalManifestData from "../content/approval-manifest.json" with { type: "json" };
import budgetData from "../content/homepage-media-performance-budget.json" with { type: "json" };

type UnknownRecord = Record<string, unknown>;
type ApprovalRecordInput = { id?: unknown; kind?: unknown; sourcePointer?: unknown };
export type HomepageMediaApprovalManifestInput = { records?: readonly ApprovalRecordInput[] };

export type HomepageMediaPerformanceAsset = {
  id: string;
  path: string;
  publicUrl: string;
  approvalRecordId: string;
  placement: "desktop-hero-and-social" | "mobile-hero-private-prototype" | "campus-chapter-private-prototype";
  format: "png" | "jpeg";
  width: number;
  height: number;
  observedBytes: number;
  maximumBytes: number;
};

export type HomepageMediaPerformanceBudget = {
  $schema?: unknown;
  schemaVersion?: unknown;
  budgetId?: unknown;
  policy?: unknown;
  assets?: unknown;
};

export type CampusBindingSummaryInput = {
  valid: number;
  required: number;
  releaseReady: boolean;
};

const assetContract = {
  "homepage-social-poster": {
    path: "public/og.png",
    publicUrl: "/og.png",
    approvalRecordId: "media-homepage-social-poster",
    placement: "desktop-hero-and-social",
    format: "png",
    width: 1200,
    height: 630,
  },
  "campus-main-prototype": {
    path: "public/media/home/campus-main.jpeg",
    publicUrl: "/media/home/campus-main.jpeg",
    approvalRecordId: "media-campus-main",
    placement: "mobile-hero-private-prototype",
    format: "jpeg",
    width: 1400,
    height: 500,
  },
  "campus-grounds-prototype": {
    path: "public/media/home/campus-grounds.jpeg",
    publicUrl: "/media/home/campus-grounds.jpeg",
    approvalRecordId: "media-campus-grounds",
    placement: "campus-chapter-private-prototype",
    format: "jpeg",
    width: 1400,
    height: 500,
  },
  "campus-entrance-prototype": {
    path: "public/media/home/campus-entrance.jpeg",
    publicUrl: "/media/home/campus-entrance.jpeg",
    approvalRecordId: "media-campus-entrance",
    placement: "campus-chapter-private-prototype",
    format: "jpeg",
    width: 1400,
    height: 500,
  },
  "campus-courtyard-prototype": {
    path: "public/media/home/campus-courtyard.jpeg",
    publicUrl: "/media/home/campus-courtyard.jpeg",
    approvalRecordId: "media-campus-courtyard",
    placement: "campus-chapter-private-prototype",
    format: "jpeg",
    width: 1400,
    height: 500,
  },
} as const;

const topLevelKeys = new Set(["$schema", "schemaVersion", "budgetId", "policy", "assets"]);
const policyKeys = new Set(["auditMayModifyArtwork", "privatePrototypeOverageAllowed", "publicReleaseFailsOnOverage", "exactCampusBindingsRequired", "notes"]);
const assetKeys = new Set(["id", "path", "publicUrl", "approvalRecordId", "placement", "format", "width", "height", "observedBytes", "maximumBytes"]);

export const homepageMediaPerformanceBudget = budgetData as unknown as HomepageMediaPerformanceBudget;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function unknownKeys(value: unknown, allowed: Set<string>) {
  return isRecord(value) ? Object.keys(value).filter((key) => !allowed.has(key)) : [];
}

function exactContractMatch(asset: UnknownRecord, expected: (typeof assetContract)[keyof typeof assetContract]) {
  return asset.path === expected.path
    && asset.publicUrl === expected.publicUrl
    && asset.approvalRecordId === expected.approvalRecordId
    && asset.placement === expected.placement
    && asset.format === expected.format
    && asset.width === expected.width
    && asset.height === expected.height;
}

export function validateHomepageMediaPerformanceBudget(options: {
  budget?: HomepageMediaPerformanceBudget;
  manifest?: HomepageMediaApprovalManifestInput;
} = {}) {
  const budget = options.budget ?? homepageMediaPerformanceBudget;
  const manifest = options.manifest ?? approvalManifestData as HomepageMediaApprovalManifestInput;
  const issues: string[] = [];

  if (unknownKeys(budget, topLevelKeys).length) issues.push("The homepage media performance budget contains unknown top-level fields.");
  if (
    budget.$schema !== "./homepage-media-performance-budget.schema.json"
    || budget.schemaVersion !== 1
    || budget.budgetId !== "sskem-homepage-media-performance"
  ) issues.push("The homepage media performance budget identity is invalid.");

  if (!isRecord(budget.policy)) {
    issues.push("The homepage media performance policy must be an object.");
  } else {
    if (unknownKeys(budget.policy, policyKeys).length) issues.push("The homepage media performance policy contains unknown fields.");
    if (
      budget.policy.auditMayModifyArtwork !== false
      || budget.policy.privatePrototypeOverageAllowed !== true
      || budget.policy.publicReleaseFailsOnOverage !== true
      || budget.policy.exactCampusBindingsRequired !== 4
      || typeof budget.policy.notes !== "string"
      || budget.policy.notes.trim().length < 20
    ) issues.push("The homepage media performance policy is invalid.");
  }

  if (!Array.isArray(budget.assets)) return [...issues, "The homepage media performance assets must be an array."];
  const manifestById = new Map((manifest.records ?? []).map((record) => [record.id, record]));
  const seen = new Set<string>();

  for (const [index, value] of budget.assets.entries()) {
    const path = `assets[${index}]`;
    if (!isRecord(value)) {
      issues.push(`${path} must be an object.`);
      continue;
    }
    if (unknownKeys(value, assetKeys).length) issues.push(`${path} contains unknown fields.`);
    if (typeof value.id !== "string" || !(value.id in assetContract)) {
      issues.push(`${path}.id is not a tracked homepage asset.`);
      continue;
    }
    if (seen.has(value.id)) issues.push(`${path}.id is duplicated.`);
    seen.add(value.id);
    const expected = assetContract[value.id as keyof typeof assetContract];
    if (!exactContractMatch(value, expected)) issues.push(`${path} does not match the canonical homepage placement contract.`);
    if (!Number.isInteger(value.observedBytes) || (value.observedBytes as number) < 1) issues.push(`${path}.observedBytes must be a positive integer.`);
    if (!Number.isInteger(value.maximumBytes) || (value.maximumBytes as number) < 1 || (value.maximumBytes as number) > 500000) issues.push(`${path}.maximumBytes must be between 1 and 500000.`);
    const approval = manifestById.get(value.approvalRecordId);
    if (!approval || approval.kind !== "media" || approval.sourcePointer !== value.path) issues.push(`${path} does not match its canonical media approval record.`);
  }

  const requiredIds = Object.keys(assetContract);
  if (budget.assets.length !== requiredIds.length || requiredIds.some((id) => !seen.has(id))) issues.push("The homepage media performance budget must contain the exact five tracked assets.");
  return issues;
}

export function formatMediaBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

export function homepageMediaPerformanceSummary(options: {
  budget?: HomepageMediaPerformanceBudget;
  manifest?: HomepageMediaApprovalManifestInput;
  campusSummary?: CampusBindingSummaryInput;
} = {}) {
  const budget = options.budget ?? homepageMediaPerformanceBudget;
  const issues = validateHomepageMediaPerformanceBudget({ budget, manifest: options.manifest });
  const assets = Array.isArray(budget.assets)
    ? budget.assets.filter(isRecord).map((asset) => {
        const observedBytes = typeof asset.observedBytes === "number" ? asset.observedBytes : 0;
        const maximumBytes = typeof asset.maximumBytes === "number" ? asset.maximumBytes : 0;
        return {
          id: typeof asset.id === "string" ? asset.id : "invalid-asset",
          observedBytes,
          maximumBytes,
          overageBytes: Math.max(0, observedBytes - maximumBytes),
          withinBudget: observedBytes > 0 && maximumBytes > 0 && observedBytes <= maximumBytes,
        };
      })
    : [];
  const campus = options.campusSummary ?? { valid: 0, required: 4, releaseReady: false };
  const blockers = [
    ...assets.filter((asset) => !asset.withinBudget).map((asset) => ({
      code: "asset-over-budget" as const,
      assetId: asset.id,
      message: `${asset.id} exceeds its public-release budget by ${formatMediaBytes(asset.overageBytes)}.`,
    })),
    ...(!campus.releaseReady || campus.valid !== 4 || campus.required !== 4 ? [{
      code: "campus-bindings-incomplete" as const,
      assetId: null,
      message: `Exact approved campus bindings are ${campus.valid} of 4.`,
    }] : []),
  ];

  return {
    budgetId: budget.budgetId === "sskem-homepage-media-performance" ? budget.budgetId : "invalid-budget",
    assets,
    trackedBytes: assets.reduce((total, asset) => total + asset.observedBytes, 0),
    issues,
    blockers,
    privateReviewAllowed: issues.length === 0,
    releaseReady: issues.length === 0 && blockers.length === 0,
  } as const;
}
