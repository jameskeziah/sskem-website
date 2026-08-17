import { auditCampusMediaPublicationArtifacts } from "../lib/campus-media-publication-audit.mjs";
import { campusMediaPublicationRegistry } from "../lib/campus-media-publication.ts";

const issues = await auditCampusMediaPublicationArtifacts();

if (issues.length) {
  console.error(`Campus media publication audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  const count = Array.isArray(campusMediaPublicationRegistry.bindings) ? campusMediaPublicationRegistry.bindings.length : 0;
  console.log(`Campus media publication audit passed: ${count} exact derivative binding(s).`);
}
