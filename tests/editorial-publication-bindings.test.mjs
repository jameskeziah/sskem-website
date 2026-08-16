import assert from "node:assert/strict";
import test from "node:test";

import { loadApprovalManifest } from "../lib/approval-manifest.mjs";
import {
  auditEditorialPublicationBindings,
  loadEditorialPublicationBindings,
  validateEditorialPublicationBindings,
} from "../lib/editorial-publication-bindings.mjs";

function approvedManifestRecord(id = "claim-school-name") {
  return { id, kind: "claim", decision: "approved" };
}

function registry(bindingOverrides = {}) {
  return {
    $schema: "./editorial-publication-bindings.schema.json",
    schemaVersion: 1,
    registryId: "sskem-editorial-publication-bindings",
    updatedOn: "2026-08-16",
    policy: {
      privateEvidenceStoredInRepository: false,
      exactRevisionRequired: true,
      exactContentDigestRequired: true,
      notes: "Public-safe review receipts only.",
    },
    bindings: [{
      bindingId: "cms-binding-school-name",
      approvalRecordIds: ["claim-school-name"],
      contentType: "siteSettings",
      documentId: "site-settings",
      revision: "rev-reviewed",
      contentDigestSha256: "a".repeat(64),
      boundOn: "2026-08-16",
      ownerRole: "website-publisher",
      notes: "Exact reviewed public projection.",
      ...bindingOverrides,
    }],
  };
}

test("the repository binding registry and canonical manifest pass their joint audit", async () => {
  const [storedRegistry, storedManifest, audit] = await Promise.all([
    loadEditorialPublicationBindings(),
    loadApprovalManifest(),
    auditEditorialPublicationBindings(),
  ]);
  assert.equal(storedRegistry.policy.privateEvidenceStoredInRepository, false);
  assert.equal(storedRegistry.policy.exactRevisionRequired, true);
  assert.equal(storedRegistry.policy.exactContentDigestRequired, true);
  assert.ok(Array.isArray(storedManifest.records));
  assert.deepEqual(audit.issues, []);
});

test("binding validation rejects draft IDs, malformed digests and missing manifest references", () => {
  const manifest = { records: [approvedManifestRecord()] };
  const issues = validateEditorialPublicationBindings(registry({
    approvalRecordIds: ["claim-missing"],
    documentId: "drafts.site-settings",
    contentDigestSha256: "not-a-digest",
  }), manifest);
  assert.ok(issues.some((issue) => issue.code === "missing-approval-record"));
  assert.ok(issues.some((issue) => issue.code === "document-id"));
  assert.ok(issues.some((issue) => issue.code === "content-digest"));
});

test("one approval cannot silently authorize multiple CMS revisions", () => {
  const manifest = { records: [approvedManifestRecord()] };
  const candidate = registry();
  candidate.bindings.push({
    ...candidate.bindings[0],
    bindingId: "cms-binding-school-name-newer",
    revision: "rev-newer",
    contentDigestSha256: "b".repeat(64),
  });
  const issues = validateEditorialPublicationBindings(candidate, manifest);
  assert.ok(issues.some((issue) => issue.code === "duplicate-approval-record"));
});

test("a binding cannot be recorded before the canonical claim is approved", () => {
  const manifest = { records: [{ ...approvedManifestRecord(), decision: "review-required" }] };
  const issues = validateEditorialPublicationBindings(registry(), manifest);
  assert.ok(issues.some((issue) => issue.code === "approval-decision"));
});

test("a binding may require an exact set of independently approved claims", () => {
  const candidate = registry({ approvalRecordIds: ["claim-complete-address", "claim-public-contact"] });
  const manifest = {
    records: [
      approvedManifestRecord("claim-complete-address"),
      approvedManifestRecord("claim-public-contact"),
    ],
  };
  assert.deepEqual(validateEditorialPublicationBindings(candidate, manifest), []);
});
