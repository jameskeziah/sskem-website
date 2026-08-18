import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import manifestData from "../content/approval-manifest.json" with { type: "json" };
import {
  CAMPUS_APPROVAL_BATCH_UPDATE_ACKNOWLEDGEMENT,
  campusApprovalBatchRecordIds,
  createCampusApprovalBatchUpdatePlan,
  executeCampusApprovalBatchUpdate,
} from "../lib/approval-manifest-update.mjs";
import { createApprovalRequestDownload } from "../lib/approval-request-download.ts";
import { APPROVAL_REQUEST_WORKSPACE_CONFIRMATION } from "../lib/approval-request-workspace.ts";
import {
  CAMPUS_APPROVAL_BATCH_CONFIRMATION,
  createCampusApprovalBatchCompletion,
} from "../lib/campus-approval-batch-workspace.ts";
import { loadApprovalManifest, validateApprovalManifest } from "../lib/approval-manifest.mjs";

const NOW = "2026-08-18T12:00:00.000Z";

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function completedBatch(manifest = manifestData) {
  const templates = campusApprovalBatchRecordIds.map((recordId) => createApprovalRequestDownload(recordId, manifest).request);
  const requests = Object.fromEntries(templates.map((template) => [template.recordId, {
    checks: Object.fromEntries(Object.keys(template.checks).map((check) => [check, "verified"])),
    evidenceReferences: [`CONTROLLED/${template.recordId.toUpperCase()}`],
    approvedByRole: "school-management",
    expiryChoice: "none",
    expiresAt: "",
    approvalConfirmation: APPROVAL_REQUEST_WORKSPACE_CONFIRMATION,
  }]));
  return createCampusApprovalBatchCompletion({
    templates,
    input: { requests, batchConfirmation: CAMPUS_APPROVAL_BATCH_CONFIRMATION },
    now: NOW,
  });
}

async function temporaryManifest() {
  const directory = await mkdtemp(path.join(tmpdir(), "sskem-campus-approval-batch-"));
  const manifestPath = path.join(directory, "approval-manifest.json");
  const manifest = await loadApprovalManifest();
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { manifest, manifestPath };
}

test("creates one four-request bundle that is ready for the guarded batch planner", () => {
  const completion = completedBatch();
  const downloaded = JSON.parse(completion.body);
  const plan = createCampusApprovalBatchUpdatePlan({ manifest: manifestData, batch: downloaded, now: NOW });

  assert.equal(completion.validation.status, "ready-for-local-batch-planner");
  assert.deepEqual(completion.validation.recordIds, campusApprovalBatchRecordIds);
  assert.equal(downloaded.requests.length, 4);
  assert.equal(plan.status, "ready-for-explicit-atomic-write");
  assert.deepEqual(plan.blockers, []);
  assert.deepEqual(plan.records.map((record) => record.recordId), campusApprovalBatchRecordIds);
  assert.ok(plan.records.every((record) => record.status === "ready-for-explicit-write"));
  assert.doesNotMatch(JSON.stringify(plan), /CONTROLLED\/MEDIA-CAMPUS/i);
  assert.deepEqual(completion.guardrails, {
    networkRequestPerformed: false,
    serverPersistencePerformed: false,
    manifestWritePerformed: false,
    batchWritePerformed: false,
    approvalGrantedByWorkspace: false,
    publicationActivated: false,
    privateEvidenceIncluded: false,
    approverIdentityIncluded: false,
  });
});

