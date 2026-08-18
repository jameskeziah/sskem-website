import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import manifestData from "../content/approval-manifest.json" with { type: "json" };
import {
  createHomepagePosterDeliveryDecisionDownload,
  createHomepagePosterDeliveryDecisionPacket,
  createHomepagePosterDeliveryDecisionPlan,
  homepagePosterDeliveryDecisionContract,
  homepagePosterDeliveryDecisionDigest,
  validateHomepagePosterDeliveryDecisionContract,
} from "../lib/homepage-poster-delivery-decision.ts";
import { inspectHomepagePosterOptimization } from "../lib/homepage-poster-optimization.mjs";

const NOW = "2026-08-17T14:00:00.000Z";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function completedRequest(selectedOption = "authorize-lossless-format-review") {
  const request = structuredClone(createHomepagePosterDeliveryDecisionPacket({ generatedAt: NOW }).requestTemplate);
  request.selectedOption = selectedOption;
  request.acknowledgements = Object.fromEntries(Object.keys(request.acknowledgements).map((key) => [key, true]));
  request.evidenceReferences = ["POSTER-DECISION-2026-001"];
  request.approvedByRole = "school-management";
  request.approvedAt = NOW;
  return request;
}

test("binds the decision contract to the current exact poster and lossless result", async () => {
  const report = await inspectHomepagePosterOptimization();

  assert.deepEqual(validateHomepagePosterDeliveryDecisionContract(), []);
  assert.equal(homepagePosterDeliveryDecisionContract.asset.sourceSha256, report.source.sha256);
  assert.equal(homepagePosterDeliveryDecisionContract.asset.sourceBytes, report.source.bytes);
  assert.equal(homepagePosterDeliveryDecisionContract.losslessBaseline.candidateSha256, report.candidate.sha256);
  assert.equal(homepagePosterDeliveryDecisionContract.losslessBaseline.candidateBytes, report.candidate.bytes);
  assert.equal(homepagePosterDeliveryDecisionContract.losslessBaseline.pixelSha256, report.candidate.pixelSha256);
  assert.equal(homepagePosterDeliveryDecisionContract.losslessBaseline.pixelExact, true);
  assert.equal(homepagePosterDeliveryDecisionContract.losslessBaseline.overageBytes, report.candidate.overageBytes);
  assert.match(homepagePosterDeliveryDecisionDigest(), /^[a-f0-9]{64}$/);
});

test("creates an unfilled, privacy-safe request without mutating the poster or manifest", async () => {
  const posterUrl = new URL("../public/og.png", import.meta.url);
  const manifestUrl = new URL("../content/approval-manifest.json", import.meta.url);
  const [posterBefore, manifestBefore] = await Promise.all([readFile(posterUrl), readFile(manifestUrl)]);
  const download = createHomepagePosterDeliveryDecisionDownload({ generatedAt: NOW });
  const [posterAfter, manifestAfter] = await Promise.all([readFile(posterUrl), readFile(manifestUrl)]);
  const packet = JSON.parse(download.body);

  assert.equal(download.filename, "sskem-homepage-poster-delivery-decision-2026-08-17.json");
  assert.equal(packet.status, "decision-required");
  assert.equal(packet.currentAsset.sourceSha256, sha256(posterBefore));
  assert.equal(packet.options.length, 4);
  assert.equal(packet.requestTemplate.selectedOption, null);
  assert.ok(Object.values(packet.requestTemplate.acknowledgements).every((value) => value === null));
  assert.deepEqual(packet.requestTemplate.evidenceReferences, []);
  assert.equal(packet.requestTemplate.approvedByRole, null);
  assert.equal(packet.requestTemplate.approvedAt, null);
  assert.equal(packet.guardrails.optionPreselected, false);
  assert.equal(packet.guardrails.candidateGenerated, false);
  assert.equal(packet.guardrails.approvalGrantedByPacket, false);
  assert.equal(sha256(posterAfter), sha256(posterBefore));
  assert.equal(sha256(manifestAfter), sha256(manifestBefore));
  assert.doesNotMatch(download.body, /sourcePointer|publicTargets|[a-z]:\\|file:\/\/|@[a-z0-9.-]+\.[a-z]{2,}/i);
});

