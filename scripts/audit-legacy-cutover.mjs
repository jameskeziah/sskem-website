import { legacyCutoverSummary, loadLegacyCutoverInventory, validateLegacyCutoverInventory } from "../lib/legacy-cutover.mjs";

const releaseMode = process.argv.includes("--release");
const inventory = await loadLegacyCutoverInventory();
const issues = validateLegacyCutoverInventory(inventory);
if (issues.length) {
  process.stderr.write(`Legacy cutover inventory failed validation (${issues.length} issue(s)).\n`);
  for (const issue of issues) process.stderr.write(`- ${issue.path}: ${issue.message}\n`);
  process.exitCode = 1;
} else {
  const summary = legacyCutoverSummary(inventory);
  process.stdout.write(`Legacy cutover inventory: ${summary.total} routes\n`);
  process.stdout.write(`${summary.redirects} permanent redirects | ${summary.retained} retained routes\n`);
  process.stdout.write(`${summary.byRisk.high} high-risk routes | ${summary.byReview["approval-blocked"]} content-review blockers\n`);
  process.stdout.write(`Route implementation: ${summary.routeReady ? "READY" : "INCOMPLETE"}\n`);
  if (releaseMode && !summary.routeReady) process.exitCode = 1;
}
