import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  PUBLIC_DOCUMENT_ACTIVATION_ACKNOWLEDGEMENT,
  auditPublicDocumentPublicationArtifacts,
  createPublicDocumentActivationPlan,
  executePublicDocumentActivation,
} from "../lib/public-document-activation.ts";
import {
  createPublicDocumentPublicationIndex,
  publicDocumentPublicationRegistry,
  publicDocumentPublicationSummary,
  publicDocumentUrl,
  validatePublicDocumentActivationMetadata,
  validatePublicDocumentPublicationRegistry,
} from "../lib/public-document-publication.ts";

const NOW = "2026-08-17T08:00:00.000Z";
const recordId = "document-mpd-b-1";
const publicFilename = "affiliation-extension-2026.pdf";

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function metadata(overrides = {}) {
  return {
    schemaVersion: 1,
    recordId,
    publicFilename,
    label: "Current approved extension",
    status: "current",
    academicYear: null,
    publicationYear: "2026",
    issuingAuthority: "Central Board of Secondary Education",
    issueDate: "2026-06-01",
    expiryDate: "2028-03-31",
    language: "English",
    publicNote: "Approved public copy published through the controlled Appendix IX workflow.",
    notes: "First exact approved binding.",
    ...overrides,
  };
}

function approvedManifest(decision = "approved") {
  return {
    records: [{
      id: recordId,
      kind: "document",
      checkProfile: "public-document",
      decision,
      checks: {
        authenticity: decision === "approved" ? "verified" : "pending",
        metadata: decision === "approved" ? "verified" : "pending",
        "malware-scan": decision === "approved" ? "verified" : "pending",
        privacy: decision === "approved" ? "verified" : "pending",
        accessibility: decision === "approved" ? "verified" : "pending",
        "management-approval": decision === "approved" ? "verified" : "pending",
      },
      evidenceReferences: decision === "approved" ? ["DOCSCAN/2026/0001"] : [],
      approvedByRole: decision === "approved" ? "compliance-owner" : null,
      approvedAt: decision === "approved" ? "2026-08-17T07:30:00.000Z" : null,
      expiresAt: null,
    }],
  };
}

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sskem-document-activation-"));
  const stagingRoot = path.join(root, "staging");
  const publicRoot = path.join(root, "public");
  const registryPath = path.join(root, "public-document-publication-bindings.json");
  const stagedDirectory = path.join(stagingRoot, recordId);
  const publicDirectory = path.join(publicRoot, recordId);
  const pdf = Buffer.from("%PDF-1.4\n% exact approved test document\n%%EOF\n", "ascii");
  const receipt = {
    schemaVersion: 1,
    pipelineId: "sskem-public-document",
    recordId,
    decisionAtPreparation: "review-required",
    mode: "staging",
    generatedAt: "2026-08-16T08:00:00.000Z",
    source: { bytes: pdf.length, sha256: digest(pdf), pages: 1, pdfVersion: 1.4, tagged: true, encrypted: false },
    safety: { activeOrEmbeddedContent: "not-detected", detectedTokens: [], malwareScanner: "not-run" },
    accessibility: { assessment: "text-readable", extractedTextCharacters: 120, minimumExpectedCharacters: 40, extractedTextPersisted: false },
    output: { candidateFilename: "candidate.pdf", renderDpi: 120, previews: [] },
  };
  await Promise.all([mkdir(stagedDirectory, { recursive: true }), mkdir(publicDirectory, { recursive: true })]);
  await Promise.all([
    writeFile(path.join(stagedDirectory, "intake-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8"),
    writeFile(path.join(publicDirectory, publicFilename), pdf),
    writeFile(registryPath, `${JSON.stringify(publicDocumentPublicationRegistry, null, 2)}\n`, "utf8"),
  ]);
  context.after(() => rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }));
  return { pdf, publicDirectory, publicRoot, receipt, registryPath, stagingRoot };
}

test("keeps the canonical registry empty and all twelve document links fail-closed", async () => {
  assert.deepEqual(validatePublicDocumentPublicationRegistry(), []);
  assert.equal(createPublicDocumentPublicationIndex().size, 0);
  assert.deepEqual(publicDocumentPublicationSummary(), { recorded: 0, valid: 0, required: 12, releaseReady: false, issues: [] });
  assert.deepEqual(await auditPublicDocumentPublicationArtifacts(), []);
});

