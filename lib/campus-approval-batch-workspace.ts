import {
  APPROVAL_REQUEST_WORKSPACE_CONFIRMATION,
  createApprovalRequestCompletion,
  type ApprovalRequestWorkspaceInput,
  type ApprovalRequestWorkspaceTemplate,
} from "./approval-request-workspace.ts";

export const CAMPUS_APPROVAL_BATCH_CONFIRMATION = "confirm-controlled-campus-approval-batch";
export const CAMPUS_APPROVAL_BATCH_ID = "sskem-campus-media-approval-batch";

export const campusApprovalWorkspaceRecordIds = [
  "media-campus-main",
  "media-campus-grounds",
  "media-campus-entrance",
  "media-campus-courtyard",
] as const;

type CampusApprovalRecordId = (typeof campusApprovalWorkspaceRecordIds)[number];

export type CampusApprovalBatchWorkspaceInput = {
  requests?: Partial<Record<CampusApprovalRecordId, ApprovalRequestWorkspaceInput>>;
  batchConfirmation?: unknown;
};

function templateRecordId(template: ApprovalRequestWorkspaceTemplate) {
  return typeof template.recordId === "string" ? template.recordId : "";
}

export function createCampusApprovalBatchCompletion(options: {
  templates: ApprovalRequestWorkspaceTemplate[];
  input: CampusApprovalBatchWorkspaceInput;
  now?: Date | string | number;
}) {
  if (options.input.batchConfirmation !== CAMPUS_APPROVAL_BATCH_CONFIRMATION) {
    throw new Error("Explicit final confirmation is required for the complete campus approval batch.");
  }
  if (!Array.isArray(options.templates) || options.templates.length !== campusApprovalWorkspaceRecordIds.length) {
    throw new Error("The campus approval batch requires the exact four current request templates.");
  }
  const templateIds = options.templates.map(templateRecordId);
  if (new Set(templateIds).size !== templateIds.length
    || campusApprovalWorkspaceRecordIds.some((recordId) => !templateIds.includes(recordId))) {
    throw new Error("The campus approval batch templates do not match the exact four campus records.");
  }

  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  if (Number.isNaN(now.getTime())) throw new Error("Campus approval batch completion requires a valid time.");
  const requests = campusApprovalWorkspaceRecordIds.map((recordId) => {
    const template = options.templates.find((candidate) => templateRecordId(candidate) === recordId);
    const input = options.input.requests?.[recordId];
    if (!template || !input) throw new Error(`Complete the independent approval request for ${recordId}.`);
    if (input.approvalConfirmation !== APPROVAL_REQUEST_WORKSPACE_CONFIRMATION) {
      throw new Error(`Confirm the independent approval decision for ${recordId}.`);
    }
    return createApprovalRequestCompletion({ template, input, now }).request;
  });
  const generatedAt = now.toISOString();
  const batch = {
    batchVersion: 1,
    batchId: CAMPUS_APPROVAL_BATCH_ID,
    generatedAt,
    requests,
  };

  return {
    filename: `sskem-campus-approval-batch-${generatedAt.slice(0, 10)}.json`,
    body: `${JSON.stringify(batch, null, 2)}\n`,
    batch,
    validation: {
      status: "ready-for-local-batch-planner",
      requestsCompleted: requests.length,
      recordIds: [...campusApprovalWorkspaceRecordIds],
    },
    guardrails: {
      networkRequestPerformed: false,
      serverPersistencePerformed: false,
      manifestWritePerformed: false,
      batchWritePerformed: false,
      approvalGrantedByWorkspace: false,
      publicationActivated: false,
      privateEvidenceIncluded: false,
      approverIdentityIncluded: false,
    },
  } as const;
}
