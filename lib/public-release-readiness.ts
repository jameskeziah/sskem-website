export type ReleaseGateInput = {
  completed: number;
  required: number;
  ready: boolean;
  issues?: readonly string[];
  blocker: string;
};

export type PublicReleaseReadinessInput = {
  approvals: ReleaseGateInput;
  campusMedia: ReleaseGateInput;
  publicDocuments: ReleaseGateInput;
  mediaPerformance: ReleaseGateInput;
  legacyRoutes: ReleaseGateInput;
  reviewTreatment: ReleaseGateInput;
};

const gateDefinitions = [
  { key: "approvals", id: "publication-approvals", label: "Publication approvals" },
  { key: "campusMedia", id: "campus-media-bindings", label: "Campus media" },
  { key: "publicDocuments", id: "public-document-bindings", label: "Appendix IX documents" },
  { key: "mediaPerformance", id: "homepage-media-performance", label: "Homepage media budget" },
  { key: "legacyRoutes", id: "legacy-route-cutover", label: "Legacy route cutover" },
  { key: "reviewTreatment", id: "review-only-treatment", label: "Review-only treatment" },
] as const;

export function createPublicReleaseReadiness(input: PublicReleaseReadinessInput) {
  const gates = gateDefinitions.map((definition) => {
    const gate = input[definition.key];
    const issues = [...(gate.issues ?? [])];
    const validCounts = Number.isInteger(gate.completed)
      && Number.isInteger(gate.required)
      && gate.completed >= 0
      && gate.required > 0
      && gate.completed <= gate.required;
    if (!validCounts) issues.push("Gate progress is invalid.");
    const ready = validCounts && issues.length === 0 && gate.ready && gate.completed === gate.required;
    return {
      id: definition.id,
      label: definition.label,
      completed: validCounts ? gate.completed : 0,
      required: validCounts ? gate.required : 1,
      ready,
      blocker: ready ? null : gate.blocker,
      issues,
    };
  });
  const issues = gates.flatMap((gate) => gate.issues.map((issue) => `${gate.label}: ${issue}`));
  const blockedGates = gates.filter((gate) => !gate.ready);
  return {
    gates,
    readyGates: gates.length - blockedGates.length,
    blockedGates: blockedGates.length,
    totalGates: gates.length,
    blockingItems: blockedGates.reduce((total, gate) => total + Math.max(1, gate.required - gate.completed), 0),
    issues,
    privateReviewAllowed: issues.length === 0,
    releaseReady: issues.length === 0 && blockedGates.length === 0,
  } as const;
}
