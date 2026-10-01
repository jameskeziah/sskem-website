import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { getPublicHeroPublication, heroPublicationConfig } from "../lib/home-zentry-publication.ts";

const isPrivateReview = process.env.HOMEPAGE_REVIEW_MODE === "private" &&
  (process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development");
if (isPrivateReview) {
  console.log("Private review build; public seven-slide hero remains isolated.");
} else {
  // Public homepage publication is determined by exact authorized media records
  // and actual file integrity, never by a manually maintained Vercel flag.
  const issues = [];
  const projection = getPublicHeroPublication();
  issues.push(...projection.issues);

  if (projection.ready) {
    for (const entry of heroPublicationConfig.slides) {
      for (const [role, path, digest] of [
        ["full", entry.full, entry.fullSha256],
        ["preview", entry.preview, entry.previewSha256],
      ]) {
        const diskPath = fileURLToPath(new URL(`../public${path}`, import.meta.url));
        try {
          const contents = await readFile(diskPath);
          const realDigest = createHash("sha256").update(contents).digest("hex");
          if (realDigest !== digest) issues.push(`${entry.id}: ${role} file does not match its recorded SHA-256.`);
          const metadata = await sharp(contents).metadata();
          const minWidth = role === "full" ? 1400 : 320;
          const maxBytes = role === "full" ? 1_500_000 : 110_000;
          if (metadata.format !== "webp" || !metadata.width || metadata.width < minWidth) {
            issues.push(`${entry.id}: ${role} is not an appropriately sized WebP.`);
          }
          if (contents.length > maxBytes) {
            issues.push(`${entry.id}: ${role} exceeds its media size budget.`);
          }
          if (metadata.exif) issues.push(`${entry.id}: ${role} retains EXIF metadata.`);
        } catch (error) {
          issues.push(`${entry.id}: ${role} production image is missing or unreadable (${error.code ?? "invalid image"}).`);
        }
      }
    }
  }

  // Publishing the fully authorized homepage hero does not assert that
  // unrelated school certificates, results or archived routes are approved.
  // Keep the full institutional release audit visible and intact as a
  // separate gate for those other sections and their future activations.
  if (issues.length === 0) {
    const { auditPublicReleaseReadiness } = await import("../lib/public-release-readiness-audit.mjs");
    const readiness = await auditPublicReleaseReadiness();
    if (readiness.issues.length) {
      issues.push(...readiness.issues.map((issue) => `School release integrity: ${issue}`));
    }
    if (!readiness.releaseReady) {
      console.warn("Homepage-only media release: remaining institutional publication gates are still blocked and must not be represented as complete.");
      for (const gate of readiness.gates.filter((gate) => !gate.ready)) {
        console.warn(`Unresolved independent gate: ${gate.label} (${gate.completed}/${gate.required}).`);
      }
    }
  }

  if (issues.length) {
    console.error("Public Zentry hero media publication BLOCKED:\n- " + issues.join("\n- "));
    process.exitCode = 1;
  } else {
    console.log("Homepage hero media: seven authorized full/preview pairs verified. Unrelated school-wide gate state is reported separately.");
  }
}
