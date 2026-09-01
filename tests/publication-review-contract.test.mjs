import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, projectRoot), "utf8");
}

test("builds the reviewer queue directly from the canonical approval manifest", async () => {
  const [data, page, route, cutoverRoute, editorialPage, editorialRoute, packetRoute, announcementPacketRoute, campusPacketRoute, posterDecisionRoute, posterDecisionWorkspace, posterDecisionWorkspaceClient, approvalRequestRoute, migrationConfig, announcementConfig, cutoverData, manifestText] = await Promise.all([
    source("app/data/publication-approval.ts"),
    source("app/publication-review/page.tsx"),
    source("app/publication-review/export/route.ts"),
    source("app/publication-review/cutover-export/route.ts"),
    source("app/publication-review/editorial/page.tsx"),
    source("app/publication-review/editorial-receipt/route.ts"),
    source("app/publication-review/editorial-site-settings-packet/route.ts"),
    source("app/publication-review/editorial-announcement-packet/route.ts"),
    source("app/publication-review/campus-media-packet/route.ts"),
    source("app/publication-review/poster-delivery-decision/route.ts"),
    source("app/publication-review/poster-delivery-decision-workspace/page.tsx"),
    source("app/publication-review/poster-delivery-decision-workspace/decision-workspace-form.tsx"),
    source("app/publication-review/approval-request/[recordId]/route.ts"),
    source("content/editorial-site-settings-migration.json"),
    source("content/editorial-announcement-intake.json"),
    source("app/data/legacy-cutover.ts"),
    source("content/approval-manifest.json"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.records.length, 33);
  assert.match(data, /import manifestData from ["']@\/content\/approval-manifest\.json["']/);
  assert.match(data, /export const firstReviewBatch[\s\S]*?checkProfile === ["']campus-media["']/);
  assert.match(data, /export function approvalQueueCsv/);
  assert.match(page, /approvalManifest/);
  assert.match(page, /publicReleaseReadinessDashboard/);
  assert.match(page, /Composite launch gate/);
  assert.match(page, /One result across every release dependency\./);
  assert.match(page, /all six independent gates pass/);
  assert.match(page, /npm run release:audit/);
  assert.match(page, /Approve the four campus photographs first\./);
  assert.match(page, /Guarded update:/);
  assert.match(page, /npm run approvals:update -- --record/);
  assert.match(page, /Template generation does not approve the record\./);
  assert.match(page, /Download unfilled request/);
  assert.match(page, /\/publication-review\/approval-request\/\$\{record\.id\}/);
  assert.match(page, /Production media gate/);
  assert.match(page, /campusMediaPublicationSummary/);
  assert.match(page, /Exact activation/);
  assert.match(page, /Hero transfer/);
  assert.match(page, /Poster optimization/);
  assert.match(page, /Decision binding/);
  assert.match(page, /homepagePosterDeliveryDecisionBindingSummary/);
  assert.match(page, /homepageAchievementPublicationSummary/);
  assert.match(page, /Achievement activation/);
  assert.match(page, /npm run achievements:activate/);
  assert.match(page, /Complete decision worksheet/);
  assert.match(page, /Download blank poster packet/);
  assert.match(page, /\/publication-review\/poster-delivery-decision/);
  assert.match(page, /\/publication-review\/poster-delivery-decision-workspace/);
  assert.match(page, /npm run poster:inspect/);
  assert.match(page, /npm run poster:decision-plan/);
  assert.match(page, /npm run poster:decision-record/);
  assert.match(page, /Every default mode is read-only/);
  assert.match(page, /pixel-identical lossless candidate/);
  assert.match(page, /separate approved art-direction decision/);
  assert.match(page, /Media release/);
  assert.match(page, /homepageMediaPerformanceSummary/);
  assert.match(page, /npm run performance:audit/);
  assert.match(page, /Download campus capture packet/);
  assert.match(page, /AVIF · WebP · JPEG/);
  assert.match(page, /EXIF, XMP and IPTC are stripped and rechecked\./);
  assert.match(page, /Appendix IX document gate/);
  assert.match(page, /Every PDF is rendered, checked and bound to its approval\./);
  assert.match(page, /External malware-scan evidence and manifest approval remain mandatory\./);
  assert.match(page, /publicDocumentPublicationSummary/);
  assert.match(page, /Only a receipt-matched, hash-verified PDF becomes downloadable\./);
  assert.match(page, /npm run documents:activate/);
  assert.match(page, /Evidence stays in the school’s controlled system\./);
  assert.match(page, /Editorial CMS/);
  assert.match(page, /Sanity delivery status/);
  assert.match(page, /Review exact CMS revisions/);
  assert.match(page, /Applicant records, pupil data, controlled documents, consent evidence and approver identities never enter this CMS\./);
  assert.match(page, /getHomepageEditorialContent/);
  assert.match(page, /Legacy cutover/);
  assert.match(page, /Old WordPress links now have a controlled destination\./);
  assert.match(page, /Download cutover worksheet/);
  assert.match(page, /Preview Programmes art direction/);
  assert.match(page, /\/publication-review\/programmes-preview/);
  assert.match(page, /Download review worksheet/);
  assert.match(route, /approvalQueueCsv\(\)/);
  assert.match(editorialPage, /Exact sanitized public output/);
  assert.match(editorialPage, /getHomepageEditorialReview/);
  assert.match(editorialRoute, /item\.receiptProposal/);
  assert.match(editorialRoute, /private, no-store/);
  assert.match(editorialPage, /Download first site settings packet/);
  assert.match(packetRoute, /createSiteSettingsMigrationPacket/);
  assert.match(editorialPage, /Download announcement intake packet/);
  assert.match(announcementPacketRoute, /createAnnouncementMigrationPacket/);
  assert.match(campusPacketRoute, /createCampusMediaCapturePacket/);
  assert.match(posterDecisionRoute, /createHomepagePosterDeliveryDecisionDownload/);
  assert.match(posterDecisionWorkspace, /No option is preselected/);
  assert.match(posterDecisionWorkspace, /requireChatGPTUser\("\/publication-review\/poster-delivery-decision-workspace"\)/);
  assert.match(posterDecisionWorkspaceClient, /createHomepagePosterDeliveryDecisionCompletion/);
  assert.match(posterDecisionWorkspaceClient, /URL\.createObjectURL/);
  assert.match(approvalRequestRoute, /createApprovalRequestDownload\(recordId\)/);
  assert.match(approvalRequestRoute, /content-disposition/);
  assert.match(migrationConfig, /claim-complete-address/);
  assert.match(migrationConfig, /claim-public-contact/);
  assert.match(announcementConfig, /awaiting-authoritative-source/);
  assert.doesNotMatch(announcementConfig, /Admissions open|Apply now/i);
  assert.match(cutoverRoute, /legacyCutoverCsv\(\)/);
  assert.match(cutoverData, /legacy-cutover-inventory\.json/);
});

test("keeps the dashboard, worksheet and private evidence outside public delivery", async () => {
  const [page, route, cutoverRoute, editorialPage, editorialRoute, packetRoute, announcementPacketRoute, campusPacketRoute, posterDecisionRoute, posterDecisionWorkspace, posterDecisionWorkspaceClient, approvalRequestRoute, sitemap, guide] = await Promise.all([
    source("app/publication-review/page.tsx"),
    source("app/publication-review/export/route.ts"),
    source("app/publication-review/cutover-export/route.ts"),
    source("app/publication-review/editorial/page.tsx"),
    source("app/publication-review/editorial-receipt/route.ts"),
    source("app/publication-review/editorial-site-settings-packet/route.ts"),
    source("app/publication-review/editorial-announcement-packet/route.ts"),
    source("app/publication-review/campus-media-packet/route.ts"),
    source("app/publication-review/poster-delivery-decision/route.ts"),
    source("app/publication-review/poster-delivery-decision-workspace/page.tsx"),
    source("app/publication-review/poster-delivery-decision-workspace/decision-workspace-form.tsx"),
    source("app/publication-review/approval-request/[recordId]/route.ts"),
    source("app/sitemap.ts"),
    source("docs/approval-manifest.md"),
  ]);

  assert.match(page, /process\.env\.HOMEPAGE_REVIEW_MODE !== ["']private["'][\s\S]*?notFound\(\)/);
  assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*nocache:\s*true\s*\}/);
  assert.match(route, /process\.env\.HOMEPAGE_REVIEW_MODE !== ["']private["'][\s\S]*?status:\s*404/);
  assert.match(route, /["']cache-control["']:\s*["']private, no-store["']/);
  assert.match(cutoverRoute, /process\.env\.HOMEPAGE_REVIEW_MODE !== ["']private["'][\s\S]*?status:\s*404/);
  assert.match(cutoverRoute, /["']cache-control["']:\s*["']private, no-store["']/);
  assert.match(editorialPage, /process\.env\.HOMEPAGE_REVIEW_MODE !== ["']private["'][\s\S]*?notFound\(\)/);
  assert.match(editorialPage, /requireChatGPTUser\(["']\/publication-review\/editorial["']\)/);
  assert.match(editorialPage, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*nocache:\s*true\s*\}/);
  assert.match(editorialRoute, /process\.env\.HOMEPAGE_REVIEW_MODE !== ["']private["'][\s\S]*?status:\s*404/);
  assert.match(editorialRoute, /getChatGPTUser\(\)[\s\S]*?status:\s*401/);
  assert.match(packetRoute, /process\.env\.HOMEPAGE_REVIEW_MODE !== ["']private["'][\s\S]*?status:\s*404/);
  assert.match(packetRoute, /getChatGPTUser\(\)[\s\S]*?status:\s*401/);
  assert.match(packetRoute, /["']cache-control["']:\s*["']private, no-store["']/);
  assert.match(announcementPacketRoute, /process\.env\.HOMEPAGE_REVIEW_MODE !== ["']private["'][\s\S]*?status:\s*404/);
  assert.match(announcementPacketRoute, /getChatGPTUser\(\)[\s\S]*?status:\s*401/);
  assert.match(announcementPacketRoute, /["']cache-control["']:\s*["']private, no-store["']/);
  assert.match(campusPacketRoute, /process\.env\.HOMEPAGE_REVIEW_MODE !== ["']private["'][\s\S]*?status:\s*404/);
  assert.match(campusPacketRoute, /getChatGPTUser\(\)[\s\S]*?status:\s*401/);
  assert.match(campusPacketRoute, /["']cache-control["']:\s*["']private, no-store["']/);
  assert.match(posterDecisionRoute, /process\.env\.HOMEPAGE_REVIEW_MODE !== ["']private["'][\s\S]*?status:\s*404/);
  assert.match(posterDecisionRoute, /getChatGPTUser\(\)[\s\S]*?status:\s*401/);
  assert.match(posterDecisionRoute, /["']cache-control["']:\s*["']private, no-store["']/);
  assert.match(posterDecisionRoute, /["']content-security-policy["']:\s*["']default-src 'none'; sandbox["']/);
  assert.match(posterDecisionWorkspace, /process\.env\.HOMEPAGE_REVIEW_MODE !== ["']private["'][\s\S]*?notFound\(\)/);
  assert.match(posterDecisionWorkspace, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*nocache:\s*true\s*\}/);
  assert.match(posterDecisionWorkspaceClient, /event\.preventDefault\(\)/);
  assert.doesNotMatch(posterDecisionWorkspaceClient, /fetch\(|method=["']post/i);
  assert.match(approvalRequestRoute, /process\.env\.HOMEPAGE_REVIEW_MODE !== ["']private["'][\s\S]*?status:\s*404/);
  assert.match(approvalRequestRoute, /getChatGPTUser\(\)[\s\S]*?status:\s*401/);
  assert.match(approvalRequestRoute, /["']cache-control["']:\s*["']private, no-store["']/);
  assert.match(approvalRequestRoute, /["']content-security-policy["']:\s*["']default-src 'none'; sandbox["']/);
  assert.doesNotMatch(sitemap, /publication-review/);
  assert.match(guide, /Owner-only reviewer dashboard[\s\S]*?\/publication-review/i);
  assert.match(guide, /worksheet[\s\S]*?working aid[\s\S]*?manifest remains the release source of truth/i);
});
