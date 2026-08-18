import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createHomepagePosterDeliveryDecisionCompletion,
  POSTER_DECISION_WORKSPACE_CONFIRMATION,
} from "../lib/homepage-poster-delivery-decision-workspace.ts";
import {
  createHomepagePosterDeliveryDecisionPacket,
  createHomepagePosterDeliveryDecisionPlan,
} from "../lib/homepage-poster-delivery-decision.ts";

const NOW = "2026-08-18T12:00:00.000Z";

function validInput(selectedOption = "authorize-lossless-format-review") {
  return {
    selectedOption,
    acknowledgements: {
      artworkAndSourceRemainUnchanged: true,
      performanceBudgetRemainsFixed: true,
      reviewCandidatesRemainPrivate: true,
      publicationApprovalRemainsSeparate: true,
    },
    evidenceReferences: ["POSTER-DECISION-2026-001", "POSTER-REVIEW-MINUTES-2026-001"],
    approvedByRole: "school-management",
    decisionConfirmation: POSTER_DECISION_WORKSPACE_CONFIRMATION,
  };
}

test("creates a current, validated completed packet without persisting or authorizing publication", () => {
  const template = createHomepagePosterDeliveryDecisionPacket({ generatedAt: NOW }).requestTemplate;
  const completion = createHomepagePosterDeliveryDecisionCompletion({ template, input: validInput(), now: NOW });
  const downloaded = JSON.parse(completion.body);

  assert.equal(completion.validation.status, "ready-for-local-planner");
  assert.equal(completion.validation.selectedOption, "authorize-lossless-format-review");
  assert.equal(downloaded.approvedAt, NOW);
  assert.deepEqual(downloaded.evidenceReferences, validInput().evidenceReferences);
  assert.equal(createHomepagePosterDeliveryDecisionPlan({ request: downloaded, now: NOW }).status, "ready-for-controlled-recording");
  assert.deepEqual(completion.guardrails, {
    networkRequestPerformed: false,
    serverPersistencePerformed: false,
    bindingRecorded: false,
    candidateGenerated: false,
    sourceModified: false,
    publicWritePerformed: false,
    publicationApprovalGranted: false,
    approverIdentityIncluded: false,
  });
  assert.doesNotMatch(completion.body, /sourcePointer|publicTargets|reviewer@example|[a-z]:\\|file:\/\//i);
});

test("requires explicit final confirmation and every canonical decision field", () => {
  const template = createHomepagePosterDeliveryDecisionPacket({ generatedAt: NOW }).requestTemplate;
  assert.throws(
    () => createHomepagePosterDeliveryDecisionCompletion({ template, input: { ...validInput(), decisionConfirmation: null }, now: NOW }),
    /requires explicit confirmation/i,
  );
  assert.throws(
    () => createHomepagePosterDeliveryDecisionCompletion({ template, input: { ...validInput(), selectedOption: null }, now: NOW }),
    /requires one exact canonical option/i,
  );
  assert.throws(
    () => createHomepagePosterDeliveryDecisionCompletion({ template, input: { ...validInput(), evidenceReferences: ["C:/private/minutes.pdf"] }, now: NOW }),
    /opaque controlled-record references only/i,
  );
});

test("keeps the worksheet private, unselected and download-only", async () => {
  const [page, client, dashboard, sitemap] = await Promise.all([
    readFile(new URL("../app/publication-review/poster-delivery-decision-workspace/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/poster-delivery-decision-workspace/decision-workspace-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /requireChatGPTUser\("\/publication-review\/poster-delivery-decision-workspace"\)/);
  assert.match(page, /sends no decision data to the server/);
  assert.match(client, /^"use client"/);
  assert.match(client, /No option is preselected/);
  assert.match(client, /name="selectedOption" value=\{option\.id\} required/);
  assert.doesNotMatch(client, /defaultChecked|checked=\{true\}/);
  assert.match(client, /event\.preventDefault\(\)/);
  assert.match(client, /URL\.createObjectURL\(new Blob/);
  assert.match(client, /download\.click\(\)/);
  assert.doesNotMatch(client, /fetch\(|method=["']post|poster-delivery-decision-completed/i);
  assert.match(dashboard, /Complete decision worksheet/);
  assert.doesNotMatch(sitemap, /poster-delivery-decision-workspace/);
});
