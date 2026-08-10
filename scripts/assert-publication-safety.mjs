import { access, readFile } from "node:fs/promises";

import {
  approvalSummary,
  loadApprovalManifest,
  validateApprovalManifest,
} from "../lib/approval-manifest.mjs";

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

const [manifest, achievementMotion, homepage] = await Promise.all([
  loadApprovalManifest(),
  readFile(new URL("components/motion/home-achievements-motion.tsx", projectRoot), "utf8"),
  readFile(new URL("app/page.tsx", projectRoot), "utf8"),
]);
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

const protectedMedia = mediaRecords.filter((record) => record.checkProfile === "pupil-media");
const sourceStillRequiresReview =
  achievementMotion.includes('data-publication-review="required"') ||
  homepage.includes("These supplied creatives are staged for private review");
const protectedMediaReady = protectedMedia.every((record) => record.decision === "approved");
if (sourceStillRequiresReview && protectedMediaReady) {
  throw new Error(
    "Approval manifest marks pupil media approved, but the homepage still declares publication review required. Resolve the source and manifest together.",
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
} else if (sourceStillRequiresReview) {
  throw new Error(
    "Approval manifest is release-ready, but the homepage still declares publication review required. Remove the review-only presentation through an intentional code change.",
  );
} else {
  process.stdout.write("Publication approvals: manifest valid and public release ready.\n");
}
