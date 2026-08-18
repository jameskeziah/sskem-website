export const POSTER_DECISION_WORKSPACE_CONFIRMATION = "confirm-controlled-poster-delivery-decision";

export type HomepagePosterDeliveryDecisionWorkspaceTemplate = {
  readonly requestVersion: unknown;
  readonly decisionId: unknown;
  readonly expectedDecisionContractDigest: unknown;
  readonly expectedApprovalRecordDigest: unknown;
};

export type HomepagePosterDeliveryDecisionWorkspaceInput = {
  selectedOption?: unknown;
  acknowledgements?: {
    artworkAndSourceRemainUnchanged?: unknown;
    performanceBudgetRemainsFixed?: unknown;
    reviewCandidatesRemainPrivate?: unknown;
    publicationApprovalRemainsSeparate?: unknown;
  };
  evidenceReferences?: unknown;
  approvedByRole?: unknown;
  decisionConfirmation?: unknown;
};

const digestPattern = /^[a-f0-9]{64}$/;
const evidenceReferencePattern = /^[A-Z0-9][A-Z0-9._/-]{2,79}$/;
const rolePattern = /^[a-z][a-z0-9-]{2,63}$/;
const canonicalOptionIds = new Set([
  "hold-current-png",
  "authorize-lossless-format-review",
  "authorize-controlled-encoding-review",
  "commission-artwork-revision-brief",
]);

function resolvedTime(value: Date | string | number | undefined) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) throw new Error("Poster delivery decision completion requires a valid time.");
  return date;
}

function validatedTemplate(template: HomepagePosterDeliveryDecisionWorkspaceTemplate) {
  if (template.requestVersion !== 1 || template.decisionId !== "sskem-homepage-poster-delivery"
    || typeof template.expectedDecisionContractDigest !== "string" || !digestPattern.test(template.expectedDecisionContractDigest)
    || typeof template.expectedApprovalRecordDigest !== "string" || !digestPattern.test(template.expectedApprovalRecordDigest)) {
    throw new Error("The poster delivery decision template is stale or invalid. Download a fresh worksheet.");
  }
}

function validatedEvidenceReferences(value: unknown) {
  if (!Array.isArray(value)) throw new Error("The decision worksheet requires at least one opaque controlled-record reference.");
  const references = value
    .filter((reference): reference is string => typeof reference === "string")
    .map((reference) => reference.trim())
    .filter(Boolean);
  if (!references.length || references.length > 4) throw new Error("Use between one and four opaque controlled-record references.");
  if (new Set(references).size !== references.length || references.some((reference) => !evidenceReferencePattern.test(reference))) {
    throw new Error("Poster delivery evidence must use unique opaque controlled-record references only.");
  }
  return references;
}

export function createHomepagePosterDeliveryDecisionCompletion(options: {
  template: HomepagePosterDeliveryDecisionWorkspaceTemplate;
  input: HomepagePosterDeliveryDecisionWorkspaceInput;
  now?: Date | string | number;
}) {
  validatedTemplate(options.template);
  if (options.input.decisionConfirmation !== POSTER_DECISION_WORKSPACE_CONFIRMATION) {
    throw new Error("The decision worksheet requires explicit confirmation before a completed packet can be downloaded.");
  }
  if (typeof options.input.selectedOption !== "string" || !canonicalOptionIds.has(options.input.selectedOption)) {
    throw new Error("Poster delivery decision requires one exact canonical option.");
  }
  const acknowledgements = options.input.acknowledgements;
  if (!acknowledgements || acknowledgements.artworkAndSourceRemainUnchanged !== true
    || acknowledgements.performanceBudgetRemainsFixed !== true
    || acknowledgements.reviewCandidatesRemainPrivate !== true
    || acknowledgements.publicationApprovalRemainsSeparate !== true) {
    throw new Error("Poster delivery decision requires the exact four acknowledgements.");
  }
  const evidenceReferences = validatedEvidenceReferences(options.input.evidenceReferences);
  if (typeof options.input.approvedByRole !== "string" || !rolePattern.test(options.input.approvedByRole)) {
    throw new Error("Poster delivery decision requires a lowercase role identifier, never an approver identity.");
  }
  const approvedAt = resolvedTime(options.now);
  const request = {
    requestVersion: 1,
    decisionId: "sskem-homepage-poster-delivery",
    expectedDecisionContractDigest: options.template.expectedDecisionContractDigest,
    expectedApprovalRecordDigest: options.template.expectedApprovalRecordDigest,
    selectedOption: options.input.selectedOption,
    acknowledgements: {
      artworkAndSourceRemainUnchanged: true,
      performanceBudgetRemainsFixed: true,
      reviewCandidatesRemainPrivate: true,
      publicationApprovalRemainsSeparate: true,
    },
    evidenceReferences,
    approvedByRole: options.input.approvedByRole,
    approvedAt: approvedAt.toISOString(),
  };

  return {
    filename: `sskem-homepage-poster-delivery-completed-${approvedAt.toISOString().slice(0, 10)}.json`,
    body: `${JSON.stringify(request, null, 2)}\n`,
    request,
    validation: {
      status: "ready-for-local-planner",
      selectedOption: request.selectedOption,
      evidenceReferencesRecorded: request.evidenceReferences.length,
    },
    guardrails: {
      networkRequestPerformed: false,
      serverPersistencePerformed: false,
      bindingRecorded: false,
      candidateGenerated: false,
      sourceModified: false,
      publicWritePerformed: false,
      publicationApprovalGranted: false,
      approverIdentityIncluded: false,
    },
  } as const;
}
