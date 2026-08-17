import { stat } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import {
  homepageMediaPerformanceBudget,
  homepageMediaPerformanceSummary,
  validateHomepageMediaPerformanceBudget,
} from "./homepage-media-performance.ts";
import { campusMediaPublicationSummary } from "./campus-media-publication.ts";

export async function auditHomepageMediaPerformance(options = {}) {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const budget = options.budget ?? homepageMediaPerformanceBudget;
  const campusSummary = options.campusSummary ?? campusMediaPublicationSummary();
  const integrityIssues = validateHomepageMediaPerformanceBudget({ budget, manifest: options.manifest });
  const measurements = [];

  if (Array.isArray(budget.assets)) {
    for (const asset of budget.assets) {
      if (!asset || typeof asset !== "object" || typeof asset.path !== "string") continue;
      const resolvedPath = path.resolve(rootDir, asset.path);
      if (resolvedPath !== rootDir && !resolvedPath.startsWith(`${rootDir}${path.sep}`)) {
        integrityIssues.push(`${asset.id ?? "unknown asset"} resolves outside the project root.`);
        continue;
      }
      try {
        const [file, metadata] = await Promise.all([stat(resolvedPath), sharp(resolvedPath).metadata()]);
        const measurement = {
          id: asset.id,
          bytes: file.size,
          width: metadata.width ?? 0,
          height: metadata.height ?? 0,
          format: metadata.format ?? "unknown",
        };
        measurements.push(measurement);
        if (!file.isFile()) integrityIssues.push(`${asset.id} is not a file.`);
        if (measurement.bytes !== asset.observedBytes) integrityIssues.push(`${asset.id} byte count drifted: expected ${asset.observedBytes}, found ${measurement.bytes}.`);
        if (measurement.width !== asset.width || measurement.height !== asset.height) integrityIssues.push(`${asset.id} dimensions drifted: expected ${asset.width} x ${asset.height}, found ${measurement.width} x ${measurement.height}.`);
        if (measurement.format !== asset.format) integrityIssues.push(`${asset.id} format drifted: expected ${asset.format}, found ${measurement.format}.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        integrityIssues.push(`${asset.id ?? "unknown asset"} could not be inspected: ${message}`);
      }
    }
  }

  const summary = homepageMediaPerformanceSummary({ budget, manifest: options.manifest, campusSummary });
  const uniqueIntegrityIssues = [...new Set([...summary.issues, ...integrityIssues])];
  return {
    ...summary,
    measurements,
    integrityIssues: uniqueIntegrityIssues,
    privateReviewAllowed: uniqueIntegrityIssues.length === 0,
    releaseReady: uniqueIntegrityIssues.length === 0 && summary.blockers.length === 0,
  };
}
