import { createHash } from "node:crypto";

import manifestData from "../content/approval-manifest.json" with { type: "json" };
import decisionData from "../content/homepage-poster-delivery-decision.json" with { type: "json" };
import performanceBudgetData from "../content/homepage-media-performance-budget.json" with { type: "json" };

type DecisionContract = typeof decisionData;
type ApprovalManifest = typeof manifestData;

const digestPattern = /^[a-f0-9]{64}$/;
const topLevelKeys = new Set(["$schema", "schemaVersion", "decisionId", "asset", "losslessBaseline", "constraints", "options"]);
const assetKeys = new Set(["id", "approvalRecordId", "sourceSha256", "sourceBytes", "format", "width", "height"]);
const baselineKeys = new Set(["candidateSha256", "candidateBytes", "pixelSha256", "pixelExact", "privateMetadataRemoved", "maximumBytes", "overageBytes"]);
const constraintKeys = new Set(["sourceMayBeModified", "compositionMayChange", "cropMayChange", "resizeMayChange", "overlayMayChange", "performanceBudgetMayChange", "decisionPacketMayGenerateCandidates", "publicActivationAllowed"]);
const optionKeys = new Set(["id", "label", "scope", "formatChangeReviewAllowed", "pixelChangeReviewAllowed", "artworkRevisionBriefAllowed"]);
const requestKeys = new Set(["requestVersion", "decisionId", "expectedDecisionContractDigest", "expectedApprovalRecordDigest", "selectedOption", "acknowledgements", "evidenceReferences", "approvedByRole", "approvedAt"]);
const acknowledgementKeys = new Set(["artworkAndSourceRemainUnchanged", "performanceBudgetRemainsFixed", "reviewCandidatesRemainPrivate", "publicationApprovalRemainsSeparate"]);
const evidenceReferencePattern = /^[A-Z0-9][A-Z0-9._/-]{2,79}$/;
const rolePattern = /^[a-z][a-z0-9-]{2,63}$/;
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

function approvalRecordDigest(record: unknown) {
  if (!isRecord(record)) throw new Error("Poster approval record digest requires one record.");
  return sha256(JSON.stringify(record));
}

function isoDateTime(value: Date | string | number | undefined) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) throw new Error("Poster delivery decision packet requires a valid generation time.");
  return date.toISOString();
}

function validDateTime(value: unknown): value is string {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && !Number.isNaN(Date.parse(value));
}

export function homepagePosterDeliveryDecisionDigest(contract: DecisionContract = decisionData) {
  return sha256(JSON.stringify(contract));
}

