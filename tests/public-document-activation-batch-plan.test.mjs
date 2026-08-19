import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import manifestData from "../content/approval-manifest.json" with { type: "json" };
import registryData from "../content/public-document-publication-bindings.json" with { type: "json" };
import { validateApprovalManifest } from "../lib/approval-manifest.mjs";
import {
  PUBLIC_DOCUMENT_ACTIVATION_BATCH_CONFIRMATION,
  PUBLIC_DOCUMENT_ACTIVATION_BATCH_ID,
  createPublicDocumentActivationBatchPlan,
  validatePublicDocumentActivationBatch,
} from "../lib/public-document-activation-batch-plan.mjs";
import {
  publicDocumentRecordMap,
  validatePublicDocumentPublicationRegistry,
} from "../lib/public-document-publication.ts";

const NOW = "2026-08-19T08:00:00.000Z";
const recordIds = Object.keys(publicDocumentRecordMap);

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function approvedManifest() {
  const manifest = structuredClone(manifestData);
  manifest.updatedOn = "2026-08-19";
  for (const [index, recordId] of recordIds.entries()) {
    const record = manifest.records.find((candidate) => candidate.id === recordId);
    record.checks = Object.fromEntries(Object.keys(record.checks).map((check) => [check, "verified"]));
    record.decision = "approved";
    record.evidenceReferences = [`CONTROLLED/DOCUMENT-SCAN-${String(index + 1).padStart(2, "0")}`];
    record.approvedByRole = "compliance-owner";
    record.approvedAt = "2026-08-19T07:30:00.000Z";
    record.expiresAt = null;
  }
  assert.deepEqual(validateApprovalManifest(manifest), []);
  return manifest;
}

function metadataFor(recordId, index) {
  const documentId = publicDocumentRecordMap[recordId];
  return {
    schemaVersion: 1,
    recordId,
    publicFilename: `${documentId}-approved.pdf`,
    label: `Approved Appendix IX ${documentId.toUpperCase()}`,
    status: "current",
    academicYear: null,
    publicationYear: "2026",
    issuingAuthority: "Authorised school compliance authority",
    issueDate: `2026-06-${String(index + 1).padStart(2, "0")}`,
    expiryDate: null,
    language: "English",
    publicNote: "Approved public copy supplied through the controlled Appendix IX workflow.",
    notes: "Exact first-publication batch binding.",
  };
}

function metadataBatch() {
  return {
    batchVersion: 1,
    batchId: PUBLIC_DOCUMENT_ACTIVATION_BATCH_ID,
    generatedAt: NOW,
    documents: recordIds.map(metadataFor),
    batchConfirmation: PUBLIC_DOCUMENT_ACTIVATION_BATCH_CONFIRMATION,
  };
}

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sskem-document-batch-plan-"));
  const stagingRoot = path.join(root, "staging");
  const publicRoot = path.join(root, "public");
  const registryPath = path.join(root, "public-document-publication-bindings.json");
  await writeFile(registryPath, `${JSON.stringify(registryData, null, 2)}\n`, "utf8");
  for (const [index, recordId] of recordIds.entries()) {
    const metadata = metadataFor(recordId, index);
    const pdf = Buffer.from(`%PDF-1.4\n% exact Appendix IX fixture ${recordId}\n%%EOF\n`, "ascii");
    const stagedDirectory = path.join(stagingRoot, recordId);
    const publicDirectory = path.join(publicRoot, recordId);
    await Promise.all([
      mkdir(stagedDirectory, { recursive: true }),
      mkdir(publicDirectory, { recursive: true }),
    ]);
    const receipt = {
      schemaVersion: 1,
      pipelineId: "sskem-public-document",
      recordId,
      decisionAtPreparation: "review-required",
      mode: "staging",
      generatedAt: "2026-08-18T08:00:00.000Z",
      source: { bytes: pdf.length, sha256: digest(pdf), pages: 1, pdfVersion: 1.4, tagged: true, encrypted: false },
      safety: { activeOrEmbeddedContent: "not-detected", detectedTokens: [], malwareScanner: "not-run" },
      accessibility: { assessment: "text-readable", extractedTextCharacters: 120, minimumExpectedCharacters: 40, extractedTextPersisted: false },
      output: { candidateFilename: "candidate.pdf", renderDpi: 120, previews: [] },
    };
    await Promise.all([
      writeFile(path.join(stagedDirectory, "intake-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8"),
      writeFile(path.join(publicDirectory, metadata.publicFilename), pdf),
    ]);
  }
  context.after(() => rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }));
  return { publicRoot, registryPath, stagingRoot };
}

