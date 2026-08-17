import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import manifestData from "../content/approval-manifest.json" with { type: "json" };
import { createApprovalRequestDownload } from "../lib/approval-request-download.ts";

const manifestUrl = new URL("../content/approval-manifest.json", import.meta.url);

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

test("generates one unfilled digest-bound download for every canonical approval record", () => {
  for (const record of manifestData.records) {
    const download = createApprovalRequestDownload(record.id);
    const request = JSON.parse(download.body);

    assert.equal(download.filename, `sskem-approval-request-${record.id}-${manifestData.updatedOn}.json`);
    assert.equal(request.recordId, record.id);
    assert.match(request.expectedRecordDigest, /^[a-f0-9]{64}$/);
    assert.deepEqual(Object.keys(request.checks), Object.keys(record.checks));
    assert.ok(Object.values(request.checks).every((state) => state === null));
    assert.deepEqual(request.evidenceReferences, []);
    assert.equal(request.approvedByRole, null);
    assert.equal(request.approvedAt, null);
    assert.equal(download.guardrails.approvalGrantedByDownload, false);
  }
});

test("keeps request downloads public-safe and leaves the canonical manifest unchanged", async () => {
  const before = await readFile(manifestUrl, "utf8");
  const download = createApprovalRequestDownload("media-campus-main");
  const after = await readFile(manifestUrl, "utf8");

  assert.equal(digest(after), digest(before));
  assert.doesNotMatch(download.body, /sourcePointer|publicTargets|approvedByRole"\s*:\s*"|evidenceReferences"\s*:\s*\[\s*"/i);
  assert.doesNotMatch(download.body, /[a-z]:\\|file:\/\/|@[a-z0-9.-]+\.[a-z]{2,}/i);
  assert.deepEqual(download.guardrails, {
    readOnly: true,
    checkDecisionsPreselected: false,
    evidenceReferencesIncluded: false,
    approverIdentityIncluded: false,
    approvalGrantedByDownload: false,
  });
});

test("refuses unknown or malformed record IDs", () => {
  assert.throws(() => createApprovalRequestDownload("media-not-canonical"), /Unknown approval record/);
  assert.throws(() => createApprovalRequestDownload("../../approval-manifest"), /Unknown approval record/);
});
