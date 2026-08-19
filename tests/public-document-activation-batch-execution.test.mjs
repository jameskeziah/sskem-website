import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import manifestData from "../content/approval-manifest.json" with { type: "json" };
import registryData from "../content/public-document-publication-bindings.json" with { type: "json" };
import { validateApprovalManifest } from "../lib/approval-manifest.mjs";
import {
  PUBLIC_DOCUMENT_ACTIVATION_BATCH_ACKNOWLEDGEMENT,
  executePublicDocumentActivationBatch,
} from "../lib/public-document-activation-batch-execution.mjs";
import {
  PUBLIC_DOCUMENT_ACTIVATION_BATCH_CONFIRMATION,
  PUBLIC_DOCUMENT_ACTIVATION_BATCH_ID,
} from "../lib/public-document-activation-batch-plan.mjs";
import { auditPublicDocumentPublicationArtifacts } from "../lib/public-document-activation.ts";
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
    record.evidenceReferences = [`CONTROLLED/DOCUMENT-BATCH-EXECUTION-${String(index + 1).padStart(2, "0")}`];
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
  const root = await mkdtemp(path.join(tmpdir(), "sskem-document-batch-execution-"));
  const stagingRoot = path.join(root, "staging");
  const publicRoot = path.join(root, "public");
  const registryPath = path.join(root, "public-document-publication-bindings.json");
  const registryText = `${JSON.stringify(registryData, null, 2)}\n`;
  await writeFile(registryPath, registryText, "utf8");
  for (const [index, recordId] of recordIds.entries()) {
    const metadata = metadataFor(recordId, index);
    const pdf = Buffer.from(`%PDF-1.4\n% exact Appendix IX execution fixture ${recordId}\n%%EOF\n`, "ascii");
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
  return { publicRoot, registryPath, registryText, stagingRoot };
}

test("atomically activates the exact twelve-document registry and refuses stale or raced plans", async (context) => {
  const item = await fixture(context);
  const manifest = approvedManifest();
  const options = {
    batch: metadataBatch(),
    registryPath: item.registryPath,
    stagingRoot: item.stagingRoot,
    publicRoot: item.publicRoot,
    manifest,
    now: NOW,
  };

  const planned = await executePublicDocumentActivationBatch(options);
  assert.equal(planned.mode, "local-plan");
  assert.equal(planned.plan.status, "ready-for-explicit-batch-activation");
  assert.match(planned.plan.activationBatchId, /^appendix-ix-activation-[a-f0-9]{12}$/);
  assert.equal(await readFile(item.registryPath, "utf8"), item.registryText);

  await assert.rejects(
    executePublicDocumentActivationBatch({
      ...options,
      apply: true,
      acknowledgement: PUBLIC_DOCUMENT_ACTIVATION_BATCH_ACKNOWLEDGEMENT,
      activationBatchId: "appendix-ix-activation-000000000000",
    }),
    /requires --activation-batch-id=.*?No registry write/i,
  );
  assert.equal(await readFile(item.registryPath, "utf8"), item.registryText);

  const racedRegistryText = `${item.registryText.trimEnd()}  \n`;
  await assert.rejects(
    executePublicDocumentActivationBatch({
      ...options,
      apply: true,
      acknowledgement: PUBLIC_DOCUMENT_ACTIVATION_BATCH_ACKNOWLEDGEMENT,
      activationBatchId: planned.plan.activationBatchId,
      beforeRegistryCommit: () => writeFile(item.registryPath, racedRegistryText, "utf8"),
    }),
    /registry changed during commit/i,
  );
  assert.equal(await readFile(item.registryPath, "utf8"), racedRegistryText);
  await writeFile(item.registryPath, item.registryText, "utf8");

  const applied = await executePublicDocumentActivationBatch({
    ...options,
    apply: true,
    acknowledgement: PUBLIC_DOCUMENT_ACTIVATION_BATCH_ACKNOWLEDGEMENT,
    activationBatchId: planned.plan.activationBatchId,
  });
  assert.equal(applied.mode, "local-atomic-document-batch-activation");
  assert.equal(applied.status, "twelve-document-registry-activated-locally");
  assert.equal(applied.receipt.recordsActivated, 12);
  assert.equal(applied.receipt.totalPages, 12);
  assert.equal(applied.receipt.publicFilesChanged, false);
  assert.equal(applied.receipt.stagingPreserved, true);
  assert.equal(applied.receipt.externalMalwareScanPerformed, false);
  assert.equal(applied.receipt.deploymentPerformed, false);
  assert.doesNotMatch(JSON.stringify(applied), /"(?:sourcePath|metadataPath|approverIdentity|evidenceReferences|token)"\s*:/);

  const registry = JSON.parse(await readFile(item.registryPath, "utf8"));
  assert.equal(registry.bindings.length, 12);
  assert.deepEqual(validatePublicDocumentPublicationRegistry({ registry, manifest, now: NOW }), []);
  assert.deepEqual(await auditPublicDocumentPublicationArtifacts({ registry, manifest, publicRoot: item.publicRoot, now: NOW }), []);
  assert.equal((await stat(item.stagingRoot)).isDirectory(), true);

  const repeated = await executePublicDocumentActivationBatch(options);
  assert.equal(repeated.plan.status, "blocked");
  assert.match(repeated.plan.blockers.join(" "), /empty Appendix IX binding registry|replacement is not supported/i);
});

test("documents the guarded twelve-document executor without replacement or deployment", async () => {
  const [script, library, packageText, guide, readme, page] = await Promise.all([
    readFile(new URL("../scripts/activate-public-document-batch.mjs", import.meta.url), "utf8"),
    readFile(new URL("../lib/public-document-activation-batch-execution.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../docs/document-ingestion.md", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/page.tsx", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageText);

  assert.match(packageJson.scripts["documents:activate-batch"], /activate-public-document-batch/);
  assert.match(packageJson.scripts["test:contract"], /public-document-activation-batch-execution\.test/);
  assert.match(packageJson.scripts["test:review"], /public-document-activation-batch-execution\.test/);
  assert.doesNotMatch(script, /argument === "--replace"/);
  assert.match(script, /activation-batch-id/);
  assert.match(library, /beforeRegistryCommit/);
  assert.match(library, /renameWithRetry\(temporaryRegistryPath, registryPath\)/);
  assert.match(guide, /documents:activate-batch/i);
  assert.match(readme, /atomic\s+twelve-document registry\s+executor/i);
  assert.match(page, /documents:activate-batch/i);
});
