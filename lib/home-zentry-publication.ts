import heroPublicationData from "../content/home-zentry-publication.json" with { type: "json" };
import approvalManifestData from "../content/approval-manifest.json" with { type: "json" };
import { homeZentrySlides, type HomeZentrySlide } from "./home-zentry-slides.ts";

/**
 * Explicit public projection of the private seven-scene creative.
 * Never infer photo approval from the existence of a file or a Vercel flag.
 * Evidence and identities stay in the school's controlled approval system.
 */
export type HeroPublicationEntry = {
  id: string;
  recordId: string;
  decision: "pending" | "approved";
  visualReviewStatus: "pending" | "approved";
  full: string;
  preview: string;
  sourceSha256: string;
  fullSha256: string;
  previewSha256: string;
  receiptRef: string;
  approvedAlt: boolean;
};

export type HeroPublicationConfig = {
  schemaVersion: number;
  slides: HeroPublicationEntry[];
};

export type MediaApproval = {
  id: string;
  kind: string;
  decision: string;
  publicTargets?: string[];
  checks?: Record<string, string>;
  evidenceReferences?: string[];
  approvedByRole?: string | null;
  approvedAt?: string | null;
  expiresAt?: string | null;
};

export type HeroPublicationAssessment = {
  ready: boolean;
  issues: string[];
  slides: readonly HomeZentrySlide[];
};

const sha256 = /^[a-f0-9]{64}$/;

function publicationPath(id: string, role: "full" | "preview", digest: string) {
  return `/media/home/production/hero/${id}/${role}-${String(digest ?? "").slice(0, 12)}.webp`;
}

/** Pure validator, so publication failures can be tested without private photos. */
export function assessHeroPublication(
  config: HeroPublicationConfig,
  approvalRecords: readonly MediaApproval[],
): HeroPublicationAssessment {
  const issues: string[] = [];
  const slots = homeZentrySlides.map((slide) => slide.id);
  if (config.schemaVersion !== 1 || !Array.isArray(config.slides) || config.slides.length !== slots.length) {
    return { ready: false, issues: ["Exactly seven version-1 publication entries are required."], slides: [] };
  }
  const usedPaths = new Set<string>();
  const projected: HomeZentrySlide[] = [];
  for (const [index, id] of slots.entries()) {
    const entry = config.slides[index];
    if (!entry || entry.id !== id || entry.recordId !== `media-hero-${id}`) {
      issues.push(`Scene ${id}: missing, reordered, or incorrect approval record ID.`);
      continue;
    }
    if (entry.decision !== "approved" || entry.visualReviewStatus !== "approved" || entry.approvedAlt !== true) {
      issues.push(`Scene ${id}: asset, crop, or accessible caption awaits approval.`);
    }
    const approval = approvalRecords.find((record) => record.id === entry.recordId);
    if (
      !approval || approval.kind !== "media" || approval.decision !== "approved" ||
      !approval.publicTargets?.includes("/")
    ) {
      issues.push(`Scene ${id}: exact media record is not approved for the homepage.`);
    }
    // An approval flag is insufficient: verify all checklist items, management
    // sign-off and the exact derivative receipt in the controlled manifest.
    if (approval) {
      const states = Object.values(approval.checks ?? {});
      if (
        states.length === 0 ||
        !states.every((state) => state === "verified" || state === "not-applicable") ||
        !approval.evidenceReferences?.includes(entry.receiptRef) ||
        !approval.approvedByRole?.trim() ||
        !approval.approvedAt || !Number.isFinite(Date.parse(approval.approvedAt))
      ) {
        issues.push(`Scene ${id}: mandatory review, receipt evidence or approval signature is missing.`);
      }
    }
    if (approval?.expiresAt) {
      const expiry = Date.parse(`${approval.expiresAt}T23:59:59.999Z`);
      if (!Number.isFinite(expiry) || expiry < Date.now()) {
        issues.push(`Scene ${id}: media publication permission has expired.`);
      }
    }
    for (const field of ["sourceSha256", "fullSha256", "previewSha256"] as const) {
      if (!sha256.test(entry[field])) issues.push(`Scene ${id}: invalid or absent ${field}.`);
    }
    if (typeof entry.receiptRef !== "string" || entry.receiptRef.trim().length < 8 || /[\\\r\n]/.test(entry.receiptRef)) {
      issues.push(`Scene ${id}: controlled derivative receipt reference is required.`);
    }
    for (const [role, path, digest] of [
      ["full", entry.full, entry.fullSha256],
      ["preview", entry.preview, entry.previewSha256],
    ] as const) {
      if (!sha256.test(digest) || path !== publicationPath(id, role, digest)) {
        issues.push(`Scene ${id}: ${role} must use its exact hashed production WebP path.`);
      }
      if (usedPaths.has(path)) issues.push(`Scene ${id}: duplicate production asset path.`);
      usedPaths.add(path);
    }
    projected.push({
      ...homeZentrySlides[index],
      image: entry.full,
      preview: entry.preview,
      visualReviewStatus: "approved",
    });
  }
  if (issues.length) return { ready: false, issues, slides: [] };
  return { ready: true, issues: [], slides: Object.freeze(projected) };
}

export const heroPublicationConfig = heroPublicationData as HeroPublicationConfig;
export const heroApprovalRecords = (approvalManifestData as unknown as { records: MediaApproval[] }).records;

export function getPublicHeroPublication(): HeroPublicationAssessment {
  return assessHeroPublication(heroPublicationConfig, heroApprovalRecords);
}
