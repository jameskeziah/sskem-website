import { auditEditorialPublicationBindings, editorialPublicationBindingSummary } from "../lib/editorial-publication-bindings.mjs";

const { registry, issues } = await auditEditorialPublicationBindings();
const summary = editorialPublicationBindingSummary(registry);

if (issues.length) {
  console.error(`Editorial publication binding audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- [${issue.code}] ${issue.path}: ${issue.message}`);
  process.exitCode = 1;
} else {
  console.log(`Editorial publication binding audit passed: ${summary.total} exact revision binding(s).`);
}
