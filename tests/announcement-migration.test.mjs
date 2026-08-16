import assert from "node:assert/strict";
import test from "node:test";

import {
  announcementIntakeConfig,
  createAnnouncementMigrationPacket,
  validateAnnouncementIntakeConfig,
} from "../lib/cms/announcement-migration.ts";

const NOW = "2026-08-16T06:00:00.000Z";

function readyConfig(approvalRecordId = "claim-homepage-announcement") {
  const config = structuredClone(announcementIntakeConfig);
  config.sourceStatus = "candidate-ready";
  config.approvalRecordId = approvalRecordId;
  config.candidate = {
    title: "School office update",
    message: "The school office has issued this dated public information for families.",
    href: "/about/news",
  };
  return config;
}

function claim(decision = "approved") {
  return { id: "claim-homepage-announcement", kind: "claim", title: "Homepage announcement", decision, expiresAt: null };
}

test("keeps the first announcement source-required without inventing placeholder copy", () => {
  assert.deepEqual(validateAnnouncementIntakeConfig(announcementIntakeConfig), []);
  const packet = createAnnouncementMigrationPacket({ now: NOW });

  assert.equal(packet.status, "source-required");
  assert.equal(packet.candidate, null);
  assert.equal(packet.sanityDraft, null);
  assert.deepEqual(packet.blockingRequirements, ["authoritative-announcement-source", "matching-claim-approval-record"]);
  assert.deepEqual(packet.blockingApprovalRecordIds, []);
  assert.deepEqual(packet.guardrails, {
    externalWritePerformed: false,
    publicationState: "draft",
    privateDataIncluded: false,
    placeholderCopyIncluded: false,
    approvalGrantedByPacket: false,
  });
  assert.doesNotMatch(JSON.stringify(packet), /admissions are open|apply now|approvedByRole|evidenceReferences/i);
});

test("requires a matching manifest claim after authoritative copy is supplied", () => {
  const packet = createAnnouncementMigrationPacket({ config: readyConfig(null), now: NOW });

  assert.equal(packet.status, "approval-record-required");
  assert.equal(packet.sanityDraft._type, "announcement");
  assert.equal(packet.sanityDraft.publication.state, "draft");
  assert.equal("approvalRecordIds" in packet.sanityDraft.publication, false);
  assert.deepEqual(packet.blockingRequirements, ["matching-claim-approval-record"]);
});

test("reports review readiness only when the exact announcement claim is current and approved", () => {
  const blocked = createAnnouncementMigrationPacket({
    config: readyConfig(),
    manifest: { records: [claim("blocked")] },
    now: NOW,
  });
  assert.equal(blocked.status, "review-required");
  assert.deepEqual(blocked.blockingApprovalRecordIds, ["claim-homepage-announcement"]);

  const approved = createAnnouncementMigrationPacket({
    config: readyConfig(),
    manifest: { records: [claim()] },
    now: NOW,
  });
  assert.equal(approved.status, "ready-for-manual-draft");
  assert.deepEqual(approved.blockingRequirements, []);
  assert.deepEqual(approved.sanityDraft.publication.approvalRecordIds, ["claim-homepage-announcement"]);
});

test("rejects placeholder content in awaiting-source mode and unsafe candidate links", () => {
  const placeholder = structuredClone(announcementIntakeConfig);
  placeholder.candidate.title = "Admissions open";
  assert.ok(validateAnnouncementIntakeConfig(placeholder).some((issue) => issue.includes("placeholder announcement copy")));

  const unsafe = readyConfig();
  unsafe.candidate.href = "javascript:alert(1)";
  assert.ok(validateAnnouncementIntakeConfig(unsafe).some((issue) => issue.includes("internal path or an HTTPS URL")));

  const credentials = readyConfig();
  credentials.candidate.href = "https://user:password@example.com/update";
  assert.ok(validateAnnouncementIntakeConfig(credentials).some((issue) => issue.includes("internal path or an HTTPS URL")));
});
