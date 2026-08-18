import { auditHomepageAchievementPublicationArtifacts } from "../lib/homepage-achievement-publication-audit.mjs";
import { homepageAchievementPublicationRegistry } from "../lib/homepage-achievement-publication.ts";

const issues = await auditHomepageAchievementPublicationArtifacts();
if (issues.length) {
  console.error(`Homepage achievement publication audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  const count = Array.isArray(homepageAchievementPublicationRegistry.bindings)
    ? homepageAchievementPublicationRegistry.bindings.length
    : 0;
  console.log(`Homepage achievement publication audit passed: ${count} exact artwork binding(s).`);
}
