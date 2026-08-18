import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createHomepagePosterDeliveryDecisionPacket,
} from "../lib/homepage-poster-delivery-decision.ts";
import {
  createHomepagePosterDeliveryDecisionBindingProposal,
  homepagePosterDeliveryDecisionBindingRegistry,
  homepagePosterDeliveryDecisionBindingSummary,
  validateHomepagePosterDeliveryDecisionBindingRegistry,
} from "../lib/homepage-poster-delivery-decision-binding.ts";
import {
  createHomepagePosterDeliveryDecisionBindingPlan,
  executeHomepagePosterDeliveryDecisionBinding,
  POSTER_DECISION_BINDING_ACKNOWLEDGEMENT,
} from "../lib/homepage-poster-delivery-decision-binding-recorder.ts";

const NOW = "2026-08-18T10:00:00.000Z";
const APPROVED_AT = "2026-08-18T09:00:00.000Z";

function completedRequest(selectedOption = "authorize-lossless-format-review", decisionReference = "POSTER-DECISION-2026-001") {
  const request = structuredClone(createHomepagePosterDeliveryDecisionPacket({ generatedAt: NOW }).requestTemplate);
  request.selectedOption = selectedOption;
  request.acknowledgements = Object.fromEntries(Object.keys(request.acknowledgements).map((key) => [key, true]));
  request.evidenceReferences = [decisionReference, "POSTER-REVIEW-MINUTES-2026-001"];
  request.approvedByRole = "school-management";
  request.approvedAt = APPROVED_AT;
  return request;
}

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sskem-poster-decision-binding-"));
  const registryPath = path.join(root, "homepage-poster-delivery-decision-bindings.json");
  await writeFile(registryPath, `${JSON.stringify(homepagePosterDeliveryDecisionBindingRegistry, null, 2)}\n`, "utf8");
  context.after(() => rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }));
  return { registryPath };
}

test("keeps the canonical decision registry empty, valid and non-authorizing", () => {
  assert.deepEqual(validateHomepagePosterDeliveryDecisionBindingRegistry({ now: NOW }), []);
  const summary = homepagePosterDeliveryDecisionBindingSummary({ now: NOW });
  assert.equal(summary.valid, 0);
  assert.equal(summary.required, 1);
  assert.equal(summary.ready, false);
  assert.equal(summary.status, "decision-not-recorded");
  assert.equal(summary.selectedOption, null);
  assert.equal(homepagePosterDeliveryDecisionBindingRegistry.policy.publicActivationAllowed, false);
});

