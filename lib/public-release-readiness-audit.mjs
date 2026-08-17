import { readFile } from "node:fs/promises";

import {
  approvalSummary,
  loadApprovalManifest,
  validateApprovalManifest,
} from "./approval-manifest.mjs";
import { auditCampusMediaPublicationArtifacts } from "./campus-media-publication-audit.mjs";
import { campusMediaPublicationSummary } from "./campus-media-publication.ts";
import { auditHomepageMediaPerformance } from "./homepage-media-performance-audit.mjs";
import { legacyCutoverSummary, loadLegacyCutoverInventory, validateLegacyCutoverInventory } from "./legacy-cutover.mjs";
import { auditPublicDocumentPublicationArtifacts } from "./public-document-activation.ts";
import { publicDocumentPublicationSummary } from "./public-document-publication.ts";
import { createPublicReleaseReadiness } from "./public-release-readiness.ts";

const projectRoot = new URL("../", import.meta.url);

function unique(values) {
  return [...new Set(values)];
}

async function reviewTreatmentStatus() {
  const [achievementMotion, homepage, dashboardData] = await Promise.all([
    readFile(new URL("components/motion/home-achievements-motion.tsx", projectRoot), "utf8"),
    readFile(new URL("app/page.tsx", projectRoot), "utf8"),
    readFile(new URL("app/data/public-release-readiness.ts", projectRoot), "utf8"),
  ]);
  const active = achievementMotion.includes('data-publication-review="required"')
    || homepage.includes("These supplied creatives are staged for private review");
  const dashboardMatch = dashboardData.match(/reviewOnlySourceTreatmentActive\s*=\s*(true|false)/);
  const dashboardActive = dashboardMatch?.[1] === "true";
  const issues = dashboardMatch && dashboardActive === active
    ? []
    : ["Dashboard review-treatment status does not match the homepage source."];
  return { active, issues };
}

export async function auditPublicReleaseReadiness() {
  const [manifest, campusArtifactIssues, documentArtifactIssues, performance, inventory, reviewTreatment] = await Promise.all([
    loadApprovalManifest(),
    auditCampusMediaPublicationArtifacts(),
    auditPublicDocumentPublicationArtifacts(),
    auditHomepageMediaPerformance(),
    loadLegacyCutoverInventory(),
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
    reviewTreatment: {
      completed: reviewTreatment.active ? 0 : 1,
      required: 1,
      ready: !reviewTreatment.active,
      issues: reviewTreatment.issues,
      blocker: "The homepage still contains intentional private-review treatment.",
    },
  });
}
