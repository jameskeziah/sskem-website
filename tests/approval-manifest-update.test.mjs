import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  APPROVAL_MANIFEST_UPDATE_ACKNOWLEDGEMENT,
  createApprovalUpdatePlan,
  createApprovalUpdateRequestTemplate,
  executeApprovalManifestUpdate,
} from "../lib/approval-manifest-update.mjs";
import { loadApprovalManifest, validateApprovalManifest } from "../lib/approval-manifest.mjs";

const NOW = "2026-08-17T10:00:00.000Z";

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function completedRequest(template) {
  return {
    ...template,
    checks: Object.fromEntries(Object.keys(template.checks).map((check) => [check, "verified"])),
    evidenceReferences: ["CONTROLLED/MEDIA-CAMPUS-MAIN"],
    approvedByRole: "school-management",
    approvedAt: "2026-08-17T09:00:00.000Z",
  };
}

async function temporaryManifest() {
  const directory = await mkdtemp(path.join(tmpdir(), "sskem-approval-update-"));
  const manifestPath = path.join(directory, "approval-manifest.json");
  const manifest = await loadApprovalManifest();
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { manifest, manifestPath };
}

test("generates a digest-bound template without preselecting controlled decisions", async () => {
  const manifest = await loadApprovalManifest();
  const template = createApprovalUpdateRequestTemplate({ manifest, recordId: "media-campus-main" });

  assert.equal(template.recordId, "media-campus-main");
  assert.match(template.expectedRecordDigest, /^[a-f0-9]{64}$/);
  assert.deepEqual(template.checks, {
    accuracy: null,
    rights: null,
    privacy: null,
    "management-approval": null,
  });
  assert.deepEqual(template.evidenceReferences, []);
  assert.equal(template.approvedByRole, null);
  assert.equal(template.approvedAt, null);
});

test("builds a public-safe ready plan only from an exact completed request", async () => {
  const manifest = await loadApprovalManifest();
  const request = completedRequest(createApprovalUpdateRequestTemplate({ manifest, recordId: "media-campus-main" }));
  const plan = createApprovalUpdatePlan({ manifest, request, now: NOW });

  assert.equal(plan.status, "ready-for-explicit-write");
  assert.deepEqual(plan.blockers, []);
  assert.equal(plan.current.decision, "review-required");
  assert.equal(plan.proposal.evidenceReferencesRecorded, 1);
  assert.equal(plan.proposal.approvedByRole, "school-management");
  assert.equal(plan.proposal.manifestUpdatedOn, "2026-08-17");
  assert.equal(plan.guardrails.approvalGrantedByTool, false);
  assert.doesNotMatch(JSON.stringify(plan), /CONTROLLED\/MEDIA-CAMPUS-MAIN/);
});

test("blocks stale, incomplete and identity-bearing requests", async () => {
  const manifest = await loadApprovalManifest();
  const template = createApprovalUpdateRequestTemplate({ manifest, recordId: "media-campus-main" });
  const request = completedRequest(template);

  const stale = createApprovalUpdatePlan({ manifest, request: { ...request, expectedRecordDigest: "0".repeat(64) }, now: NOW });
  assert.match(stale.blockers.join("\n"), /record changed.*fresh template/i);

  const unsafe = createApprovalUpdatePlan({
    manifest,
    request: {
      ...request,
      checks: { ...request.checks, privacy: "James Smith" },
      evidenceReferences: ["person@example.com"],
      approvedByRole: "James Smith",
      approvedAt: "2026-08-18T09:00:00.000Z",
    },
    now: NOW,
  });
  const blockers = unsafe.blockers.join("\n");
  assert.match(blockers, /privacy requires an explicit/i);
  assert.match(blockers, /opaque controlled-record references only/i);
  assert.match(blockers, /role identifier, never an approver identity/i);
  assert.match(blockers, /cannot be in the future/i);
  assert.doesNotMatch(JSON.stringify(unsafe), /James Smith/);
});

test("keeps template generation and request planning read-only", async () => {
  const { manifest, manifestPath } = await temporaryManifest();
  const before = await readFile(manifestPath, "utf8");
  const templateResult = await executeApprovalManifestUpdate({ manifestPath, recordId: "media-campus-main" });
  const request = completedRequest(createApprovalUpdateRequestTemplate({ manifest, recordId: "media-campus-main" }));
  const planResult = await executeApprovalManifestUpdate({ manifestPath, request, now: NOW });
  const after = await readFile(manifestPath, "utf8");

  assert.equal(templateResult.mode, "local-template");
  assert.equal(planResult.mode, "local-plan");
  assert.equal(planResult.plan.status, "ready-for-explicit-write");
  assert.equal(digest(after), digest(before));
});

test("requires exact acknowledgement and atomically records only the supplied approval", async () => {
  const { manifest, manifestPath } = await temporaryManifest();
  const request = completedRequest(createApprovalUpdateRequestTemplate({ manifest, recordId: "media-campus-main" }));
  const before = await readFile(manifestPath, "utf8");

  await assert.rejects(
    executeApprovalManifestUpdate({ manifestPath, request, now: NOW, apply: true }),
    /requires --acknowledge-local-write=.*No manifest write was made/i,
  );
  assert.equal(await readFile(manifestPath, "utf8"), before);

  const result = await executeApprovalManifestUpdate({
    manifestPath,
    request,
    now: NOW,
    apply: true,
    acknowledgement: APPROVAL_MANIFEST_UPDATE_ACKNOWLEDGEMENT,
  });
  const updated = JSON.parse(await readFile(manifestPath, "utf8"));
  const record = updated.records.find((candidate) => candidate.id === "media-campus-main");
  const untouched = updated.records.find((candidate) => candidate.id === "media-campus-grounds");

  assert.equal(result.mode, "local-manifest-write");
  assert.equal(result.receipt.recordId, "media-campus-main");
  assert.equal(result.receipt.approvalGrantedByTool, false);
  assert.equal(result.receipt.explicitControlledDecisionRecorded, true);
  assert.equal(updated.updatedOn, "2026-08-17");
  assert.equal(record.decision, "approved");
  assert.ok(Object.values(record.checks).every((state) => state === "verified"));
  assert.deepEqual(record.evidenceReferences, ["CONTROLLED/MEDIA-CAMPUS-MAIN"]);
  assert.equal(record.approvedByRole, "school-management");
  assert.equal(untouched.decision, "review-required");
  assert.deepEqual(validateApprovalManifest(updated), []);
});

test("publishes a matching request schema and guarded command surface", async () => {
  const [schemaText, scriptSource] = await Promise.all([
    readFile(new URL("../content/approval-update-request.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/update-approval-manifest.mjs", import.meta.url), "utf8"),
  ]);
  const schema = JSON.parse(schemaText);

  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.decision.const, "approved");
  assert.deepEqual(schema.properties.checks.additionalProperties.enum, ["verified", "not-applicable"]);
  assert.equal(schema.properties.evidenceReferences.minItems, 1);
  assert.match(scriptSource, /--acknowledge-local-write=/);
  assert.match(scriptSource, /controlled approval request/i);
});
