import manifestData from "@/content/approval-manifest.json";

export type ApprovalKind = "media" | "claim" | "document";
export type ApprovalDecision = "blocked" | "review-required" | "approved" | "withdrawn";
export type ApprovalCheckState = "pending" | "verified" | "not-applicable" | "failed" | "withdrawn";

export type ApprovalRecord = {
  id: string;
  kind: ApprovalKind;
  title: string;
  sourcePointer: string;
  publicTargets: string[];
  checkProfile: string;
  checks: Record<string, ApprovalCheckState>;
  decision: ApprovalDecision;
  evidenceReferences: string[];
  approvedByRole: string | null;
  approvedAt: string | null;
  expiresAt: string | null;
  notes: string;
};

export type ApprovalManifest = {
  schemaVersion: number;
  manifestId: string;
  updatedOn: string;
  evidencePolicy: {
    privateEvidenceStoredInRepository: false;
    referencePattern: string;
    notes: string;
  };
  checkProfiles: Record<string, string[]>;
  records: ApprovalRecord[];
};

export const approvalManifest = manifestData as unknown as ApprovalManifest;

export const kindLabels: Record<ApprovalKind, string> = {
  media: "Media",
  claim: "Claims",
  document: "Documents",
};

export const decisionLabels: Record<ApprovalDecision, string> = {
  blocked: "Blocked",
  "review-required": "Review required",
  approved: "Approved",
  withdrawn: "Withdrawn",
};

export const checkStateLabels: Record<ApprovalCheckState, string> = {
  pending: "Pending",
  verified: "Verified",
  "not-applicable": "Not applicable",
  failed: "Failed",
  withdrawn: "Withdrawn",
};

const releaseCheckStates = new Set<ApprovalCheckState>(["verified", "not-applicable"]);

export function approvalProgress(record: ApprovalRecord) {
  const checks = Object.values(record.checks);
  const complete = checks.filter((state) => releaseCheckStates.has(state)).length;
  return { complete, total: checks.length };
}

export function approvalSummary(records = approvalManifest.records) {
  const byKind: Record<ApprovalKind, number> = { media: 0, claim: 0, document: 0 };
  const byDecision: Record<ApprovalDecision, number> = {
    blocked: 0,
    "review-required": 0,
    approved: 0,
    withdrawn: 0,
  };

  for (const record of records) {
    byKind[record.kind] += 1;
    byDecision[record.decision] += 1;
  }

  const releaseBlockers = records.filter(
    (record) => record.publicTargets.length > 0 && record.decision !== "approved",
  );

  return {
    total: records.length,
    byKind,
    byDecision,
    releaseBlockers,
    releaseReady: releaseBlockers.length === 0,
  };
}

export function filterApprovalRecords(kind = "", decision = "") {
  return approvalManifest.records.filter(
    (record) => (!kind || record.kind === kind) && (!decision || record.decision === decision),
  );
}

export const firstReviewBatch = approvalManifest.records.filter(
  (record) => record.checkProfile === "campus-media" && record.decision !== "approved",
);

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function approvalQueueCsv(records = approvalManifest.records) {
  const header = [
    "record_id",
    "kind",
    "title",
    "decision",
    "check_profile",
    "completed_checks",
    "required_checks",
    "pending_checks",
    "public_targets",
    "source_pointer",
    "controlled_evidence_reference_required",
    "approving_role_required",
    "notes",
  ];

  const rows = records.map((record) => {
    const progress = approvalProgress(record);
    const pendingChecks = Object.entries(record.checks)
      .filter(([, state]) => !releaseCheckStates.has(state))
      .map(([check]) => check)
      .join(" | ");

    return [
      record.id,
      record.kind,
      record.title,
      record.decision,
      record.checkProfile,
      progress.complete,
      progress.total,
      pendingChecks,
      record.publicTargets.join(" | "),
      record.sourcePointer,
      record.decision === "approved" ? "recorded" : "yes",
      record.decision === "approved" ? record.approvedByRole ?? "recorded" : "yes",
      record.notes,
    ].map(escapeCsv).join(",");
  });

  return [header.join(","), ...rows].join("\r\n");
}
