import { auditPublicDocumentPublicationArtifacts } from "../lib/public-document-activation.ts";
import { publicDocumentPublicationSummary } from "../lib/public-document-publication.ts";

const privateReview = process.env.HOMEPAGE_REVIEW_MODE === "private";
const summary = publicDocumentPublicationSummary();
const artifactIssues = await auditPublicDocumentPublicationArtifacts();
const issues = [...new Set([...summary.issues, ...artifactIssues])];

if (issues.length) {
  console.error(`Public document publication audit failed with ${issues.length} issue(s):`);
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exitCode = 1;
} else if (!summary.releaseReady && privateReview) {
  console.warn(`Private review allowed: ${summary.valid} of ${summary.required} exact public document binding(s) active.`);
} else if (!summary.releaseReady) {
  console.error(`Public release blocked: ${summary.valid} of ${summary.required} exact public document binding(s) active.`);
  process.exitCode = 1;
} else {
  console.log(`Public document publication audit passed: ${summary.valid} of ${summary.required} exact binding(s) active.`);
}