test("plans locally, requires acknowledgement and activates an exact approved PDF", async (context) => {
  const item = await fixture(context);
  const options = { recordId, metadata: metadata(), registryPath: item.registryPath, stagingRoot: item.stagingRoot, publicRoot: item.publicRoot, manifest: approvedManifest(), now: NOW };
  assert.deepEqual(validatePublicDocumentActivationMetadata(options.metadata, { recordId, now: NOW }), []);

  const planned = await executePublicDocumentActivation(options);
  assert.equal(planned.mode, "local-plan");
  assert.equal(planned.plan.status, "ready-for-explicit-write");
  assert.equal(planned.plan.proposal.sourceSha256, digest(item.pdf));
  assert.equal(planned.plan.proposal.accessibilityStatus, "Tagged and accessible");
  assert.doesNotMatch(JSON.stringify(planned), /(?:sourcePath|metadataPath|approvedBy|evidenceReference)/i);
  assert.equal(JSON.parse(await readFile(item.registryPath, "utf8")).bindings.length, 0);

  await assert.rejects(executePublicDocumentActivation({ ...options, apply: true, acknowledgement: "wrong" }), /requires --acknowledge-local-write.*?No registry write/i);
  const applied = await executePublicDocumentActivation({ ...options, apply: true, acknowledgement: PUBLIC_DOCUMENT_ACTIVATION_ACKNOWLEDGEMENT });
  assert.equal(applied.mode, "local-registry-write");

  const registry = JSON.parse(await readFile(item.registryPath, "utf8"));
  assert.equal(registry.bindings.length, 1);
  assert.deepEqual(validatePublicDocumentPublicationRegistry({ registry, manifest: approvedManifest(), now: NOW }), []);
  const index = createPublicDocumentPublicationIndex({ registry, manifest: approvedManifest(), now: NOW });
  assert.equal(publicDocumentUrl(index.get("mpd-b-1"), registry), `/documents/production/${recordId}/${publicFilename}`);
  assert.equal((await createPublicDocumentActivationPlan(options)).status, "already-active");
});

test("blocks unapproved records, accessibility debt, silent replacement and PDF tampering", async (context) => {
  const item = await fixture(context);
  const base = { recordId, metadata: metadata(), registryPath: item.registryPath, stagingRoot: item.stagingRoot, publicRoot: item.publicRoot, manifest: approvedManifest(), now: NOW };
  const unapproved = await createPublicDocumentActivationPlan({ ...base, manifest: approvedManifest("review-required") });
  assert.equal(unapproved.status, "blocked");
  assert.match(unapproved.blockers.join(" "), /approved document record.*malware-scan/i);

  const inaccessibleReceipt = structuredClone(item.receipt);
  inaccessibleReceipt.accessibility.assessment = "remediation-required";
  await writeFile(path.join(item.stagingRoot, recordId, "intake-receipt.json"), `${JSON.stringify(inaccessibleReceipt, null, 2)}\n`, "utf8");
  await assert.rejects(createPublicDocumentActivationPlan(base), /accessibility remediation/i);
  await writeFile(path.join(item.stagingRoot, recordId, "intake-receipt.json"), `${JSON.stringify(item.receipt, null, 2)}\n`, "utf8");

  await executePublicDocumentActivation({ ...base, apply: true, acknowledgement: PUBLIC_DOCUMENT_ACTIVATION_ACKNOWLEDGEMENT });
  const activeRegistry = await readFile(item.registryPath, "utf8");
  const replacement = await createPublicDocumentActivationPlan({ ...base, metadata: metadata({ label: "Replacement approved extension" }) });
  assert.equal(replacement.status, "blocked");
  assert.match(replacement.blockers.join(" "), /different binding.*--replace/i);

  await writeFile(path.join(item.publicDirectory, publicFilename), Buffer.from("%PDF-1.4\ntampered\n", "ascii"));
  await assert.rejects(createPublicDocumentActivationPlan({ ...base, replace: true }), /artifact verification failed.*(?:byte size|hash)/i);
  assert.equal(await readFile(item.registryPath, "utf8"), activeRegistry);
});

test("rejects expired, placeholder or private-path public metadata", () => {
  assert.match(validatePublicDocumentActivationMetadata(metadata({ expiryDate: "2026-08-01" }), { recordId, now: NOW }).join(" "), /has passed/i);
  assert.match(validatePublicDocumentActivationMetadata(metadata({ issuingAuthority: "Authority pending review" }), { recordId, now: NOW }).join(" "), /verified public value/i);
  assert.match(validatePublicDocumentActivationMetadata(metadata({ publicNote: "Controlled C:\\private\\document.pdf" }), { recordId, now: NOW }).join(" "), /filesystem path/i);
});

test("wires binding audit and fail-closed runtime projection into the build", async () => {
  const [packageText, documentData, guide] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/data/documents.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/document-ingestion.md", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageText);
  assert.match(packageJson.scripts.prebuild, /documents:bindings:audit/);
  assert.match(packageJson.scripts["test:contract"], /public-document-publication\.test\.mjs/);
  assert.match(documentData, /createPublicDocumentPublicationIndex/);
  assert.match(documentData, /currentVersion: version/);
  assert.match(guide, /activate-approved-public-document/);
  assert.match(guide, /source paths, private evidence or approver identities/i);
});