export function homepagePosterDeliveryDecisionRequestDigest(request: unknown) {
  if (!isRecord(request)) throw new Error("Poster delivery decision request digest requires one JSON object.");
  return sha256(JSON.stringify(request));
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
    completedRequestSchemaId: "https://www.sskemschool.com/schemas/homepage-poster-delivery-decision-request.schema.json",
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

export function createHomepagePosterDeliveryDecisionPlan(options: {
  request: unknown;
  now?: Date | string | number;
  contract?: DecisionContract;
  manifest?: ApprovalManifest;
}) {
  const contract = options.contract ?? decisionData;
  const contractIssues = validateHomepagePosterDeliveryDecisionContract(contract);
  if (contractIssues.length) throw new Error(`Poster delivery decision contract is invalid: ${contractIssues.join(" ")}`);
  assertPerformanceBudget();
  const manifest = options.manifest ?? manifestData;
  const record = canonicalPosterRecord(manifest);
  const currentContractDigest = homepagePosterDeliveryDecisionDigest(contract);
  const currentApprovalRecordDigest = approvalRecordDigest(record);
  const now = new Date(isoDateTime(options.now));
  const request = options.request;
  const blockers: string[] = [];

  if (!isRecord(request)) throw new Error("Poster delivery decision request must contain one JSON object.");
  for (const key of unknownKeys(request, requestKeys)) blockers.push(`Poster delivery decision request contains unknown field ${key}.`);
  if (request.requestVersion !== 1) blockers.push("Poster delivery decision request version must be 1.");
  if (request.decisionId !== contract.decisionId) blockers.push("Poster delivery decision request has the wrong decisionId.");
  if (typeof request.expectedDecisionContractDigest !== "string" || !digestPattern.test(request.expectedDecisionContractDigest)) {
    blockers.push("Poster delivery decision contract digest is invalid.");
  } else if (request.expectedDecisionContractDigest !== currentContractDigest) {
    blockers.push("Poster delivery decision contract changed after the request was generated; complete a fresh request.");
  }
  if (typeof request.expectedApprovalRecordDigest !== "string" || !digestPattern.test(request.expectedApprovalRecordDigest)) {
    blockers.push("Poster approval record digest is invalid.");
  } else if (request.expectedApprovalRecordDigest !== currentApprovalRecordDigest) {
    blockers.push("Poster approval record changed after the request was generated; complete a fresh request.");
  }

  const selectedOption = typeof request.selectedOption === "string"
    ? contract.options.find((candidate) => candidate.id === request.selectedOption) ?? null
    : null;
  if (!selectedOption) blockers.push("Poster delivery decision requires one exact canonical option.");

  if (!isRecord(request.acknowledgements) || unknownKeys(request.acknowledgements, acknowledgementKeys).length
    || Object.keys(request.acknowledgements).length !== acknowledgementKeys.size) {
    blockers.push("Poster delivery decision requires the exact four acknowledgements.");
  } else {
    for (const acknowledgement of acknowledgementKeys) {
      if (request.acknowledgements[acknowledgement] !== true) blockers.push(`Poster delivery acknowledgement ${acknowledgement} must be explicitly true.`);
    }
  }

  if (!Array.isArray(request.evidenceReferences) || request.evidenceReferences.length === 0) {
    blockers.push("Poster delivery decision requires at least one opaque controlled evidence reference.");
  } else {
    if (new Set(request.evidenceReferences).size !== request.evidenceReferences.length) blockers.push("Poster delivery evidence references must be unique.");
    if (request.evidenceReferences.some((reference) => typeof reference !== "string" || !evidenceReferencePattern.test(reference))) {
      blockers.push("Poster delivery evidence must use opaque controlled-record references only.");
    }
  }
  if (typeof request.approvedByRole !== "string" || !rolePattern.test(request.approvedByRole)) {
    blockers.push("Poster delivery decision requires a lowercase role identifier, never an approver identity.");
  }
  if (!validDateTime(request.approvedAt)) {
    blockers.push("Poster delivery decision approvedAt must be an ISO date-time.");
  } else if (Date.parse(request.approvedAt) > now.getTime()) {
    blockers.push("Poster delivery decision approvedAt cannot be in the future.");
  }

  const status = blockers.length ? "blocked" : "ready-for-controlled-recording";
  const dispositionByOption: Record<string, string> = {
    "hold-current-png": "no-implementation-authorized",
    "authorize-lossless-format-review": "private-lossless-format-review-authorized",
    "authorize-controlled-encoding-review": "private-controlled-encoding-review-authorized",
    "commission-artwork-revision-brief": "separate-artwork-brief-authorized",
  };

  return {
    planVersion: 1,
    decisionId: contract.decisionId,
    status,
    blockers: [...new Set(blockers)],
    current: {
      decisionContractDigest: currentContractDigest,
      approvalRecordDigest: currentApprovalRecordDigest,
      approvalDecision: record.decision,
    },
    selection: selectedOption ? {
      id: selectedOption.id,
      label: selectedOption.label,
      scope: selectedOption.scope,
      disposition: dispositionByOption[selectedOption.id],
      formatChangeReviewAllowed: selectedOption.formatChangeReviewAllowed,
      pixelChangeReviewAllowed: selectedOption.pixelChangeReviewAllowed,
      artworkRevisionBriefAllowed: selectedOption.artworkRevisionBriefAllowed,
      publicActivationAllowed: false,
    } : null,
    controlledRecord: {
      completedRequestDigest: status === "ready-for-controlled-recording" ? homepagePosterDeliveryDecisionRequestDigest(request) : null,
      evidenceReferencesRecorded: Array.isArray(request.evidenceReferences) ? request.evidenceReferences.length : 0,
      approvedByRole: typeof request.approvedByRole === "string" && rolePattern.test(request.approvedByRole) ? request.approvedByRole : null,
      approvedAt: validDateTime(request.approvedAt) ? request.approvedAt : null,
    },
    nextStep: status === "blocked"
      ? "Correct the completed request in the school-controlled system and generate a fresh plan."
      : selectedOption?.id === "hold-current-png"
        ? "Record the hold decision in the controlled system; the poster performance blocker remains."
        : "Record the decision in the controlled system, then build only the selected private review workflow.",
    guardrails: {
      localWritePerformed: false,
      decisionRecordedByTool: false,
      candidateGenerated: false,
      sourceModified: false,
      publicWritePerformed: false,
      budgetChanged: false,
      approvalManifestModified: false,
      privateEvidenceIncluded: false,
      approverIdentityIncluded: false,
      publicationApprovalGranted: false,
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