test("creates an exact public-safe binding proposal from one validated request", () => {
  const request = completedRequest();
  const proposal = createHomepagePosterDeliveryDecisionBindingProposal({ request, now: NOW });

  assert.match(proposal.bindingId, /^poster-decision-[a-f0-9]{12}$/);
  assert.equal(proposal.selectedOption, "authorize-lossless-format-review");
  assert.equal(proposal.authority.formatChangeReviewAllowed, true);
  assert.equal(proposal.authority.pixelChangeReviewAllowed, false);
  assert.equal(proposal.authority.publicActivationAllowed, false);
  assert.equal(proposal.decisionReference, "POSTER-DECISION-2026-001");
  assert.equal(proposal.approvedByRole, "school-management");
  assert.doesNotMatch(JSON.stringify(proposal), /POSTER-REVIEW-MINUTES|sourcePointer|publicTargets|[a-z]:\\|file:\/\//i);
});

test("plans first, requires acknowledgement and records only the exact scope atomically", async (context) => {
  const { registryPath } = await fixture(context);
  const request = completedRequest();
  const options = { request, registryPath, now: NOW };

  const planned = await executeHomepagePosterDeliveryDecisionBinding(options);
  assert.equal(planned.mode, "local-plan");
  assert.equal(planned.plan.status, "ready-for-explicit-write");
  assert.equal(planned.plan.guardrails.localWritePerformed, false);
  assert.equal(planned.plan.guardrails.candidateGenerated, false);
  assert.equal(planned.plan.guardrails.publicationApprovalGranted, false);
  assert.equal(JSON.parse(await readFile(registryPath, "utf8")).bindings.length, 0);

  await assert.rejects(
    executeHomepagePosterDeliveryDecisionBinding({ ...options, apply: true, acknowledgement: "wrong" }),
    /requires --acknowledge-local-write.*No registry write/i,
  );
  assert.equal(JSON.parse(await readFile(registryPath, "utf8")).bindings.length, 0);

  const applied = await executeHomepagePosterDeliveryDecisionBinding({
    ...options,
    apply: true,
    acknowledgement: POSTER_DECISION_BINDING_ACKNOWLEDGEMENT,
  });
  assert.equal(applied.mode, "local-registry-write");
  assert.equal(applied.receipt.selectedOption, "authorize-lossless-format-review");
  const registry = JSON.parse(await readFile(registryPath, "utf8"));
  assert.equal(registry.bindings.length, 1);
  assert.deepEqual(validateHomepagePosterDeliveryDecisionBindingRegistry({ registry, now: NOW }), []);
  assert.equal(homepagePosterDeliveryDecisionBindingSummary({ registry, now: NOW }).ready, true);

  const later = "2026-08-18T11:00:00.000Z";
  assert.equal((await createHomepagePosterDeliveryDecisionBindingPlan({ request, registryPath, now: later })).status, "already-recorded");
  assert.equal((await executeHomepagePosterDeliveryDecisionBinding({ request, registryPath, now: later, apply: true })).mode, "no-change");
});

test("blocks silent replacement, expanded authority and stale digests", async (context) => {
  const { registryPath } = await fixture(context);
  const first = completedRequest();
  await executeHomepagePosterDeliveryDecisionBinding({
    request: first,
    registryPath,
    now: NOW,
    apply: true,
    acknowledgement: POSTER_DECISION_BINDING_ACKNOWLEDGEMENT,
  });
  const activeRegistry = await readFile(registryPath, "utf8");

  const replacement = completedRequest("authorize-controlled-encoding-review", "POSTER-DECISION-2026-002");
  const blocked = await createHomepagePosterDeliveryDecisionBindingPlan({ request: replacement, registryPath, now: NOW });
  assert.equal(blocked.status, "blocked");
  assert.match(blocked.blockers.join(" "), /different poster delivery decision binding.*--replace/i);
  assert.equal(await readFile(registryPath, "utf8"), activeRegistry);

  const registry = JSON.parse(activeRegistry);
  registry.bindings[0].authority.pixelChangeReviewAllowed = true;
  assert.match(validateHomepagePosterDeliveryDecisionBindingRegistry({ registry, now: NOW }).join("\n"), /authority exceeds or differs/i);
  registry.bindings[0].authority.pixelChangeReviewAllowed = false;
  registry.bindings[0].decisionContractDigest = "0".repeat(64);
  assert.match(validateHomepagePosterDeliveryDecisionBindingRegistry({ registry, now: NOW }).join("\n"), /contract digest is stale/i);
});

test("publishes a matching schema, audit and guarded recorder command", async () => {
  const [schemaText, packageText, publicSummaryLibrary, decisionLibrary, recorder, recorderLibrary, audit, guide] = await Promise.all([
    readFile(new URL("../content/homepage-poster-delivery-decision-bindings.schema.json", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../lib/homepage-poster-delivery-decision-binding.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/homepage-poster-delivery-decision.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/record-homepage-poster-delivery-decision.mjs", import.meta.url), "utf8"),
    readFile(new URL("../lib/homepage-poster-delivery-decision-binding-recorder.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/audit-homepage-poster-delivery-decision-bindings.mjs", import.meta.url), "utf8"),
    readFile(new URL("../docs/homepage-poster-optimization.md", import.meta.url), "utf8"),
  ]);
  const schema = JSON.parse(schemaText);
  const scripts = JSON.parse(packageText).scripts;

  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.bindings.maxItems, 1);
  assert.equal(schema.$defs.authority.properties.publicActivationAllowed.const, false);
  assert.match(scripts["poster:decision-record"], /record-homepage-poster-delivery-decision/);
  assert.match(scripts["poster:decision-bindings:audit"], /audit-homepage-poster-delivery-decision-bindings/);
  assert.match(scripts.prebuild, /poster:decision-bindings:audit/);
  assert.match(scripts["test:contract"], /homepage-poster-delivery-decision-binding\.test\.mjs/);
  assert.match(recorder, /POSTER_DECISION_BINDING_ACKNOWLEDGEMENT/);
  assert.match(recorderLibrary, /record-controlled-poster-delivery-decision/);
  assert.doesNotMatch(`${publicSummaryLibrary}\n${decisionLibrary}`, /node:fs|node:path|writeFile|rename\(|approval-manifest-update/);
  assert.match(audit, /homepagePosterDeliveryDecisionBindingSummary/);
  assert.match(guide, /poster:decision-record/);
});
