import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

import { publicDocuments } from "../app/data/documents.ts";
import {
  approvalSummary,
  loadApprovalManifest,
  validateApprovalManifest,
} from "../lib/approval-manifest.mjs";

const projectRoot = new URL("../", import.meta.url);

test("validates the 33-record media, claim, and document approval inventory", async () => {
  const manifest = await loadApprovalManifest();
  const issues = validateApprovalManifest(manifest);
  const summary = approvalSummary(manifest);

  assert.deepEqual(issues, []);
  assert.equal(summary.total, 33);
  assert.deepEqual(summary.byKind, { media: 9, claim: 12, document: 12 });
  assert.deepEqual(summary.byDecision, { blocked: 25, "review-required": 8, approved: 0, withdrawn: 0 });
  assert.deepEqual(summary.blockingByKind, { media: 9, claim: 12, document: 12 });
  assert.equal(summary.releaseReady, false);
  assert.equal(summary.blockingRecords.length, 33);
});

test("publishes the JSON schema and keeps its evidence policy aligned with the validator", async () => {
  const [manifest, schemaText] = await Promise.all([
    loadApprovalManifest(),
    readFile(new URL("content/approval-manifest.schema.json", projectRoot), "utf8"),
  ]);
  const schema = JSON.parse(schemaText);

  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.properties.$schema.const, "./approval-manifest.schema.json");
  assert.equal(schema.properties.schemaVersion.const, 1);
  assert.equal(schema.properties.manifestId.const, manifest.manifestId);
  assert.equal(manifest.evidencePolicy.referencePattern, "^[A-Z0-9][A-Z0-9._/-]{2,79}$");
});

test("rejects unknown manifest fields instead of silently ignoring approval typos", async () => {
  const manifest = structuredClone(await loadApprovalManifest());
  manifest.records[0].aprovedAt = "2026-08-10T10:00:00Z";

  assert.ok(validateApprovalManifest(manifest).some((issue) => issue.code === "unknown-field"));
});

test("covers every controlled Appendix IX record and every homepage media asset", async () => {
  const manifest = await loadApprovalManifest();
  const documentIds = manifest.records
    .filter((record) => record.kind === "document")
    .map((record) => record.sourcePointer.split("#")[1])
    .sort();
  assert.deepEqual(documentIds, publicDocuments.map((document) => document.id).sort());

  const mediaRecords = manifest.records.filter((record) => record.kind === "media");
  for (const record of mediaRecords) {
    const details = await stat(new URL(record.sourcePointer, projectRoot));
    assert.ok(details.isFile(), `${record.id} must resolve to a controlled media file`);
    assert.ok(record.publicTargets.length > 0, `${record.id} must declare its public placement`);
  }
});

test("stores only opaque evidence references and no private evidence locations", async () => {
  const manifest = await loadApprovalManifest();
  assert.equal(manifest.evidencePolicy.privateEvidenceStoredInRepository, false);

  for (const record of manifest.records) {
    assert.doesNotMatch(record.sourcePointer, /^(?:[a-z]:|file:)|\\/i);
    for (const reference of record.evidenceReferences) {
      assert.match(reference, /^[A-Z0-9][A-Z0-9._/-]{2,79}$/);
      assert.doesNotMatch(reference, /@|https?:|\\/i);
    }
  }

  const unsafe = structuredClone(manifest);
  unsafe.records[0].evidenceReferences = ["C:/PRIVATE/CONSENT.PDF"];
  assert.ok(validateApprovalManifest(unsafe).some((issue) => issue.code === "unsafe-evidence-reference"));
});

test("rejects approval without completed checks, evidence, role, and timestamp", async () => {
  const manifest = structuredClone(await loadApprovalManifest());
  const record = manifest.records.find((candidate) => candidate.id === "media-campus-main");
  record.decision = "approved";

  const codes = new Set(validateApprovalManifest(manifest).map((issue) => issue.code));
  for (const code of ["approval-evidence", "approval-role", "approval-time", "approval-check"]) {
    assert.ok(codes.has(code), `Expected ${code}`);
  }
});

test("requires withdrawn records to have no public placements", async () => {
  const manifest = structuredClone(await loadApprovalManifest());
  const record = manifest.records.find((candidate) => candidate.id === "media-campus-main");
  record.decision = "withdrawn";

  assert.ok(validateApprovalManifest(manifest).some((issue) => issue.code === "withdrawn-target"));
});
