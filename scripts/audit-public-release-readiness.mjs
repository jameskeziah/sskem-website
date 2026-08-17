import { auditPublicReleaseReadiness } from "../lib/public-release-readiness-audit.mjs";

const privateReview = process.env.HOMEPAGE_REVIEW_MODE === "private";
const json = process.argv.includes("--json");
const report = await auditPublicReleaseReadiness();

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Public release readiness: ${report.readyGates} of ${report.totalGates} gates ready.`);
  for (const gate of report.gates) {
    console.log(`- ${gate.label}: ${gate.ready ? "READY" : "BLOCKED"} (${gate.completed}/${gate.required})${gate.blocker ? ` - ${gate.blocker}` : ""}`);
  }
}

if (report.issues.length) {
  if (!json) {
    console.error(`Release-gate integrity failed with ${report.issues.length} issue(s):`);
    report.issues.forEach((issue) => console.error(`- ${issue}`));
  }
  process.exitCode = 1;
} else if (!report.releaseReady && privateReview) {
  if (!json) console.warn(`Private review allowed with ${report.blockedGates} public-release gate(s) blocked.`);
} else if (!report.releaseReady) {
  if (!json) console.error("Public release blocked. Resolve every gate or use build:review for controlled private review.");
  process.exitCode = 1;
} else if (!json) {
  console.log("All public-release gates are ready.");
}
