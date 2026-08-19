import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PUBLIC_DOCUMENT_ACTIVATION_BATCH_CONFIRMATION,
  PUBLIC_DOCUMENT_ACTIVATION_BATCH_ID,
  publicDocumentActivationBatchRecordIds,
} from "../lib/public-document-activation-batch-contract.ts";
import {
  PUBLIC_DOCUMENT_METADATA_RECORD_CONFIRMATION,
  createPublicDocumentActivationBatchCompletion,
} from "../lib/public-document-activation-batch-workspace.ts";
import { validatePublicDocumentActivationBatch } from "../lib/public-document-activation-batch-plan.mjs";
import { publicDocumentRecordMap } from "../lib/public-document-publication.ts";

const NOW = "2026-08-19T08:00:00.000Z";

function recordInput(recordId, index) {
  return {
    publicFilename: `${publicDocumentRecordMap[recordId]}-approved-2026.pdf`,
    label: `Approved Appendix IX ${publicDocumentRecordMap[recordId].toUpperCase()}`,
    status: "current",
    academicYearChoice: index >= 8 ? "value" : "none",
    academicYear: index >= 8 ? "2026-2027" : "",
    publicationYearChoice: "value",
    publicationYear: "2026",
    issuingAuthority: "Authorised school compliance authority",
    issueDate: `2026-06-${String(index + 1).padStart(2, "0")}`,
    expiryDateChoice: "none",
    expiryDate: "",
    language: "English",
    publicNote: "Approved public copy supplied through the controlled Appendix IX workflow.",
    notes: "Exact first-publication metadata reviewed for the complete batch.",
    recordConfirmation: PUBLIC_DOCUMENT_METADATA_RECORD_CONFIRMATION,
  };
}

function workspaceInput() {
  return {
    documents: Object.fromEntries(publicDocumentActivationBatchRecordIds.map((recordId, index) => [recordId, recordInput(recordId, index)])),
    batchConfirmation: PUBLIC_DOCUMENT_ACTIVATION_BATCH_CONFIRMATION,
  };
}

test("creates one complete planner-ready Appendix IX metadata batch without persistence", () => {
  const completion = createPublicDocumentActivationBatchCompletion({ input: workspaceInput(), now: NOW });
  const downloaded = JSON.parse(completion.body);

  assert.equal(completion.filename, "sskem-appendix-ix-document-metadata-2026-08-19.json");
  assert.equal(completion.validation.status, "ready-for-local-batch-planner");
  assert.equal(completion.validation.documentsCompleted, 12);
  assert.deepEqual(completion.validation.recordIds, publicDocumentActivationBatchRecordIds);
  assert.equal(downloaded.batchId, PUBLIC_DOCUMENT_ACTIVATION_BATCH_ID);
  assert.equal(downloaded.documents.length, 12);
  assert.equal(new Set(downloaded.documents.map((document) => document.publicFilename)).size, 12);
  assert.deepEqual(validatePublicDocumentActivationBatch(downloaded, { now: NOW }), []);
  assert.deepEqual(completion.guardrails, {
    networkRequestPerformed: false,
    serverPersistencePerformed: false,
    documentFilesRead: false,
    manifestWritePerformed: false,
    registryWritePerformed: false,
    approvalGrantedByWorkspace: false,
    malwareScanPerformed: false,
    activationPerformed: false,
    privateEvidenceIncluded: false,
    controlledPathsStored: false,
  });
  assert.doesNotMatch(completion.body, /(?:sourcePath|metadataPath|evidenceReferences|approvedBy|approver|signature|token)/i);
});

test("rejects incomplete, duplicate, ambiguous and non-public metadata before download", () => {
  const unconfirmed = workspaceInput();
  unconfirmed.batchConfirmation = null;
  assert.throws(
    () => createPublicDocumentActivationBatchCompletion({ input: unconfirmed, now: NOW }),
    /explicit final confirmation/i,
  );

  const missing = workspaceInput();
  delete missing.documents[publicDocumentActivationBatchRecordIds[3]];
  assert.throws(
    () => createPublicDocumentActivationBatchCompletion({ input: missing, now: NOW }),
    /complete the public metadata for document-mpd-b-4/i,
  );

  const duplicate = workspaceInput();
  duplicate.documents[publicDocumentActivationBatchRecordIds[1]].publicFilename = duplicate.documents[publicDocumentActivationBatchRecordIds[0]].publicFilename;
  assert.throws(
    () => createPublicDocumentActivationBatchCompletion({ input: duplicate, now: NOW }),
    /unique stable public PDF filename/i,
  );

  const ambiguous = workspaceInput();
  ambiguous.documents[publicDocumentActivationBatchRecordIds[0]].academicYearChoice = "none";
  ambiguous.documents[publicDocumentActivationBatchRecordIds[0]].academicYear = "2026-2027";
  assert.throws(
    () => createPublicDocumentActivationBatchCompletion({ input: ambiguous, now: NOW }),
    /clear the academic year/i,
  );

  const privatePath = workspaceInput();
  privatePath.documents[publicDocumentActivationBatchRecordIds[0]].notes = "Reviewed at C:\\controlled\\appendix.pdf";
  assert.throws(
    () => createPublicDocumentActivationBatchCompletion({ input: privatePath, now: NOW }),
    /filesystem path/i,
  );

  const placeholderAuthority = workspaceInput();
  placeholderAuthority.documents[publicDocumentActivationBatchRecordIds[0]].issuingAuthority = "Authority awaiting review";
  assert.throws(
    () => createPublicDocumentActivationBatchCompletion({ input: placeholderAuthority, now: NOW }),
    /verified public value/i,
  );
});

test("publishes an authenticated blank browser-only metadata workspace", async () => {
  const [page, client, contract, packageText, dashboard, sitemap, guide, readme] = await Promise.all([
    readFile(new URL("../app/publication-review/document-metadata-batch/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/document-metadata-batch/document-metadata-batch-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/public-document-activation-batch-contract.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/document-ingestion.md", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageText);

  assert.match(page, /requireChatGPTUser\("\/publication-review\/document-metadata-batch"\)/);
  assert.match(page, /sends nothing to the server and stores nothing/i);
  assert.match(client, /^"use client"/);
  assert.match(client, /createPublicDocumentActivationBatchCompletion/);
  assert.match(client, /URL\.createObjectURL/);
  assert.match(client, /defaultValue=""/);
  assert.doesNotMatch(client, /fetch\(|localStorage|sessionStorage|method=["']post/i);
  assert.equal((contract.match(/"document-mpd-[bc]-\d"/g) ?? []).length, 12);
  assert.match(packageJson.scripts["test:contract"], /public-document-activation-batch-workspace\.test/);
  assert.match(packageJson.scripts["test:review"], /public-document-activation-batch-workspace\.test/);
  assert.match(dashboard, /Complete 12-record metadata batch/);
  assert.doesNotMatch(sitemap, /document-metadata-batch/);
  assert.match(guide, /document-metadata-batch/i);
  assert.match(readme, /browser-only Appendix IX metadata workspace/i);
});
