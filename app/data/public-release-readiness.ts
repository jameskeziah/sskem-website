import { approvalManifest, approvalSummary } from "./publication-approval";
import { legacyCutoverDashboard } from "./legacy-cutover";
import { campusMediaPublicationSummary } from "../../lib/campus-media-publication.ts";
import { homepageMediaPerformanceSummary } from "../../lib/homepage-media-performance.ts";
import { homepageAchievementPublicationSummary } from "../../lib/homepage-achievement-publication.ts";
import { publicDocumentPublicationSummary } from "../../lib/public-document-publication.ts";
import { createPublicReleaseReadiness } from "../../lib/public-release-readiness.ts";

export function publicReleaseReadinessDashboard() {
  const approvals = approvalSummary();
  const governedRecords = approvalManifest.records.filter((record) => record.publicTargets.length > 0);
  const approvedRecords = governedRecords.filter((record) => record.decision === "approved").length;
  const campus = campusMediaPublicationSummary();
  const documents = publicDocumentPublicationSummary();
  const achievements = homepageAchievementPublicationSummary();
  const performance = homepageMediaPerformanceSummary({ campusSummary: campus });
  const performanceReady = performance.assets.filter((asset) => asset.withinBudget).length;

  return createPublicReleaseReadiness({
    approvals: {
      completed: approvedRecords,
      required: governedRecords.length,
      ready: approvals.releaseReady,
      blocker: `${approvals.releaseBlockers.length} governed record(s) still require approval.`,
    },
    campusMedia: {
      completed: campus.valid,
      required: campus.required,
      ready: campus.releaseReady,
      issues: campus.issues,
      blocker: `${campus.valid} of ${campus.required} exact campus bindings are active.`,
    },
    publicDocuments: {
      completed: documents.valid,
      required: documents.required,
      ready: documents.releaseReady,
      issues: documents.issues,
      blocker: `${documents.valid} of ${documents.required} exact document bindings are active.`,
    },
    mediaPerformance: {
      completed: performanceReady,
      required: performance.assets.length,
      ready: performanceReady === performance.assets.length,
      issues: performance.issues,
      blocker: `${performanceReady} of ${performance.assets.length} tracked homepage assets meet their transfer budget.`,
    },
    legacyRoutes: {
      completed: legacyCutoverDashboard.total - legacyCutoverDashboard.pendingImplementation,
      required: legacyCutoverDashboard.total,
      ready: legacyCutoverDashboard.pendingImplementation === 0,
      blocker: `${legacyCutoverDashboard.pendingImplementation} legacy route implementation(s) remain.`,
    },
    reviewTreatment: {
      completed: achievements.publicProjectionSafe ? 1 : 0,
      required: 1,
      ready: achievements.publicProjectionSafe,
      issues: achievements.issues,
      blocker: "The homepage achievement projection is not safely separated from private review.",
    },
  });
}
