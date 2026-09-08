import {
  LEGACY_MIGRATION_DECISION_ACKNOWLEDGEMENT,
} from "../lib/legacy-migration-decision-intake.ts";
import {
  LEGACY_MIGRATION_APPLIED_MARKER_REPAIR_ACKNOWLEDGEMENT,
  executeLegacyMigrationDecisionUpdate,
  repairLegacyMigrationDecisionAppliedMarker,
} from "../lib/legacy-migration-decision-update.mjs";

function parseArguments(argv) {
  const options = { apply: false, json: false };
  for (const argument of argv) {
    if (argument === "--apply") options.apply = true;
    else if (argument === "--json") options.json = true;
    else if (argument.startsWith("--worksheet=")) options.worksheetPath = argument.slice("--worksheet=".length);
    else if (argument.startsWith("--decision-batch-id=")) options.decisionBatchId = argument.slice("--decision-batch-id=".length);
    else if (argument.startsWith("--acknowledge-local-write=")) options.acknowledgement = argument.slice("--acknowledge-local-write=".length);
    else if (argument.startsWith("--receipt-root=")) options.receiptRoot = argument.slice("--receipt-root=".length);
    else if (argument.startsWith("--repair-applied-marker=")) options.transactionId = argument.slice("--repair-applied-marker=".length);
    else throw new Error("Unknown migration decision command argument.");
  }
  return options;
}

function usage() {
  return [
    "Review a completed decision worksheet without writing:",
    "npm run migration:decisions -- --worksheet=\"CONTROLLED_DECISIONS.csv\"",
    "",
    "Record the exact reviewed batch locally:",
    "npm run migration:decisions -- --worksheet=\"CONTROLLED_DECISIONS.csv\" --decision-batch-id=PLAN_ID --apply \\",
    `  --acknowledge-local-write=${LEGACY_MIGRATION_DECISION_ACKNOWLEDGEMENT}`,
    "",
    "Repair a missing post-commit receipt marker after verifying the transaction:",
    "npm run migration:decisions -- --repair-applied-marker=TRANSACTION_ID \\",
    `  --acknowledge-local-write=${LEGACY_MIGRATION_APPLIED_MARKER_REPAIR_ACKNOWLEDGEMENT}`,
    "",
    "The command never verifies implementation, grants approval, publishes content or deploys the site.",
  ].join("\n");
}

let options;
try {
  options = parseArguments(process.argv.slice(2));
  if (options.transactionId) {
    if (options.worksheetPath || options.apply || options.decisionBatchId) throw new Error("Applied-marker repair cannot be combined with worksheet planning or matrix update arguments.");
    const repaired = await repairLegacyMigrationDecisionAppliedMarker(options);
    console.log(`Applied receipt marker ${repaired.status} for transaction ${repaired.transactionId}.`);
    process.exit(0);
  }
  if (!options.worksheetPath) {
    console.log(usage());
    process.exit(0);
  }
  const result = await executeLegacyMigrationDecisionUpdate(options);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.mode === "read-only-plan") {
    const { plan } = result;
    console.log(`Legacy migration decisions: ${plan.status}.`);
    console.log(`${plan.summary.acceptedRecords}/${plan.summary.expectedRecords} records accepted; ${plan.summary.routeChanges} route and ${plan.summary.contentChanges} content changes proposed.`);
    if (plan.decisionBatchId) {
      console.log(`Decision batch ID: ${plan.decisionBatchId}`);
      console.log("Review this plan, then use the exact batch ID and acknowledgement shown in the command help for a separate local write.");
    } else {
      console.error(`${plan.summary.issueCount} fail-closed issue(s) remain. No matrix write was made.`);
      const codes = [...new Set(plan.issues.map((issue) => issue.code))];
      console.error(`Issue codes: ${codes.join(", ") || "none"}`);
      process.exitCode = 1;
    }
  } else {
    console.log(`Recorded ${result.receipt.contentDecisionsRecorded} content decisions and ${result.receipt.routeDecisionsRecorded} route decisions atomically.`);
    console.log(`Rollback receipt: ${result.receiptDirectory}`);
    console.log("Implementation remains unverified; approval, publication and deployment remain blocked.");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Legacy migration decision intake failed.");
  process.exitCode = 1;
}
