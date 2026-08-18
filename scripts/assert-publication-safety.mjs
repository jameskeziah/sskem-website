import { access } from "node:fs/promises";

import {
  approvalSummary,
  loadApprovalManifest,
  validateApprovalManifest,
} from "../lib/approval-manifest.mjs";
import { homepageAchievementPublicationSummary } from "../lib/homepage-achievement-publication.ts";

const projectRoot = new URL("../", import.meta.url);
const privateReviewMode = process.env.HOMEPAGE_REVIEW_MODE === "private";

async function exists(path) {
  try {
    await access(new URL(path, projectRoot));
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

const manifest = await loadApprovalManifest();
const issues = validateApprovalManifest(manifest);
if (issues.length) {
  throw new Error(
    `Approval manifest validation failed:\n${issues
      .slice(0, 12)
      .map((issue) => `- ${issue.path}: ${issue.message} [${issue.code}]`)
      .join("\n")}`,
  );
}

const mediaRecords = manifest.records.filter((record) => record.kind === "media" && record.decision !== "withdrawn");
const assetChecks = await Promise.all(
  mediaRecords.map(async (record) => ({ record, exists: await exists(record.sourcePointer) })),
);
const missingAssets = assetChecks.filter((asset) => !asset.exists).map((asset) => asset.record.id);
if (missingAssets.length) {
  throw new Error(`Approval manifest references missing media:\n- ${missingAssets.join("\n- ")}`);
}

const achievementPublication = homepageAchievementPublicationSummary({ manifest });
if (achievementPublication.issues.length) {
  throw new Error(
    `Homepage achievement publication validation failed:\n- ${achievementPublication.issues.join("\n- ")}`,
  );
}

const summary = approvalSummary(manifest);
if (privateReviewMode) {
  process.stdout.write(
    `Publication approvals: manifest valid; private review acknowledged (${summary.blockingRecords.length} release blockers across ${summary.total} records).\n`,
  );
} else if (!summary.releaseReady) {
  const counts = summary.blockingByKind;
  throw new Error(
    [
      "Public build blocked by the structured approval manifest.",
      `Unapproved scope: ${counts.media} media, ${counts.claim} claims and ${counts.document} documents (${summary.blockingRecords.length} release blockers).`,
      "Run `npm run approvals:audit` for the summary or `npm run approvals:release` for the blocking IDs.",
      "Use `npm run build:review` only for an access-controlled private review.",
      "Private evidence stays outside the repository; add only opaque controlled-record references to the manifest.",
    ].join("\n"),
  );
} else {
  process.stdout.write("Publication approvals: manifest valid and public release ready.\n");
}
