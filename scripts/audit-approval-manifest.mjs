import {
  approvalSummary,
  loadApprovalManifest,
  validateApprovalManifest,
} from "../lib/approval-manifest.mjs";

const releaseMode = process.argv.includes("--release");
const jsonMode = process.argv.includes("--json");
const manifest = await loadApprovalManifest();
const issues = validateApprovalManifest(manifest);
const summary = approvalSummary(manifest);

if (jsonMode) {
  process.stdout.write(`${JSON.stringify({
    valid: issues.length === 0,
    releaseReady: summary.releaseReady,
    total: summary.total,
    byKind: summary.byKind,
    byDecision: summary.byDecision,
    blockingByKind: summary.blockingByKind,
    blockingRecordIds: summary.blockingRecords.map((record) => record.id),
    issues,
  }, null, 2)}\n`);
} else {
  process.stdout.write(
    [
      `Approval manifest v${manifest.schemaVersion}: ${summary.total} records`,
      `Media ${summary.byKind.media} | Claims ${summary.byKind.claim} | Documents ${summary.byKind.document}`,
      `Approved ${summary.byDecision.approved} | Review required ${summary.byDecision["review-required"]} | Blocked ${summary.byDecision.blocked} | Withdrawn ${summary.byDecision.withdrawn}`,
      issues.length ? `Validation: FAILED (${issues.length} issues)` : "Validation: PASSED",
      summary.releaseReady ? "Public release: READY" : `Public release: BLOCKED (${summary.blockingRecords.length} records)`,
    ].join("\n") + "\n",
  );
  for (const issue of issues) process.stderr.write(`- ${issue.path}: ${issue.message} [${issue.code}]\n`);
  if (releaseMode && summary.blockingRecords.length) {
    process.stderr.write(`Blocking IDs:\n- ${summary.blockingRecords.map((record) => record.id).join("\n- ")}\n`);
  }
}

if (issues.length || (releaseMode && !summary.releaseReady)) process.exitCode = 1;
