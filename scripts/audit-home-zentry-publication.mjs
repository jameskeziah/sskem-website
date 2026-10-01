import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { getPublicHeroPublication, heroPublicationConfig } from "../lib/home-zentry-publication.ts";

const activated = process.env.HOMEPAGE_PUBLIC_ZENTRY_HERO === "true";
if (!activated) {
  console.log("Public seven-slide hero disabled; no unapproved private media will be published.");
} else {
  const issues = [];
  if (process.env.HOMEPAGE_REVIEW_MODE === "private") {
    issues.push("Public hero cannot run alongside HOMEPAGE_REVIEW_MODE=private.");
  }
  if (process.env.HOMEPAGE_PUBLIC_PRELOADER !== "true") {
    issues.push("Public hero requires HOMEPAGE_PUBLIC_PRELOADER=true.");
  }
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

  // The project's existing school-wide release policy still applies.
  if (issues.length === 0) {
    const { auditPublicReleaseReadiness } = await import("../lib/public-release-readiness-audit.mjs");
    const readiness = await auditPublicReleaseReadiness();
    if (!readiness.releaseReady || readiness.issues.length) {
      issues.push("The school's public release audit is not ready; do not bypass existing publication gates.");
      for (const gate of readiness.gates.filter((gate) => !gate.ready)) {
        issues.push(`Release gate blocked: ${gate.label} (${gate.completed}/${gate.required}).`);
      }
    }
  }

  if (issues.length) {
    console.error("Public Zentry hero publication BLOCKED:\n- " + issues.join("\n- "));
    process.exitCode = 1;
  } else {
    console.log("Public Zentry hero: seven approved full/preview pairs and existing school release gates verified.");
  }
}
