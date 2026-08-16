import {
  announcementIntakeConfig,
  createAnnouncementMigrationPacket,
  validateAnnouncementIntakeConfig,
} from "../lib/cms/announcement-migration.ts";

const issues = validateAnnouncementIntakeConfig(announcementIntakeConfig);
if (issues.length) {
  console.error(`Editorial announcement intake audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  const packet = createAnnouncementMigrationPacket();
  console.log(`Editorial announcement intake audit passed: ${packet.status}, ${packet.blockingRequirements.length} blocking requirement(s).`);
}
