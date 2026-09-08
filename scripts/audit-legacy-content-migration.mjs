import { auditLegacyContentMigrationMatrix } from "../lib/legacy-content-migration-audit.mjs";

const release = process.argv.includes("--release");
const json = process.argv.includes("--json");
const { issues, summary } = await auditLegacyContentMigrationMatrix();

const report = {
  ...summary,
  issues,
  releaseReady: issues.length === 0 && summary.completionReady,
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Legacy content migration: ${summary.verified} of ${summary.total} records verified.`);
  console.log(`${summary.publicRecords} public + ${summary.privateRecords} private | ${summary.routeImplemented} existing route treatments + ${summary.routeDecisionRequired} route decisions required.`);
  console.log(`${summary.publicRouteDecisionRequired} public routes still require an explicit treatment.`);
}

if (issues.length) {
  if (!json) {
    console.error(`Migration-matrix integrity failed with ${issues.length} issue(s):`);
    issues.forEach((issue) => console.error(`- ${issue.path}: ${issue.message} [${issue.code}]`));
  }
  process.exitCode = 1;
} else if (release && !summary.completionReady) {
  if (!json) console.error(`Public release blocked: ${summary.total - summary.verified} archive record(s) are not fully decided, implemented and verified.`);
  process.exitCode = 1;
} else if (!json) {
  console.log(summary.completionReady ? "Every archived content record is accounted for." : "Matrix structure is valid; migration decisions remain fail closed.");
}
