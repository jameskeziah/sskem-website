import assert from "node:assert/strict";
import test from "node:test";

import {
  createSiteSettingsImportPlan,
  executeSiteSettingsDraftImport,
  SITE_SETTINGS_DRAFT_ID,
  SITE_SETTINGS_IMPORT_ACKNOWLEDGEMENT,
} from "../lib/cms/site-settings-import.ts";

const NOW = "2026-08-16T06:00:00.000Z";
const approvedManifest = {
  records: [
    { id: "claim-complete-address", kind: "claim", title: "Address", decision: "approved", expiresAt: null },
    { id: "claim-public-contact", kind: "claim", title: "Contact", decision: "approved", expiresAt: null },
  ],
};
const readyMigration = { now: NOW, manifest: approvedManifest };
const importEnvironment = {
  SANITY_PROJECT_ID: "abc123xy",
  SANITY_DATASET: "production",
  SANITY_API_VERSION: "2026-08-12",
  SANITY_IMPORT_TOKEN: "test-secret-token",
};

test("builds a create-only local plan while the canonical claims remain blocked", () => {
  const plan = createSiteSettingsImportPlan({ now: NOW });

  assert.equal(plan.status, "blocked");
  assert.deepEqual(plan.blockingApprovalRecordIds, ["claim-complete-address", "claim-public-contact"]);
  assert.equal(plan.target.draftDocumentId, SITE_SETTINGS_DRAFT_ID);
  assert.equal(plan.mutation.mutations[0].create._id, SITE_SETTINGS_DRAFT_ID);
  assert.equal(plan.mutation.mutations[0].create.publication.state, "draft");
  assert.equal("createOrReplace" in plan.mutation.mutations[0], false);
  assert.deepEqual(plan.guardrails, {
    externalWritePerformed: false,
    defaultMode: "local-plan",
    mutationType: "create",
    overwriteAllowed: false,
    publicationState: "draft",
    privateDataIncluded: false,
    approvalGrantedByImporter: false,
  });
  assert.doesNotMatch(JSON.stringify(plan), /SANITY_IMPORT_TOKEN|approvedByRole|evidenceReferences/i);
});

test("the default execution mode never calls Sanity even when claims are ready", async () => {
  let requests = 0;
  const result = await executeSiteSettingsDraftImport({
    migration: readyMigration,
    fetchImpl: async () => {
      requests += 1;
      throw new Error("Unexpected request");
    },
  });

  assert.equal(result.mode, "local-plan");
  assert.equal(result.plan.status, "ready-for-explicit-write");
  assert.equal(requests, 0);
});

test("apply refuses blocked claims and a missing exact acknowledgement before any request", async () => {
  let requests = 0;
  const fetchImpl = async () => {
    requests += 1;
    throw new Error("Unexpected request");
  };

  await assert.rejects(
    executeSiteSettingsDraftImport({ apply: true, acknowledgement: SITE_SETTINGS_IMPORT_ACKNOWLEDGEMENT, environment: importEnvironment, fetchImpl, migration: { now: NOW } }),
    /blocked by: claim-complete-address, claim-public-contact.*No external request was made/,
  );
  await assert.rejects(
    executeSiteSettingsDraftImport({ apply: true, environment: importEnvironment, fetchImpl, migration: readyMigration }),
    /requires --acknowledge-external-write=.*No external request was made/,
  );
  await assert.rejects(
    executeSiteSettingsDraftImport({ apply: true, acknowledgement: SITE_SETTINGS_IMPORT_ACKNOWLEDGEMENT, environment: {}, fetchImpl, migration: readyMigration }),
    /configuration failed:.*SANITY_PROJECT_ID.*SANITY_DATASET.*SANITY_IMPORT_TOKEN/,
  );
  assert.equal(requests, 0);
});

test("an explicitly authorised ready import creates exactly one new draft and returns a token-free receipt", async () => {
  const requests = [];
  const result = await executeSiteSettingsDraftImport({
    apply: true,
    acknowledgement: SITE_SETTINGS_IMPORT_ACKNOWLEDGEMENT,
    environment: importEnvironment,
    migration: readyMigration,
    fetchImpl: async (input, init) => {
      requests.push({ input: String(input), init });
      return new Response(JSON.stringify({
        transactionId: "transaction-123",
        results: [{ operation: "create", documentId: SITE_SETTINGS_DRAFT_ID }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });

  assert.equal(requests.length, 1);
  assert.match(requests[0].input, /^https:\/\/abc123xy\.api\.sanity\.io\/v2026-08-12\/data\/mutate\/production\?/);
  assert.match(requests[0].input, /returnDocuments=true/);
  assert.equal(requests[0].init.method, "POST");
  assert.equal(requests[0].init.headers.authorization, "Bearer test-secret-token");
  const body = JSON.parse(requests[0].init.body);
  assert.deepEqual(Object.keys(body.mutations[0]), ["create"]);
  assert.equal(body.mutations[0].create._id, SITE_SETTINGS_DRAFT_ID);
  assert.equal(body.mutations[0].create.publication.state, "draft");
  assert.equal(result.mode, "external-create");
  assert.equal(result.receipt.transactionId, "transaction-123");
  assert.equal(result.receipt.externalWritePerformed, true);
  assert.equal(result.receipt.overwriteAllowed, false);
  assert.doesNotMatch(JSON.stringify(result), /test-secret-token|authorization/i);
});

test("a rejected create is not retried or converted into an overwrite", async () => {
  let requests = 0;
  await assert.rejects(
    executeSiteSettingsDraftImport({
      apply: true,
      acknowledgement: SITE_SETTINGS_IMPORT_ACKNOWLEDGEMENT,
      environment: importEnvironment,
      migration: readyMigration,
      fetchImpl: async () => {
        requests += 1;
        return new Response("draft exists", { status: 409 });
      },
    }),
    /HTTP 409.*No overwrite was attempted/,
  );
  assert.equal(requests, 1);
});