test("fails the whole batch for one missing, duplicated, stale or unconfirmed record", () => {
  const completion = completedBatch();
  const batch = structuredClone(completion.batch);

  assert.throws(
    () => createCampusApprovalBatchCompletion({
      templates: batch.requests,
      input: { requests: {}, batchConfirmation: null },
      now: NOW,
    }),
    /explicit final confirmation/i,
  );

  const duplicate = structuredClone(batch);
  duplicate.requests[3] = structuredClone(duplicate.requests[0]);
  const duplicatePlan = createCampusApprovalBatchUpdatePlan({ manifest: manifestData, batch: duplicate, now: NOW });
  assert.match(duplicatePlan.blockers.join("\n"), /record IDs must be unique/i);
  assert.match(duplicatePlan.blockers.join("\n"), /missing media-campus-courtyard/i);

  const stale = structuredClone(batch);
  stale.requests[2].expectedRecordDigest = "0".repeat(64);
  const stalePlan = createCampusApprovalBatchUpdatePlan({ manifest: manifestData, batch: stale, now: NOW });
  assert.equal(stalePlan.status, "blocked");
  assert.match(stalePlan.blockers.join("\n"), /media-campus-entrance.*record changed.*fresh template/i);
  assert.equal(stalePlan.guardrails.allOrNothingWrite, true);
});

test("keeps batch planning read-only and records all four decisions atomically only after acknowledgement", async () => {
  const { manifest, manifestPath } = await temporaryManifest();
  const batch = completedBatch(manifest).batch;
  const before = await readFile(manifestPath, "utf8");

  const planned = await executeCampusApprovalBatchUpdate({ manifestPath, batch, now: NOW });
  assert.equal(planned.mode, "local-batch-plan");
  assert.equal(planned.plan.status, "ready-for-explicit-atomic-write");
  assert.equal(digest(await readFile(manifestPath, "utf8")), digest(before));

  await assert.rejects(
    executeCampusApprovalBatchUpdate({ manifestPath, batch, now: NOW, apply: true }),
    /requires --acknowledge-local-write=.*No manifest write was made/i,
  );
  assert.equal(await readFile(manifestPath, "utf8"), before);

  const result = await executeCampusApprovalBatchUpdate({
    manifestPath,
    batch,
    now: NOW,
    apply: true,
    acknowledgement: CAMPUS_APPROVAL_BATCH_UPDATE_ACKNOWLEDGEMENT,
  });
  const updated = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(result.mode, "local-manifest-batch-write");
  assert.equal(result.receipt.records.length, 4);
  assert.equal(result.receipt.atomicBatchWritePerformed, true);
  assert.ok(campusApprovalBatchRecordIds.every((recordId) => updated.records.find((record) => record.id === recordId).decision === "approved"));
  assert.equal(updated.records.find((record) => record.id === "media-class-x-results-2025-26").decision, "blocked");
  assert.deepEqual(validateApprovalManifest(updated), []);
});

test("publishes an authenticated, browser-only campus batch surface and guarded command", async () => {
  const [page, client, dashboard, sitemap, schemaText, packageText, guide] = await Promise.all([
    readFile(new URL("../app/publication-review/campus-approval-batch/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/campus-approval-batch/campus-approval-batch-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../content/campus-approval-batch-request.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../docs/approval-manifest.md", import.meta.url), "utf8"),
  ]);
  const schema = JSON.parse(schemaText);
  const packageJson = JSON.parse(packageText);

  assert.match(page, /requireChatGPTUser\("\/publication-review\/campus-approval-batch"\)/);
  assert.match(page, /sends no decision data to the server/i);
  assert.match(client, /^"use client"/);
  assert.match(client, /createCampusApprovalBatchCompletion/);
  assert.match(client, /URL\.createObjectURL/);
  assert.match(client, /defaultValue=""/);
  assert.doesNotMatch(client, /fetch\(|localStorage|sessionStorage|method=["']post/i);
  assert.match(dashboard, /Complete campus approval batch/);
  assert.doesNotMatch(sitemap, /campus-approval-batch/);
  assert.equal(schema.properties.requests.minItems, 4);
  assert.equal(schema.properties.requests.maxItems, 4);
  assert.match(packageJson.scripts["approvals:campus-batch"], /update-campus-approval-batch/);
  assert.match(guide, /campus approval batch/i);
});
