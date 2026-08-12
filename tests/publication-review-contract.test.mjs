import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, projectRoot), "utf8");
}

test("builds the reviewer queue directly from the canonical approval manifest", async () => {
  const [data, page, route, manifestText] = await Promise.all([
    source("app/data/publication-approval.ts"),
    source("app/publication-review/page.tsx"),
    source("app/publication-review/export/route.ts"),
    source("content/approval-manifest.json"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.records.length, 33);
  assert.match(data, /import manifestData from ["']@\/content\/approval-manifest\.json["']/);
  assert.match(data, /export const firstReviewBatch[\s\S]*?checkProfile === ["']campus-media["']/);
  assert.match(data, /export function approvalQueueCsv/);
  assert.match(page, /approvalManifest/);
  assert.match(page, /Approve the four campus photographs first\./);
  assert.match(page, /Production media gate/);
  assert.match(page, /AVIF · WebP · JPEG/);
  assert.match(page, /EXIF, XMP and IPTC are stripped and rechecked\./);
  assert.match(page, /Appendix IX document gate/);
  assert.match(page, /Every PDF is rendered, checked and bound to its approval\./);
  assert.match(page, /External malware-scan evidence and manifest approval remain mandatory\./);
  assert.match(page, /Evidence stays in the school’s controlled system\./);
  assert.match(page, /Editorial CMS/);
  assert.match(page, /Sanity delivery status/);
  assert.match(page, /Applicant records, pupil data, controlled documents, consent evidence and approver identities never enter this CMS\./);
  assert.match(page, /getHomepageEditorialContent/);
  assert.match(page, /Download review worksheet/);
  assert.match(route, /approvalQueueCsv\(\)/);
});

test("keeps the dashboard, worksheet and private evidence outside public delivery", async () => {
  const [page, route, sitemap, guide] = await Promise.all([
    source("app/publication-review/page.tsx"),
    source("app/publication-review/export/route.ts"),
    source("app/sitemap.ts"),
    source("docs/approval-manifest.md"),
  ]);

  assert.match(page, /process\.env\.HOMEPAGE_REVIEW_MODE !== ["']private["'][\s\S]*?notFound\(\)/);
  assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*nocache:\s*true\s*\}/);
  assert.match(route, /process\.env\.HOMEPAGE_REVIEW_MODE !== ["']private["'][\s\S]*?status:\s*404/);
  assert.match(route, /["']cache-control["']:\s*["']private, no-store["']/);
  assert.doesNotMatch(sitemap, /publication-review/);
  assert.match(guide, /Owner-only reviewer dashboard[\s\S]*?\/publication-review/i);
  assert.match(guide, /worksheet[\s\S]*?working aid[\s\S]*?manifest remains the release source of truth/i);
});
