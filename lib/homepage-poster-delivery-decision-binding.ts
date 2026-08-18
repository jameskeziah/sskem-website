import registryData from "../content/homepage-poster-delivery-decision-bindings.json" with { type: "json" };
import {
  createHomepagePosterDeliveryDecisionPacket,
  createHomepagePosterDeliveryDecisionPlan,
  homepagePosterDeliveryDecisionContract,
} from "./homepage-poster-delivery-decision.ts";

export type HomepagePosterDeliveryDecisionAuthority = {
  formatChangeReviewAllowed: boolean;
  pixelChangeReviewAllowed: boolean;
  artworkRevisionBriefAllowed: boolean;
  publicActivationAllowed: false;
};

export type HomepagePosterDeliveryDecisionBinding = {
  bindingId: string;
  decisionId: "sskem-homepage-poster-delivery";
  decisionContractDigest: string;
  approvalRecordDigest: string;
  completedRequestDigest: string;
  selectedOption: "hold-current-png" | "authorize-lossless-format-review" | "authorize-controlled-encoding-review" | "commission-artwork-revision-brief";
  authority: HomepagePosterDeliveryDecisionAuthority;
  decisionReference: string;
  approvedByRole: string;
  approvedAt: string;
  recordedAt: string;
  notes: string;
};

export type HomepagePosterDeliveryDecisionBindingRegistryInput = Omit<typeof registryData, "bindings"> & {
  bindings: HomepagePosterDeliveryDecisionBinding[];
};

type DecisionRegistry = HomepagePosterDeliveryDecisionBindingRegistryInput;

const digestPattern = /^[a-f0-9]{64}$/;
const evidenceReferencePattern = /^[A-Z0-9][A-Z0-9._/-]{2,79}$/;
const rolePattern = /^[a-z][a-z0-9-]{2,63}$/;
const topLevelKeys = new Set(["$schema", "schemaVersion", "registryId", "policy", "bindings"]);
const policyKeys = new Set(["exactDecisionContractDigestRequired", "exactApprovalRecordDigestRequired", "completedRequestDigestRequired", "controlledEvidenceRetainedExternally", "publicActivationAllowed", "notes"]);
const bindingKeys = new Set(["bindingId", "decisionId", "decisionContractDigest", "approvalRecordDigest", "completedRequestDigest", "selectedOption", "authority", "decisionReference", "approvedByRole", "approvedAt", "recordedAt", "notes"]);
const authorityKeys = new Set(["formatChangeReviewAllowed", "pixelChangeReviewAllowed", "artworkRevisionBriefAllowed", "publicActivationAllowed"]);
const bindingNotes = "Authorizes only the exact selected private review scope; publication approval remains separate.";

export const homepagePosterDeliveryDecisionBindingRegistry = registryData as HomepagePosterDeliveryDecisionBindingRegistryInput;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function unknownKeys(value: unknown, allowed: Set<string>) {
  return isRecord(value) ? Object.keys(value).filter((key) => !allowed.has(key)) : [];
}

function validDateTime(value: unknown): value is string {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && !Number.isNaN(Date.parse(value));
}

function resolvedTime(value: Date | string | number | undefined) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) throw new Error("Poster delivery decision binding requires a valid time.");
  return date;
}

