import {
  createSiteSettingsMigrationPacket,
  siteSettingsMigrationConfig,
  validateSiteSettingsMigrationConfig,
} from "../lib/cms/site-settings-migration.ts";

const issues = validateSiteSettingsMigrationConfig(siteSettingsMigrationConfig);
if (issues.length) {
  console.error(`Editorial site settings migration audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  const packet = createSiteSettingsMigrationPacket();
  console.log(`Editorial site settings migration audit passed: ${packet.fieldComparison.length} fields, ${packet.blockingApprovalRecordIds.length} blocking approval record(s).`);
}
