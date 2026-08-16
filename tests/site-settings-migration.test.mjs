import assert from "node:assert/strict";
import test from "node:test";

import { siteFacts } from "../app/data/site.ts";
import {
  createSiteSettingsMigrationPacket,
  siteSettingsMigrationConfig,
  validateSiteSettingsMigrationConfig,
} from "../lib/cms/site-settings-migration.ts";

const NOW = "2026-08-16T06:00:00.000Z";

function claim(id, decision = "approved") {
  return { id, kind: "claim", title: id, decision, expiresAt: null };
}

test("maps every public siteSettings field to its controlling claim without an external write", () => {
  assert.deepEqual(validateSiteSettingsMigrationConfig(siteSettingsMigrationConfig), []);
  const packet = createSiteSettingsMigrationPacket({ now: NOW });

  assert.equal(packet.status, "review-required");
  assert.equal(packet.fieldComparison.length, 7);
  assert.deepEqual(packet.sanityDraft.publication.approvalRecordIds, ["claim-complete-address", "claim-public-contact"]);
  assert.equal(packet.sanityDraft.publication.state, "draft");
  assert.deepEqual(packet.sanityDraft.contact, {
    location: siteFacts.location,
    phone: siteFacts.phone,
    mobile: siteFacts.mobile,
    email: siteFacts.email,
    principalEmail: siteFacts.principalEmail,
    workingHours: siteFacts.workingHours,
  });
  assert.deepEqual(packet.blockingApprovalRecordIds, ["claim-complete-address", "claim-public-contact"]);
  assert.deepEqual(packet.guardrails, {
    externalWritePerformed: false,
    publicationState: "draft",
    privateDataIncluded: false,
    approvalGrantedByPacket: false,
  });
  assert.doesNotMatch(JSON.stringify(packet), /approvedByRole|evidenceReferences|SANITY_PROJECT_ID|token/i);
});

test("marks the packet ready for a manual draft only when both controlling claims are approved", () => {
  const packet = createSiteSettingsMigrationPacket({
    now: NOW,
    manifest: { records: [claim("claim-complete-address"), claim("claim-public-contact")] },
  });

  assert.equal(packet.status, "ready-for-manual-draft");
  assert.deepEqual(packet.blockingApprovalRecordIds, []);
  assert.ok(packet.fieldComparison.every((field) => field.approvalCurrent));
});

test("rejects incomplete or redirected siteSettings field maps", () => {
  const incomplete = structuredClone(siteSettingsMigrationConfig);
  incomplete.fields = incomplete.fields.slice(1);
  assert.ok(validateSiteSettingsMigrationConfig(incomplete).some((issue) => issue.includes("contact.location")));

  const redirected = structuredClone(siteSettingsMigrationConfig);
  redirected.sourcePointer = "legacy-wordpress/contact";
  assert.ok(validateSiteSettingsMigrationConfig(redirected).some((issue) => issue.includes("reviewed local siteFacts")));
});