test("keeps every decision option review-only and unselected", () => {
  const packet = createHomepagePosterDeliveryDecisionPacket({ generatedAt: NOW });
  const byId = new Map(packet.options.map((option) => [option.id, option]));

  assert.equal(byId.get("hold-current-png").formatChangeReviewAllowed, false);
  assert.equal(byId.get("authorize-lossless-format-review").pixelChangeReviewAllowed, false);
  assert.equal(byId.get("authorize-controlled-encoding-review").pixelChangeReviewAllowed, true);
  assert.equal(byId.get("commission-artwork-revision-brief").artworkRevisionBriefAllowed, true);
  assert.ok(packet.options.every((option) => !("publicActivationAllowed" in option)));
  assert.ok(Object.values(packet.constraints).every((value) => value === false));
  assert.match(packet.approvalBoundary.instruction, /does not approve or publish/i);
});

test("turns an exact completed request into a privacy-safe read-only plan", async () => {
  const posterUrl = new URL("../public/og.png", import.meta.url);
  const manifestUrl = new URL("../content/approval-manifest.json", import.meta.url);
  const [posterBefore, manifestBefore] = await Promise.all([readFile(posterUrl), readFile(manifestUrl)]);
  const plan = createHomepagePosterDeliveryDecisionPlan({ request: completedRequest(), now: NOW });
  const [posterAfter, manifestAfter] = await Promise.all([readFile(posterUrl), readFile(manifestUrl)]);

  assert.equal(plan.status, "ready-for-controlled-recording");
  assert.deepEqual(plan.blockers, []);
  assert.equal(plan.selection.id, "authorize-lossless-format-review");
  assert.equal(plan.selection.disposition, "private-lossless-format-review-authorized");
  assert.equal(plan.selection.formatChangeReviewAllowed, true);
  assert.equal(plan.selection.pixelChangeReviewAllowed, false);
  assert.equal(plan.selection.publicActivationAllowed, false);
  assert.equal(plan.controlledRecord.evidenceReferencesRecorded, 1);
  assert.equal(plan.guardrails.localWritePerformed, false);
  assert.equal(plan.guardrails.decisionRecordedByTool, false);
  assert.equal(plan.guardrails.candidateGenerated, false);
  assert.equal(plan.guardrails.publicationApprovalGranted, false);
  assert.equal(sha256(posterAfter), sha256(posterBefore));
  assert.equal(sha256(manifestAfter), sha256(manifestBefore));
  assert.doesNotMatch(JSON.stringify(plan), /POSTER-DECISION-2026-001|sourcePointer|publicTargets/i);
});

test("projects only the authority of the exact selected option", () => {
  const expectations = {
    "hold-current-png": "no-implementation-authorized",
    "authorize-lossless-format-review": "private-lossless-format-review-authorized",
    "authorize-controlled-encoding-review": "private-controlled-encoding-review-authorized",
    "commission-artwork-revision-brief": "separate-artwork-brief-authorized",
  };

  for (const [selectedOption, disposition] of Object.entries(expectations)) {
    const plan = createHomepagePosterDeliveryDecisionPlan({ request: completedRequest(selectedOption), now: NOW });
    assert.equal(plan.status, "ready-for-controlled-recording");
    assert.equal(plan.selection.id, selectedOption);
    assert.equal(plan.selection.disposition, disposition);
    assert.equal(plan.selection.publicActivationAllowed, false);
  }
});

