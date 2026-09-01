import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import manifestData from "../content/approval-manifest.json" with { type: "json" };
import {
  DOCUMENT_APPROVAL_BATCH_UPDATE_ACKNOWLEDGEMENT,
  createDocumentApprovalBatchUpdatePlan,
  executeDocumentApprovalBatchUpdate,
} from "../lib/approval-manifest-update.mjs";
import { createApprovalRequestDownload } from "../lib/approval-request-download.ts";
import { APPROVAL_REQUEST_WORKSPACE_CONFIRMATION } from "../lib/approval-request-workspace.ts";
import {
  DOCUMENT_APPROVAL_BATCH_CONFIRMATION,
  documentApprovalBatchRecordIds,
} from "../lib/document-approval-batch-contract.ts";
import { createDocumentApprovalBatchCompletion } from "../lib/document-approval-batch-workspace.ts";
import { loadApprovalManifest, validateApprovalManifest } from "../lib/approval-manifest.mjs";

const NOW = "2026-08-19T12:00:00.000Z";

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function completedBatch(manifest = manifestData) {
  const templates = documentApprovalBatchRecordIds.map((recordId) => createApprovalRequestDownload(recordId, manifest).request);
  const requests = Object.fromEntries(templates.map((template) => [template.recordId, {
    checks: Object.fromEntries(Object.keys(template.checks).map((check) => [check, "verified"])),
    evidenceReferences: [`CONTROLLED/${template.recordId.toUpperCase()}`],
    approvedByRole: "compliance-owner",
    expiryChoice: "none",
    expiresAt: "",
    approvalConfirmation: APPROVAL_REQUEST_WORKSPACE_CONFIRMATION,
  }]));
  return createDocumentApprovalBatchCompletion({
    templates,
    input: { requests, batchConfirmation: DOCUMENT_APPROVAL_BATCH_CONFIRMATION },
    now: NOW,
  });
}

async function temporaryManifest(context) {
  const directory = await mkdtemp(path.join(tmpdir(), "sskem-document-approval-batch-"));
  const manifestPath = path.join(directory, "approval-manifest.json");
  const manifest = await loadApprovalManifest();
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  context.after(() => rm(directory, { recursive: true, force: true }));
  return { manifest, manifestPath };
}

test("creates one twelve-request document bundle ready for an atomic manifest plan", () => {
  const completion = completedBatch();
  const downloaded = JSON.parse(completion.body);
  const plan = createDocumentApprovalBatchUpdatePlan({ manifest: manifestData, batch: downloaded, now: NOW });

  assert.equal(completion.validation.status, "ready-for-local-batch-planner");
  assert.deepEqual(completion.validation.recordIds, documentApprovalBatchRecordIds);
  assert.equal(downloaded.requests.length, 12);
  assert.equal(plan.status, "ready-for-explicit-atomic-write");
  assert.deepEqual(plan.blockers, []);
  assert.deepEqual(plan.records.map((record) => record.recordId), documentApprovalBatchRecordIds);
  assert.ok(plan.records.every((record) => record.status === "ready-for-explicit-write"));
  assert.doesNotMatch(JSON.stringify(plan), /CONTROLLED\/DOCUMENT-MPD/i);
  assert.deepEqual(completion.guardrails, {
    networkRequestPerformed: false,
    serverPersistencePerformed: false,
    manifestWritePerformed: false,
    batchWritePerformed: false,
    approvalGrantedByWorkspace: false,
    documentFilesRead: false,
    malwareScanPerformed: false,
    publicationActivated: false,
    privateEvidenceIncluded: false,
    approverIdentityIncluded: false,
  });
});

test("fails the complete document batch for missing, duplicated, stale or unconfirmed records", () => {
  const completion = completedBatch();
  const batch = structuredClone(completion.batch);

  assert.throws(
    () => createDocumentApprovalBatchCompletion({
      templates: batch.requests,
      input: { requests: {}, batchConfirmation: null },
      now: NOW,
    }),
    /explicit final confirmation/i,
  );

  const duplicate = structuredClone(batch);
  duplicate.requests[11] = structuredClone(duplicate.requests[0]);
  const duplicatePlan = createDocumentApprovalBatchUpdatePlan({ manifest: manifestData, batch: duplicate, now: NOW });
  assert.match(duplicatePlan.blockers.join("\n"), /record IDs must be unique/i);
  assert.match(duplicatePlan.blockers.join("\n"), /missing document-mpd-c-4/i);

  const stale = structuredClone(batch);
  stale.requests[5].expectedRecordDigest = "0".repeat(64);
  const stalePlan = createDocumentApprovalBatchUpdatePlan({ manifest: manifestData, batch: stale, now: NOW });
  assert.equal(stalePlan.status, "blocked");
  assert.match(stalePlan.blockers.join("\n"), /document-mpd-b-6.*record changed.*fresh template/i);
  assert.equal(stalePlan.guardrails.allOrNothingWrite, true);
  assert.equal(stalePlan.guardrails.exactDocumentBatchRequired, true);
});