export function validateHomepagePosterDeliveryDecisionBindingRegistry(options: {
  registry?: unknown;
  manifest?: Parameters<typeof createHomepagePosterDeliveryDecisionPacket>[0]["manifest"];
  contract?: Parameters<typeof createHomepagePosterDeliveryDecisionPacket>[0]["contract"];
  now?: Date | string | number;
} = {}) {
  const registry = options.registry ?? registryData;
  const issues: string[] = [];
  if (!isRecord(registry)) return ["Poster delivery decision binding registry must be an object."];
  if (unknownKeys(registry, topLevelKeys).length || Object.keys(registry).length !== topLevelKeys.size) issues.push("Poster delivery decision binding registry has invalid top-level fields.");
  if (registry.$schema !== "./homepage-poster-delivery-decision-bindings.schema.json" || registry.schemaVersion !== 1
    || registry.registryId !== "sskem-homepage-poster-delivery-decision-bindings") {
    issues.push("Poster delivery decision binding registry identity is invalid.");
  }
  if (!isRecord(registry.policy) || unknownKeys(registry.policy, policyKeys).length || Object.keys(registry.policy).length !== policyKeys.size
    || registry.policy.exactDecisionContractDigestRequired !== true || registry.policy.exactApprovalRecordDigestRequired !== true
    || registry.policy.completedRequestDigestRequired !== true || registry.policy.controlledEvidenceRetainedExternally !== true
    || registry.policy.publicActivationAllowed !== false || registry.policy.notes !== registryData.policy.notes) {
    issues.push("Poster delivery decision binding policy is invalid.");
  }
  if (!Array.isArray(registry.bindings) || registry.bindings.length > 1) {
    issues.push("Poster delivery decision binding registry may contain at most one binding.");
    return [...new Set(issues)];
  }

  const packet = createHomepagePosterDeliveryDecisionPacket({
    manifest: options.manifest,
    contract: options.contract,
    generatedAt: options.now,
  });
  const now = resolvedTime(options.now);
  for (const binding of registry.bindings) {
    if (!isRecord(binding) || unknownKeys(binding, bindingKeys).length || Object.keys(binding).length !== bindingKeys.size) {
      issues.push("Poster delivery decision binding has invalid fields.");
      continue;
    }
    if (binding.bindingId !== `poster-decision-${String(binding.completedRequestDigest).slice(0, 12)}`) issues.push("Poster delivery decision bindingId does not match its completed request digest.");
    if (binding.decisionId !== packet.requestTemplate.decisionId) issues.push("Poster delivery decision binding decisionId is invalid.");
    if (!digestPattern.test(String(binding.decisionContractDigest)) || binding.decisionContractDigest !== packet.requestTemplate.expectedDecisionContractDigest) issues.push("Poster delivery decision binding contract digest is stale or invalid.");
    if (!digestPattern.test(String(binding.approvalRecordDigest)) || binding.approvalRecordDigest !== packet.requestTemplate.expectedApprovalRecordDigest) issues.push("Poster delivery decision binding approval record digest is stale or invalid.");
    if (!digestPattern.test(String(binding.completedRequestDigest))) issues.push("Poster delivery decision binding completed request digest is invalid.");
    const selectedOption = typeof binding.selectedOption === "string"
      ? homepagePosterDeliveryDecisionContract.options.find((option) => option.id === binding.selectedOption)
      : undefined;
    if (!selectedOption) issues.push("Poster delivery decision binding selected option is invalid.");
    if (!isRecord(binding.authority) || unknownKeys(binding.authority, authorityKeys).length || Object.keys(binding.authority).length !== authorityKeys.size
      || !selectedOption || binding.authority.formatChangeReviewAllowed !== selectedOption.formatChangeReviewAllowed
      || binding.authority.pixelChangeReviewAllowed !== selectedOption.pixelChangeReviewAllowed
      || binding.authority.artworkRevisionBriefAllowed !== selectedOption.artworkRevisionBriefAllowed
      || binding.authority.publicActivationAllowed !== false) {
      issues.push("Poster delivery decision binding authority exceeds or differs from the selected option.");
    }
    if (typeof binding.decisionReference !== "string" || !evidenceReferencePattern.test(binding.decisionReference)) issues.push("Poster delivery decision binding must store one opaque controlled decision reference.");
    if (typeof binding.approvedByRole !== "string" || !rolePattern.test(binding.approvedByRole)) issues.push("Poster delivery decision binding must store a role identifier, never an approver identity.");
    if (!validDateTime(binding.approvedAt) || Date.parse(String(binding.approvedAt)) > now.getTime()) issues.push("Poster delivery decision binding approvedAt is invalid or in the future.");
    if (!validDateTime(binding.recordedAt) || Date.parse(String(binding.recordedAt)) > now.getTime()) issues.push("Poster delivery decision binding recordedAt is invalid or in the future.");
    if (validDateTime(binding.approvedAt) && validDateTime(binding.recordedAt) && Date.parse(binding.recordedAt) < Date.parse(binding.approvedAt)) issues.push("Poster delivery decision binding cannot be recorded before approval.");
    if (binding.notes !== bindingNotes) issues.push("Poster delivery decision binding notes are invalid.");
  }
  return [...new Set(issues)];
}

export function homepagePosterDeliveryDecisionBindingSummary(options: Parameters<typeof validateHomepagePosterDeliveryDecisionBindingRegistry>[0] = {}) {
  const registry = (options.registry ?? registryData) as DecisionRegistry;
  const issues = validateHomepagePosterDeliveryDecisionBindingRegistry(options);
  const valid = issues.length === 0 && Array.isArray(registry.bindings) ? registry.bindings.length : 0;
  const binding = valid === 1 ? registry.bindings[0] : null;
  return {
    required: 1,
    valid,
    ready: valid === 1,
    status: valid === 1 ? "review-scope-bound" : issues.length ? "binding-invalid" : "decision-not-recorded",
    selectedOption: binding?.selectedOption ?? null,
    authority: binding?.authority ?? null,
    issues,
  } as const;
}

export function createHomepagePosterDeliveryDecisionBindingProposal(options: {
  request: unknown;
  now?: Date | string | number;
  manifest?: Parameters<typeof createHomepagePosterDeliveryDecisionPacket>[0]["manifest"];
  contract?: Parameters<typeof createHomepagePosterDeliveryDecisionPacket>[0]["contract"];
}) {
  const now = resolvedTime(options.now);
  const plan = createHomepagePosterDeliveryDecisionPlan(options);
  if (plan.status !== "ready-for-controlled-recording" || !plan.selection || !isRecord(options.request)) {
    throw new Error(`Poster delivery decision binding is blocked: ${plan.blockers.join(" ")}`);
  }
  const evidenceReferences = options.request.evidenceReferences;
  if (!Array.isArray(evidenceReferences) || typeof evidenceReferences[0] !== "string") throw new Error("Poster delivery decision binding requires one opaque decision reference.");
  const completedRequestDigest = plan.controlledRecord.completedRequestDigest;
  if (!completedRequestDigest) throw new Error("Poster delivery decision binding requires the exact completed request digest.");

  return {
    bindingId: `poster-decision-${completedRequestDigest.slice(0, 12)}`,
    decisionId: plan.decisionId,
    decisionContractDigest: plan.current.decisionContractDigest,
    approvalRecordDigest: plan.current.approvalRecordDigest,
    completedRequestDigest,
    selectedOption: plan.selection.id,
    authority: {
      formatChangeReviewAllowed: plan.selection.formatChangeReviewAllowed,
      pixelChangeReviewAllowed: plan.selection.pixelChangeReviewAllowed,
      artworkRevisionBriefAllowed: plan.selection.artworkRevisionBriefAllowed,
      publicActivationAllowed: false,
    },
    decisionReference: evidenceReferences[0],
    approvedByRole: plan.controlledRecord.approvedByRole as string,
    approvedAt: plan.controlledRecord.approvedAt as string,
    recordedAt: now.toISOString(),
    notes: bindingNotes,
  };
}
