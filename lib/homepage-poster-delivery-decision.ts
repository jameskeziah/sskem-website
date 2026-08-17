import { createHash } from "node:crypto";

import manifestData from "../content/approval-manifest.json" with { type: "json" };
import decisionData from "../content/homepage-poster-delivery-decision.json" with { type: "json" };
import performanceBudgetData from "../content/homepage-media-performance-budget.json" with { type: "json" };

import { approvalRecordDigest } from "./approval-manifest-update.mjs";

type DecisionContract = typeof decisionData;
type ApprovalManifest = typeof manifestData;

const digestPattern = /^[a-f0-9]{64}$/;
const topLevelKeys = new Set(["$schema", "schemaVersion", "decisionId", "asset", "losslessBaseline", "constraints", "options"]);
const assetKeys = new Set(["id", "approvalRecordId", "sourceSha256", "sourceBytes", "format", "width", "height"]);
const baselineKeys = new Set(["candidateSha256", "candidateBytes", "pixelSha256", "pixelExact", "privateMetadataRemoved", "maximumBytes", "overageBytes"]);
const constraintKeys = new Set(["sourceMayBeModified", "compositionMayChange", "cropMayChange", "resizeMayChange", "overlayMayChange", "performanceBudgetMayChange", "decisionPacketMayGenerateCandidates", "publicActivationAllowed"]);
const optionKeys = new Set(["id", "label", "scope", "formatChangeReviewAllowed", "pixelChangeReviewAllowed", "artworkRevisionBriefAllowed"]);
const optionCapabilities = new Map([
  ["hold-current-png", [false, false, false]],
  ["authorize-lossless-format-review", [true, false, false]],
  ["authorize-controlled-encoding-review", [true, true, false]],
  ["commission-artwork-revision-brief", [false, false, true]],
]);

export const homepagePosterDeliveryDecisionContract = decisionData;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function unknownKeys(value: unknown, allowed: Set<string>) {
  return isRecord(value) ? Object.keys(value).filter((key) => !allowed.has(key)) : [];
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function isoDateTime(value: Date | string | number | undefined) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) throw new Error("Poster delivery decision packet requires a valid generation time.");
  return date.toISOString();
}

export function homepagePosterDeliveryDecisionDigest(contract: DecisionContract = decisionData) {
  return sha256(JSON.stringify(contract));
}

export function validateHomepagePosterDeliveryDecisionContract(contract: unknown = decisionData) {
  const issues: string[] = [];
  if (!isRecord(contract)) return ["Poster delivery decision contract must be an object."];
  if (unknownKeys(contract, topLevelKeys).length) issues.push("Poster delivery decision contract contains unknown top-level fields.");
  if (contract.$schema !== "./homepage-poster-delivery-decision.schema.json" || contract.schemaVersion !== 1 || contract.decisionId !== "sskem-homepage-poster-delivery") {
    issues.push("Poster delivery decision identity is invalid.");
  }

  const asset = contract.asset;
  if (!isRecord(asset) || unknownKeys(asset, assetKeys).length || asset.id !== "homepage-social-poster"
    || asset.approvalRecordId !== "media-homepage-social-poster" || !digestPattern.test(String(asset.sourceSha256))
    || asset.sourceSha256 !== decisionData.asset.sourceSha256
    || asset.sourceBytes !== 1446077 || asset.format !== "png" || asset.width !== 1200 || asset.height !== 630) {
    issues.push("Poster delivery decision asset baseline is invalid.");
  }

  const baseline = contract.losslessBaseline;
  if (!isRecord(baseline) || unknownKeys(baseline, baselineKeys).length || !digestPattern.test(String(baseline.candidateSha256))
    || baseline.candidateSha256 !== decisionData.losslessBaseline.candidateSha256
    || !digestPattern.test(String(baseline.pixelSha256)) || baseline.pixelSha256 !== decisionData.losslessBaseline.pixelSha256
    || baseline.candidateBytes !== 1004872
    || baseline.pixelExact !== true || baseline.privateMetadataRemoved !== true || baseline.maximumBytes !== 400000
    || baseline.overageBytes !== 604872 || baseline.candidateBytes - baseline.maximumBytes !== baseline.overageBytes) {
    issues.push("Poster delivery lossless baseline is invalid.");
  }

  const constraints = contract.constraints;
  if (!isRecord(constraints) || unknownKeys(constraints, constraintKeys).length || Object.keys(constraints).length !== constraintKeys.size
    || Object.values(constraints).some((value) => value !== false)) {
    issues.push("Poster delivery decision constraints must remain non-mutating and non-publishing.");
  }

  const options = contract.options;
  if (!Array.isArray(options) || options.length !== optionCapabilities.size) {
    issues.push("Poster delivery decision must expose the four canonical options.");
  } else {
    const seen = new Set<string>();
    for (const option of options) {
      if (!isRecord(option) || unknownKeys(option, optionKeys).length || typeof option.id !== "string"
        || typeof option.label !== "string" || !option.label.trim() || typeof option.scope !== "string" || !option.scope.trim()) {
        issues.push("Poster delivery decision contains an invalid option.");
        continue;
      }
      const expected = optionCapabilities.get(option.id);
      const canonicalOption = decisionData.options.find((candidate) => candidate.id === option.id);
      if (!expected || seen.has(option.id) || option.formatChangeReviewAllowed !== expected[0]
        || option.pixelChangeReviewAllowed !== expected[1] || option.artworkRevisionBriefAllowed !== expected[2]
        || option.label !== canonicalOption?.label || option.scope !== canonicalOption?.scope) {
        issues.push(`Poster delivery decision option ${option.id} has invalid authority.`);
      }
      seen.add(option.id);
    }
    if (seen.size !== optionCapabilities.size) issues.push("Poster delivery decision options are incomplete or duplicated.");
  }
  return [...new Set(issues)];
}

