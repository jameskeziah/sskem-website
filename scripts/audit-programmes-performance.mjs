import { auditProgrammesPerformanceBudget, programmesPerformanceBudget } from "../lib/programmes-performance-budget.ts";

const report = await auditProgrammesPerformanceBudget();

console.log(`Programme performance budget: ${report.measurements.length} hero asset(s), ${report.fontFiles} font file(s), ${report.longestMotionMs} ms maximum motion token.`);
for (const asset of report.measurements) {
  console.log(`- ${asset.route} ${asset.kind}: ${asset.bytes} / ${asset.maximumBytes} bytes`);
}

if (report.issues.length) {
  console.error(`Programme performance audit failed (${programmesPerformanceBudget.budgetId}):`);
  report.issues.forEach((issue) => console.error(`- ${issue}`));
  process.exitCode = 1;
} else {
  console.log("Programme performance static budget passed.");
}