test("plans read-only and records all twelve supplied decisions in one atomic manifest write", async (context) => {
  const { manifest, manifestPath } = await temporaryManifest(context);
  const batch = completedBatch(manifest).batch;
  const before = await readFile(manifestPath, "utf8");

  const planned = await executeDocumentApprovalBatchUpdate({ manifestPath, batch, now: NOW });
  assert.equal(planned.mode, "local-document-batch-plan");
  assert.equal(planned.plan.status, "ready-for-explicit-atomic-write");
  assert.equal(digest(await readFile(manifestPath, "utf8")), digest(before));

  await assert.rejects(
    executeDocumentApprovalBatchUpdate({ manifestPath, batch, now: NOW, apply: true }),
    /requires --acknowledge-local-write=.*No manifest write was made/i,
  );
  assert.equal(await readFile(manifestPath, "utf8"), before);

  const result = await executeDocumentApprovalBatchUpdate({
    manifestPath,
    batch,
    now: NOW,
    apply: true,
    acknowledgement: DOCUMENT_APPROVAL_BATCH_UPDATE_ACKNOWLEDGEMENT,
  });
  const updated = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(result.mode, "local-document-manifest-batch-write");
  assert.equal(result.receipt.records.length, 12);
  assert.equal(result.receipt.atomicBatchWritePerformed, true);
  assert.equal(result.receipt.approvalGrantedByTool, false);
  assert.equal(result.receipt.documentFilesRead, false);
  assert.equal(result.receipt.malwareScanPerformed, false);
  assert.equal(result.receipt.publicationActivated, false);
  assert.ok(documentApprovalBatchRecordIds.every((recordId) => updated.records.find((record) => record.id === recordId).decision === "approved"));
  assert.equal(updated.records.find((record) => record.id === "media-campus-main").decision, "review-required");
  assert.deepEqual(validateApprovalManifest(updated), []);
});

test("publishes the authenticated document batch workspace, schema and guarded command", async () => {
  const [page, client, dashboard, sitemap, schemaText, packageText, guide, readme, script] = await Promise.all([
    readFile(new URL("../app/publication-review/document-approval-batch/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/document-approval-batch/document-approval-batch-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../content/document-approval-batch-request.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../docs/approval-manifest.md", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../scripts/update-document-approval-batch.mjs", import.meta.url), "utf8"),
  ]);
  const schema = JSON.parse(schemaText);
  const packageJson = JSON.parse(packageText);

  assert.match(page, /requireChatGPTUser\("\/publication-review\/document-approval-batch"\)/);
  assert.match(page, /sends no decision data to the server/i);
  assert.match(client, /^"use client"/);
  assert.match(client, /createDocumentApprovalBatchCompletion/);
  assert.match(client, /URL\.createObjectURL/);
  assert.match(client, /defaultValue=""/);
  assert.doesNotMatch(client, /fetch\(|localStorage|sessionStorage|method=["']post/i);
  assert.match(dashboard, /Complete 12-document approval batch/);
  assert.doesNotMatch(sitemap, /document-approval-batch/);
  assert.equal(schema.properties.requests.minItems, 12);
  assert.equal(schema.properties.requests.maxItems, 12);
  assert.equal(schema.properties.requests.allOf.length, 12);
  assert.match(packageJson.scripts["approvals:document-batch"], /update-document-approval-batch/);
  assert.match(packageJson.scripts["test:contract"], /document-approval-batch\.test/);
  assert.match(packageJson.scripts["test:review"], /document-approval-batch\.test/);
  assert.match(guide, /Appendix IX document approval batch/i);
  assert.match(readme, /twelve-document approval batch/i);
  assert.doesNotMatch(script, /argument === "--replace"/);
});