function canonicalPosterRecord(manifest: ApprovalManifest) {
  if (!isRecord(manifest) || manifest.manifestId !== "sskem-publication-approvals" || !Array.isArray(manifest.records)) {
    throw new Error("Poster delivery decision packet requires the canonical approval manifest.");
  }
  const record = manifest.records.find((candidate) => candidate.id === decisionData.asset.approvalRecordId);
  if (!record || record.kind !== "media" || record.sourcePointer !== "public/og.png"
    || record.checkProfile !== "derived-media" || !record.publicTargets.includes("/") || !record.publicTargets.includes("/og.png")) {
    throw new Error("Poster approval record has drifted from the exact homepage/social asset.");
  }
  return record;
}

function assertPerformanceBudget() {
  const asset = performanceBudgetData.assets.find((candidate) => candidate.id === decisionData.asset.id);
  if (!asset || asset.approvalRecordId !== decisionData.asset.approvalRecordId || asset.observedBytes !== decisionData.asset.sourceBytes
    || asset.maximumBytes !== decisionData.losslessBaseline.maximumBytes || asset.format !== decisionData.asset.format
    || asset.width !== decisionData.asset.width || asset.height !== decisionData.asset.height) {
    throw new Error("Poster delivery decision has drifted from the homepage media performance budget.");
  }
}

export function createHomepagePosterDeliveryDecisionPacket(options: {
  generatedAt?: Date | string | number;
  contract?: DecisionContract;
  manifest?: ApprovalManifest;
} = {}) {
  const contract = options.contract ?? decisionData;
  const issues = validateHomepagePosterDeliveryDecisionContract(contract);
  if (issues.length) throw new Error(`Poster delivery decision contract is invalid: ${issues.join(" ")}`);
  assertPerformanceBudget();
  const manifest = options.manifest ?? manifestData;
  const record = canonicalPosterRecord(manifest);
  const generatedAt = isoDateTime(options.generatedAt);

  return {
    packetVersion: 1,
    packetId: "sskem-homepage-poster-delivery-decision-request",
    generatedAt,
    status: "decision-required",
    manifestSnapshot: {
      manifestId: manifest.manifestId,
      updatedOn: manifest.updatedOn,
      approvalRecordId: record.id,
      approvalDecision: record.decision,
      approvalRecordDigest: approvalRecordDigest(record),
    },
    currentAsset: {
      id: contract.asset.id,
      sourceSha256: contract.asset.sourceSha256,
      bytes: contract.asset.sourceBytes,
      format: contract.asset.format,
      width: contract.asset.width,
      height: contract.asset.height,
    },
    losslessBaseline: contract.losslessBaseline,
    constraints: contract.constraints,
    options: contract.options,
    requestTemplate: {
      requestVersion: 1,
      decisionId: contract.decisionId,
      expectedDecisionContractDigest: homepagePosterDeliveryDecisionDigest(contract),
      expectedApprovalRecordDigest: approvalRecordDigest(record),
      selectedOption: null,
      acknowledgements: {
        artworkAndSourceRemainUnchanged: null,
        performanceBudgetRemainsFixed: null,
        reviewCandidatesRemainPrivate: null,
        publicationApprovalRemainsSeparate: null,
      },
      evidenceReferences: [],
      approvedByRole: null,
      approvedAt: null,
    },
    approvalBoundary: {
      instruction: "Complete and retain this request in the school-controlled system. A selection authorizes only the selected review scope; it does not approve or publish an asset.",
      nextStep: "After a controlled decision is recorded, implement only the selected review scope in ignored staging and require separate visual and publication approval.",
    },
    guardrails: {
      readOnly: true,
      optionPreselected: false,
      candidateGenerated: false,
      sourceModified: false,
      publicWritePerformed: false,
      budgetChanged: false,
      privateEvidenceIncluded: false,
      approverIdentityIncluded: false,
      approvalGrantedByPacket: false,
    },
  } as const;
}

export function createHomepagePosterDeliveryDecisionDownload(options: Parameters<typeof createHomepagePosterDeliveryDecisionPacket>[0] = {}) {
  const packet = createHomepagePosterDeliveryDecisionPacket(options);
  return {
    filename: `sskem-homepage-poster-delivery-decision-${packet.generatedAt.slice(0, 10)}.json`,
    body: `${JSON.stringify(packet, null, 2)}\n`,
    packet,
  } as const;
}
