import { auditHomepageMediaPerformance } from "../lib/homepage-media-performance-audit.mjs";
import { formatMediaBytes } from "../lib/homepage-media-performance.ts";

const privateReview = process.env.HOMEPAGE_REVIEW_MODE === "private";
const report = await auditHomepageMediaPerformance();

console.log(`Homepage media performance: ${report.measurements.length} assets inspected (${formatMediaBytes(report.trackedBytes)} tracked).`);
for (const asset of report.assets) {
  console.log(`- ${asset.id}: ${formatMediaBytes(asset.observedBytes)} / ${formatMediaBytes(asset.maximumBytes)} ${asset.withinBudget ? "within budget" : "OVER BUDGET"}`);
}

if (report.integrityIssues.length) {
  console.error("Homepage media performance integrity failed:");
  report.integrityIssues.forEach((issue) => console.error(`- ${issue}`));
  process.exitCode = 1;
} else if (report.blockers.length && privateReview) {
  console.warn(`Private review allowed with ${report.blockers.length} public-release blocker(s):`);
  report.blockers.forEach((blocker) => console.warn(`- ${blocker.message}`));
} else if (report.blockers.length) {
  console.error("Public release blocked by homepage media performance:");
  report.blockers.forEach((blocker) => console.error(`- ${blocker.message}`));
  process.exitCode = 1;
} else {
  console.log("Homepage media performance is ready for public release.");
}
