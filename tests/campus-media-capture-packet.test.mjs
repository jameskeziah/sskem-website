import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import manifestData from "../content/approval-manifest.json" with { type: "json" };
import pipelineData from "../content/campus-media-pipeline.json" with { type: "json" };
import { createCampusMediaCapturePacket } from "../lib/campus-media-capture-packet.ts";
import {
  campusMediaPublicationRegistry,
  createCampusMediaBindingProposal,
} from "../lib/campus-media-publication.ts";

const NOW = "2026-08-17T10:00:00.000Z";
const recordIds = [
  "media-campus-main",
  "media-campus-grounds",
  "media-campus-entrance",
  "media-campus-courtyard",
];
const widths = [480, 768, 1200, 1600, 2000];
const formats = ["avif", "webp", "jpeg"];

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function publicReceipt(recordId) {
  return {
    schemaVersion: 1,
    pipelineId: "sskem-campus-media",
    recordId,
    decisionAtPreparation: "approved",
    mode: "public",
    generatedAt: NOW,
    source: { sha256: digest(`${recordId}-source`) },
    output: {
      profile: "campus-responsive",
      crop: "none",
      variants: widths.flatMap((width) => formats.map((format) => ({
        filename: `${recordId}-${width}.${format === "jpeg" ? "jpg" : format}`,
        format,
        width,
        height: Math.round(width * 9 / 16),
        bytes: 100_000,
        quality: 80,
        sha256: digest(`${recordId}-${width}-${format}`),
        embeddedMetadataRemoved: true,
        colourSpace: "srgb",
      }))),
    },
  };
}

test("generates one privacy-safe production handoff for the four canonical exterior shots", () => {
  const packet = createCampusMediaCapturePacket({ generatedAt: NOW });

  assert.equal(packet.status, "capture-and-approval-required");
  assert.deepEqual(packet.summary, { requiredShots: 4, approvedRecords: 0, activeBindings: 0 });
  assert.deepEqual(packet.delivery.minimumMaster, { longEdge: 2400, shortEdge: 1350 });
  assert.deepEqual(packet.delivery.responsiveWidths, widths);
  assert.deepEqual(packet.delivery.derivativeFormats.map((item) => item.format), formats);
  assert.deepEqual(packet.shots.map((shot) => shot.recordId), recordIds);
  assert.ok(packet.shots.every((shot) => shot.activation.nextStep === "capture-review-and-manifest-approval"));
  assert.ok(packet.shots.every((shot) => shot.operatorWorkflow.inspect.includes(shot.recordId)));
  assert.ok(packet.shots.every((shot) => shot.operatorWorkflow.inspect.includes("CONTROLLED_PATH")));
  assert.equal(packet.guardrails.pupilPhotographyRequested, false);
  assert.equal(packet.guardrails.externalWritePerformed, false);
  assert.doesNotMatch(JSON.stringify(packet), /"(?:sourcePointer|evidenceReferences|approvedByRole|approvedAt|consent|token)"\s*:/i);
});

test("reports readiness only when all four exact bindings and approvals are current", () => {
  const manifest = structuredClone(manifestData);
  for (const record of manifest.records) {
    if (!recordIds.includes(record.id)) continue;
    record.decision = "approved";
    record.checks = Object.fromEntries(Object.keys(record.checks).map((check) => [check, "verified"]));
    record.evidenceReferences = [`CONTROLLED/${record.id.toUpperCase()}`];
    record.approvedByRole = "Content owner";
    record.approvedAt = NOW;
  }
  const awaitingActivation = createCampusMediaCapturePacket({ generatedAt: NOW, manifest });
  assert.equal(awaitingActivation.status, "publication-activation-required");
  assert.deepEqual(awaitingActivation.summary, { requiredShots: 4, approvedRecords: 4, activeBindings: 0 });

  const registry = {
    ...campusMediaPublicationRegistry,
    bindings: recordIds.map((recordId) => createCampusMediaBindingProposal(publicReceipt(recordId))),
  };

  const packet = createCampusMediaCapturePacket({ generatedAt: NOW, manifest, registry });
  assert.equal(packet.status, "ready-for-homepage-use");
  assert.deepEqual(packet.summary, { requiredShots: 4, approvedRecords: 4, activeBindings: 4 });
  assert.ok(packet.shots.every((shot) => shot.activation.active));
  assert.ok(packet.shots.every((shot) => shot.activation.nextStep === "active"));
  assert.doesNotMatch(JSON.stringify(packet), /Content owner|CONTROLLED\/MEDIA-CAMPUS/i);
});

test("fails closed when manifest records, check profiles or delivery profiles drift", () => {
  const missingRecord = structuredClone(manifestData);
  missingRecord.records = missingRecord.records.filter((record) => record.id !== "media-campus-courtyard");
  assert.throws(
    () => createCampusMediaCapturePacket({ generatedAt: NOW, manifest: missingRecord }),
    /drifted from the four homepage roles/i,
  );

  const wrongChecks = structuredClone(manifestData);
  wrongChecks.records.find((record) => record.id === "media-campus-main").checks["unreviewed-extra"] = "pending";
  assert.throws(
    () => createCampusMediaCapturePacket({ generatedAt: NOW, manifest: wrongChecks }),
    /does not match the canonical campus-media approval checks/i,
  );

  const extraRecord = structuredClone(manifestData);
  extraRecord.records.push({
    ...structuredClone(extraRecord.records[0]),
    id: "media-campus-unmapped",
  });
  assert.throws(
    () => createCampusMediaCapturePacket({ generatedAt: NOW, manifest: extraRecord }),
    /drifted from the four homepage roles/i,
  );

  const missingProfile = structuredClone(pipelineData);
  delete missingProfile.profiles["campus-responsive"];
  assert.throws(
    () => createCampusMediaCapturePacket({ generatedAt: NOW, pipeline: missingProfile }),
    /campus-responsive delivery profile is missing/i,
  );
});
