import { loadApprovalManifest } from "../lib/approval-manifest.mjs";
import { loadProgrammesPublicProfiles, validateProgrammesPublicProfiles } from "../lib/programmes-public-profiles.mjs";

const [profileSet, manifest] = await Promise.all([
  loadProgrammesPublicProfiles(),
  loadApprovalManifest(),
]);
const issues = validateProgrammesPublicProfiles(profileSet, manifest);

process.stdout.write(`${JSON.stringify({
  profileSetId: profileSet.profileSetId,
  profiles: Array.isArray(profileSet.profiles) ? profileSet.profiles.length : 0,
  status: issues.length ? "blocked" : "ready",
  issues,
}, null, 2)}\n`);

if (issues.length) process.exitCode = 1;