test("verifies all twelve exact Appendix IX documents and proposes one read-only registry", async (context) => {
  const item = await fixture(context);
  const manifest = approvedManifest();
  const batch = metadataBatch();
  assert.deepEqual(validatePublicDocumentActivationBatch(batch, { now: NOW }), []);
  const registryBefore = await readFile(item.registryPath, "utf8");

  const plan = await createPublicDocumentActivationBatchPlan({
    batch,
    registryPath: item.registryPath,
    stagingRoot: item.stagingRoot,
    publicRoot: item.publicRoot,
    manifest,
    now: NOW,
  });
  assert.equal(plan.status, "ready-for-explicit-batch-activation");
  assert.match(plan.activationBatchId, /^appendix-ix-activation-[a-f0-9]{12}$/);
  assert.match(plan.metadataBatchSha256, /^[a-f0-9]{64}$/);
  assert.equal(plan.records.length, 12);
  assert.ok(plan.records.every((record) => record.status === "verified-for-batch-activation"));
  assert.ok(plan.records.every((record) => record.pages === 1 && record.bytes > 0));
  assert.equal(plan.nextRegistry.bindings.length, 12);
  assert.deepEqual(validatePublicDocumentPublicationRegistry({ registry: plan.nextRegistry, manifest, now: NOW }), []);
  assert.equal(plan.guardrails.planOnly, true);
  assert.equal(plan.guardrails.registryWritePerformed, false);
  assert.equal(plan.guardrails.approvalGranted, false);
  assert.equal(plan.guardrails.externalMalwareScanPerformed, false);
  assert.equal(plan.guardrails.deploymentPerformed, false);
  assert.equal(await readFile(item.registryPath, "utf8"), registryBefore);
  assert.doesNotMatch(JSON.stringify(plan), /"(?:sourcePath|metadataPath|approverIdentity|evidenceReferences|token)"\s*:/);

  const tamperedRecord = recordIds[4];
  const tamperedMetadata = metadataFor(tamperedRecord, 4);
  await writeFile(path.join(item.publicRoot, tamperedRecord, tamperedMetadata.publicFilename), Buffer.from("%PDF-1.4\ntampered\n", "ascii"));
  const blocked = await createPublicDocumentActivationBatchPlan({
    batch,
    registryPath: item.registryPath,
    stagingRoot: item.stagingRoot,
    publicRoot: item.publicRoot,
    manifest,
    now: NOW,
  });
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.activationBatchId, null);
  assert.match(blocked.records.find((record) => record.recordId === tamperedRecord).blockers.join(" "), /byte size|hash/i);
  assert.equal(await readFile(item.registryPath, "utf8"), registryBefore);
});

test("rejects incomplete, duplicated, unconfirmed and identity-bearing metadata batches", () => {
  const missing = metadataBatch();
  missing.documents.pop();
  assert.match(validatePublicDocumentActivationBatch(missing, { now: NOW }).join(" "), /exactly twelve/i);

  const duplicated = metadataBatch();
  duplicated.documents[1] = structuredClone(duplicated.documents[0]);
  assert.match(validatePublicDocumentActivationBatch(duplicated, { now: NOW }).join(" "), /duplicate document record IDs/i);

  const unconfirmed = metadataBatch();
  unconfirmed.batchConfirmation = null;
  assert.match(validatePublicDocumentActivationBatch(unconfirmed, { now: NOW }).join(" "), /confirmation is missing/i);

  const privatePath = metadataBatch();
  privatePath.documents[0].notes = "Reviewed at C:\\controlled\\document.pdf";
  assert.match(validatePublicDocumentActivationBatch(privatePath, { now: NOW }).join(" "), /filesystem path/i);
});

test("publishes a permanently read-only batch planner command and reviewer guidance", async () => {
  const [script, library, schema, packageText, guide, readme, page] = await Promise.all([
    readFile(new URL("../scripts/plan-public-document-activation-batch.mjs", import.meta.url), "utf8"),
    readFile(new URL("../lib/public-document-activation-batch-plan.mjs", import.meta.url), "utf8"),
    readFile(new URL("../content/public-document-activation-batch.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../docs/document-ingestion.md", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/page.tsx", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageText);
  const parsedSchema = JSON.parse(schema);

  assert.equal(parsedSchema.properties.documents.minItems, 12);
  assert.equal(parsedSchema.properties.documents.maxItems, 12);
  assert.match(packageJson.scripts["documents:activate-batch-plan"], /plan-public-document-activation-batch/);
  assert.match(packageJson.scripts["test:contract"], /public-document-activation-batch-plan\.test/);
  assert.match(packageJson.scripts["test:review"], /public-document-activation-batch-plan\.test/);
  assert.doesNotMatch(script, /argument === "--apply"|argument === "--replace"/);
  assert.doesNotMatch(script, /writeFile|rename|rm\(/);
  assert.doesNotMatch(library, /export async function execute/);
  assert.match(guide, /documents:activate-batch-plan/i);
  assert.match(readme, /twelve-document\s+activation planner/i);
  assert.match(page, /documents:activate-batch-plan/i);
});
