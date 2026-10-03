import { access } from "node:fs/promises";

import {
  approvalSummary,
  loadApprovalManifest,
  validateApprovalManifest,
} from "../lib/approval-manifest.mjs";
import { homepageAchievementPublicationSummary } from "../lib/homepage-achievement-publication.ts";

const projectRoot = new URL("../", import.meta.url);

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

/*
 * BUILD INTEGRITY
 *
 * A normal website build verifies that the publication configuration is valid,
 * but it does NOT require every future/pending publication item to be approved.
 *
 * Unapproved content must remain unavailable through the application's
 * fail-closed publication selectors.
 */

const issues = validateApprovalManifest(manifest);

if (issues.length) {
  throw new Error(
    `Approval manifest integrity failed:\n${issues
      .slice(0, 12)
      .map((issue) => `- ${issue.path}: ${issue.message} [${issue.code}]`)
      .join("\n")}`,
  );
}

/*
 * Only media that is actually APPROVED for a public target is required
 * to exist for an ordinary production build.
 *
 * Draft/review-required/blocked assets must not prevent unrelated
 * CSS, layout, animation or code changes from being deployed.
 */
const approvedPublicMedia = manifest.records.filter(
  (record) =>
    record.kind === "media" &&
    record.decision === "approved" &&
    Array.isArray(record.publicTargets) &&
    record.publicTargets.length > 0,
);

const assetChecks = await Promise.all(
  approvedPublicMedia.map(async (record) => ({
    record,
    exists: await exists(record.sourcePointer),
  })),
);

const missingApprovedAssets = assetChecks
  .filter((asset) => !asset.exists)
  .map((asset) => asset.record.id);

if (missingApprovedAssets.length) {
  throw new Error(
    `Approved public media is missing:\n- ${missingApprovedAssets.join("\n- ")}`,
  );
}

/*
 * Active achievement publication bindings must still remain internally safe.
 * This does not require every proposed achievement to be approved.
 */
const achievementPublication = homepageAchievementPublicationSummary({ manifest });

if (achievementPublication.issues.length) {
  throw new Error(
    `Active homepage achievement publication is invalid:\n- ${achievementPublication.issues.join(
      "\n- ",
    )}`,
  );
}

const summary = approvalSummary(manifest);

process.stdout.write(
  [
    "Build integrity: PASSED.",
    `${approvedPublicMedia.length} approved public media asset(s) verified.`,
    `${summary.blockingRecords.length} publication item(s) remain pending or blocked.`,
    "Pending publication work does not block unrelated website builds.",
    "Run `npm run release:full-audit` when evaluating full-site publication readiness.",
  ].join("\n") + "\n",
);