test("blocks stale, incomplete, identity-bearing and future-dated requests", () => {
  const request = completedRequest();
  request.expectedDecisionContractDigest = "0".repeat(64);
  request.expectedApprovalRecordDigest = "1".repeat(64);
  request.acknowledgements.performanceBudgetRemainsFixed = false;
  request.evidenceReferences = ["C:\\private\\evidence.pdf"];
  request.approvedByRole = "reviewer@example.test";
  request.approvedAt = "2026-08-18T14:00:00.000Z";
  request.unreviewedAuthority = true;

  const plan = createHomepagePosterDeliveryDecisionPlan({ request, now: NOW });
  const blockers = plan.blockers.join("\n");
  assert.equal(plan.status, "blocked");
  assert.match(blockers, /unknown field unreviewedAuthority/i);
  assert.match(blockers, /contract changed.*fresh request/i);
  assert.match(blockers, /approval record changed.*fresh request/i);
  assert.match(blockers, /performanceBudgetRemainsFixed.*explicitly true/i);
  assert.match(blockers, /opaque controlled-record references only/i);
  assert.match(blockers, /lowercase role identifier, never an approver identity/i);
  assert.match(blockers, /cannot be in the future/i);
  assert.equal(plan.guardrails.localWritePerformed, false);
  assert.equal(plan.guardrails.candidateGenerated, false);
});

test("fails closed when the source baseline, option authority or manifest record drifts", () => {
  const changedSource = structuredClone(homepagePosterDeliveryDecisionContract);
  changedSource.asset.sourceSha256 = "0".repeat(64);
  assert.throws(
    () => createHomepagePosterDeliveryDecisionPacket({ generatedAt: NOW, contract: changedSource }),
    /asset baseline is invalid/i,
  );

  const expandedAuthority = structuredClone(homepagePosterDeliveryDecisionContract);
  expandedAuthority.options[1].pixelChangeReviewAllowed = true;
  assert.throws(
    () => createHomepagePosterDeliveryDecisionPacket({ generatedAt: NOW, contract: expandedAuthority }),
    /invalid authority/i,
  );

  const changedManifest = structuredClone(manifestData);
  changedManifest.records.find((record) => record.id === "media-homepage-social-poster").sourcePointer = "public/replacement.png";
  assert.throws(
    () => createHomepagePosterDeliveryDecisionPacket({ generatedAt: NOW, manifest: changedManifest }),
    /drifted from the exact homepage\/social asset/i,
  );
});

test("publishes both schemas, plan-only commands, authenticated route and private-review action", async () => {
  const [schemaText, requestSchemaText, packageText, route, page, guide, planner] = await Promise.all([
    readFile(new URL("../content/homepage-poster-delivery-decision.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../content/homepage-poster-delivery-decision-request.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/poster-delivery-decision/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/publication-review/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../docs/homepage-poster-optimization.md", import.meta.url), "utf8"),
    readFile(new URL("../scripts/plan-homepage-poster-delivery-decision.mjs", import.meta.url), "utf8"),
  ]);
  const schema = JSON.parse(schemaText);
  const requestSchema = JSON.parse(requestSchemaText);
  const scripts = JSON.parse(packageText).scripts;

  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.constraints.properties.publicActivationAllowed.const, false);
  assert.equal(requestSchema.additionalProperties, false);
  assert.equal(requestSchema.properties.acknowledgements.properties.publicationApprovalRemainsSeparate.const, true);
  assert.equal(requestSchema.properties.evidenceReferences.minItems, 1);
  assert.match(scripts["poster:decision-request"], /create-homepage-poster-delivery-decision/);
  assert.match(scripts["poster:decision-plan"], /plan-homepage-poster-delivery-decision/);
  assert.match(scripts["test:contract"], /homepage-poster-delivery-decision\.test\.mjs/);
  assert.match(route, /getChatGPTUser/);
  assert.match(route, /private, no-store/);
  assert.match(route, /default-src 'none'; sandbox/);
  assert.match(page, /Complete decision worksheet/);
  assert.match(page, /Download blank poster packet/);
  assert.match(guide, /poster:decision-request/);
  assert.match(guide, /poster:decision-plan/);
  assert.match(planner, /has no apply mode/);
  assert.doesNotMatch(planner, /writeFile|rename|--apply[^"].*true/i);
});
