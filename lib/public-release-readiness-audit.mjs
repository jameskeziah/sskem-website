import { readFile } from "node:fs/promises";

import {
  approvalSummary,
  loadApprovalManifest,
  validateApprovalManifest,
} from "./approval-manifest.mjs";
import { auditCampusMediaPublicationArtifacts } from "./campus-media-publication-audit.mjs";
import { campusMediaPublicationSummary } from "./campus-media-publication.ts";
import { auditHomepageMediaPerformance } from "./homepage-media-performance-audit.mjs";
import { auditHomepageAchievementPublicationArtifacts } from "./homepage-achievement-publication-audit.mjs";
import { homepageAchievementPublicationSummary } from "./homepage-achievement-publication.ts";
import { legacyCutoverSummary, loadLegacyCutoverInventory, validateLegacyCutoverInventory } from "./legacy-cutover.mjs";
import { auditLegacyContentMigrationMatrix } from "./legacy-content-migration-audit.mjs";
import { auditPublicDocumentPublicationArtifacts } from "./public-document-activation.ts";
import { publicDocumentPublicationSummary } from "./public-document-publication.ts";
import { createPublicReleaseReadiness } from "./public-release-readiness.ts";

const projectRoot = new URL("../", import.meta.url);

function unique(values) {
  return [...new Set(values)];
}

async function reviewTreatmentStatus() {
  const [achievementMotion, homepage, dashboardData, artifactIssues] = await Promise.all([
    readFile(new URL("components/motion/home-achievements-motion.tsx", projectRoot), "utf8"),
    readFile(new URL("app/page.tsx", projectRoot), "utf8"),
    readFile(new URL("app/data/public-release-readiness.ts", projectRoot), "utf8"),
    auditHomepageAchievementPublicationArtifacts(),
  ]);
  const publication = homepageAchievementPublicationSummary();
  const issues = [...new Set([...publication.issues, ...artifactIssues])];
  if (!homepage.includes("selectHomepageAchievementArtwork")) issues.push("The homepage does not use the governed achievement selector.");
  if (!homepage.includes('process.env.HOMEPAGE_REVIEW_MODE === "private"')) issues.push("The homepage does not declare its private-review mode boundary.");
  if (!homepage.includes('mode: privateAchievementReview ? "private-review" : "public"')) issues.push("The homepage does not select separate private and public achievement projections.");
  if (!homepage.includes("achievementArtwork.length ?")) issues.push("The homepage does not omit an empty public achievement projection.");
  if (!achievementMotion.includes('publicationMode === "private-review" ? "required" : "approved"')) issues.push("Achievement presentation does not expose its resolved publication mode.");
  if (!dashboardData.includes("achievements.publicProjectionSafe")) issues.push("The dashboard does not consume the achievement projection safety result.");
  return { safe: issues.length === 0, issues };
}

export async function auditPublicReleaseReadiness() {
  const [manifest, campusArtifactIssues, documentArtifactIssues, performance, inventory, contentMigration, reviewTreatment] = await Promise.all([
    loadApprovalManifest(),
    auditCampusMediaPublicationArtifacts(),
    auditPublicDocumentPublicationArtifacts(),
    auditHomepageMediaPerformance(),
    loadLegacyCutoverInventory(),
    auditLegacyContentMigrationMatrix(),
    reviewTreatmentStatus(),
  ]);

  const manifestIssues = validateApprovalManifest(manifest);
  const approvals = approvalSummary(manifest);
  const governedRecords = (manifest.records ?? []).filter((record) => Array.isArray(record.publicTargets) && record.publicTargets.length > 0);
  const approvedRecords = governedRecords.filter((record) => record.decision === "approved").length;
  const campus = campusMediaPublicationSummary({ manifest });
  const documents = publicDocumentPublicationSummary({ manifest });
  const cutoverIssues = validateLegacyCutoverInventory(inventory);
  const cutover = legacyCutoverSummary(inventory);
  const performanceReady = performance.assets.filter((asset) => asset.withinBudget).length;

  return createPublicReleaseReadiness({
    approvals: {
      completed: approvedRecords,
      required: governedRecords.length,
      ready: approvals.releaseReady,
      issues: manifestIssues.map((issue) => `${issue.path}: ${issue.message} [${issue.code}]`),
      blocker: `${approvals.blockingRecords.length} governed record(s) still require approval.`,
    },
    campusMedia: {
      completed: campus.valid,
      required: campus.required,
      ready: campus.releaseReady,
      issues: unique([...campus.issues, ...campusArtifactIssues]),
      blocker: `${campus.valid} of ${campus.required} exact campus bindings are active.`,
    },
    publicDocuments: {
      completed: documents.valid,
      required: documents.required,
      ready: documents.releaseReady,
      issues: unique([...documents.issues, ...documentArtifactIssues]),
      blocker: `${documents.valid} of ${documents.required} exact document bindings are active.`,
    },
    mediaPerformance: {
      completed: performanceReady,
      required: performance.assets.length,
      ready: performanceReady === performance.assets.length,
      issues: performance.integrityIssues,
      blocker: `${performanceReady} of ${performance.assets.length} tracked homepage assets meet their transfer budget.`,
    },
    legacyRoutes: {
      completed: cutover.total - cutover.byImplementation.pending,
      required: cutover.total,
      ready: cutover.routeReady,
      issues: cutoverIssues.map((issue) => `${issue.path}: ${issue.message} [${issue.code}]`),
      blocker: `${cutover.byImplementation.pending} legacy route implementation(s) remain.`,
    },
    contentMigration: {
      completed: contentMigration.summary.verified,
      required: contentMigration.summary.total,
      ready: contentMigration.summary.completionReady,
      issues: contentMigration.issues.map((issue) => `${issue.path}: ${issue.message} [${issue.code}]`),
      blocker: `${contentMigration.summary.total - contentMigration.summary.verified} archived content record(s) still require a final decision, implementation and verification.`,
    },
    reviewTreatment: {
      completed: reviewTreatment.safe ? 1 : 0,
      required: 1,
      ready: reviewTreatment.safe,
      issues: reviewTreatment.issues,
      blocker: "The homepage achievement projection is not safely separated from private review.",
    },
  });
}
