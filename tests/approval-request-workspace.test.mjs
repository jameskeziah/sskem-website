import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import manifestData from "../content/approval-manifest.json" with { type: "json" };
import { createApprovalUpdatePlan } from "../lib/approval-manifest-update.mjs";
import { createApprovalRequestDownload } from "../lib/approval-request-download.ts";
import {
  APPROVAL_REQUEST_WORKSPACE_CONFIRMATION,
  createApprovalRequestCompletion,
} from "../lib/approval-request-workspace.ts";

const NOW = "2026-08-18T12:00:00.000Z";

function validInput(template) {
  return {
    checks: Object.fromEntries(Object.keys(template.checks).map((check) => [check, "verified"])),
    evidenceReferences: [`CONTROLLED/${template.recordId.toUpperCase()}`],
    approvedByRole: "school-management",
    expiryChoice: template.expiresAt === null ? "none" : "retain",
    expiresAt: "",
    approvalConfirmation: APPROVAL_REQUEST_WORKSPACE_CONFIRMATION,
  };
}

test("creates a planner-compatible completed request for every canonical record", () => {
  for (const record of manifestData.records) {
    const template = createApprovalRequestDownload(record.id).request;
    const completion = createApprovalRequestCompletion({ template, input: validInput(template), now: NOW });
    const request = JSON.parse(completion.body);
    const plan = createApprovalUpdatePlan({ manifest: manifestData, request, now: NOW });

    assert.equal(completion.validation.status, "ready-for-local-planner");
    assert.equal(completion.validation.recordId, record.id);
    assert.equal(request.expectedRecordDigest, template.expectedRecordDigest);
    assert.equal(request.approvedAt, NOW);
    assert.equal(plan.status, "ready-for-explicit-write", `${record.id}: ${plan.blockers.join(" ")}`);
    assert.deepEqual(completion.guardrails, {
      networkRequestPerformed: false,
      serverPersistencePerformed: false,
      manifestWritePerformed: false,
      approvalGrantedByWorkspace: false,
      privateEvidenceIncluded: false,
      approverIdentityIncluded: false,
    });
    assert.doesNotMatch(completion.body, /sourcePointer|publicTargets|reviewer@example|[a-z]:\\|file:\/\//i);
  }
});

test("requires every deliberate decision and rejects identity or location data", () => {
  const template = createApprovalRequestDownload("media-campus-main").request;
  const input = validInput(template);

  assert.throws(
    () => createApprovalRequestCompletion({ template, input: { ...input, approvalConfirmation: null }, now: NOW }),
    /explicit final confirmation/i,
  );
  assert.throws(
    () => createApprovalRequestCompletion({ template, input: { ...input, checks: { ...input.checks, privacy: "" } }, now: NOW }),
    /choose verified or not applicable for privacy/i,
  );
  assert.throws(
    () => createApprovalRequestCompletion({ template, input: { ...input, expiryChoice: null }, now: NOW }),
    /choose deliberately whether this approval expires/i,
  );
  assert.throws(
    () => createApprovalRequestCompletion({ template, input: { ...input, evidenceReferences: ["C:/PRIVATE/CONSENT.PDF"] }, now: NOW }),
    /never paths, URLs, names or evidence text/i,
  );
  assert.throws(
    () => createApprovalRequestCompletion({ template, input: { ...input, approvedByRole: "James Smith" }, now: NOW }),
    /never an approver name or identity/i,
  );
});

test("keeps every completion workspace authenticated, unselected and browser-only", async () => {
  const [page, client, dashboard, sitemap] = await Promise.all([
    readFile(new URL("../app/publication-review/approval-request-workspace/[recordId]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/approval-request-workspace/[recordId]/workspace-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /requireChatGPTUser\(`\/publication-review\/approval-request-workspace\/\$\{record\.id\}`\)/);
  assert.match(page, /sends no decision data to the server/i);
  assert.match(client, /^"use client"/);
  assert.match(client, /Nothing is preselected/);
  assert.match(client, /defaultValue="" required/);
  assert.doesNotMatch(client, /defaultChecked|checked=\{true\}/);
  assert.match(client, /event\.preventDefault\(\)/);
  assert.match(client, /URL\.createObjectURL\(new Blob/);
  assert.match(client, /download\.click\(\)/);
  assert.doesNotMatch(client, /fetch\(|method=["']post|localStorage|sessionStorage/i);
  assert.match(dashboard, /Complete request/);
  assert.match(dashboard, /\/publication-review\/approval-request-workspace\/\$\{record\.id\}/);
  assert.doesNotMatch(sitemap, /approval-request-workspace/);
});
