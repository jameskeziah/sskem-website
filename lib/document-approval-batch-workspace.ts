import {
  APPROVAL_REQUEST_WORKSPACE_CONFIRMATION,
  createApprovalRequestCompletion,
  type ApprovalRequestWorkspaceInput,
  type ApprovalRequestWorkspaceTemplate,
} from "./approval-request-workspace.ts";
import {
  DOCUMENT_APPROVAL_BATCH_CONFIRMATION,
  DOCUMENT_APPROVAL_BATCH_ID,
  documentApprovalBatchRecordIds,
} from "./document-approval-batch-contract.ts";

type DocumentApprovalRecordId = (typeof documentApprovalBatchRecordIds)[number];

export type DocumentApprovalBatchWorkspaceInput = {
  requests?: Partial<Record<DocumentApprovalRecordId, ApprovalRequestWorkspaceInput>>;
  batchConfirmation?: unknown;
};

function templateRecordId(template: ApprovalRequestWorkspaceTemplate) {
  return typeof template.recordId === "string" ? template.recordId : "";
}

export function createDocumentApprovalBatchCompletion(options: {
  templates: ApprovalRequestWorkspaceTemplate[];
  input: DocumentApprovalBatchWorkspaceInput;
  now?: Date | string | number;
}) {
  if (options.input.batchConfirmation !== DOCUMENT_APPROVAL_BATCH_CONFIRMATION) {
    throw new Error("Explicit final confirmation is required for the complete Appendix IX document approval batch.");
  }
  if (!Array.isArray(options.templates) || options.templates.length !== documentApprovalBatchRecordIds.length) {
    throw new Error("The Appendix IX document approval batch requires the exact twelve current request templates.");
  }
  const templateIds = options.templates.map(templateRecordId);
  if (new Set(templateIds).size !== templateIds.length
    || documentApprovalBatchRecordIds.some((recordId) => !templateIds.includes(recordId))) {
    throw new Error("The Appendix IX document approval templates do not match the exact twelve document records.");
  }

  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  if (Number.isNaN(now.getTime())) throw new Error("Appendix IX document approval completion requires a valid time.");
  const requests = documentApprovalBatchRecordIds.map((recordId) => {
    const template = options.templates.find((candidate) => templateRecordId(candidate) === recordId);
    const input = options.input.requests?.[recordId];
    if (!template || !input) throw new Error(`Complete the independent document approval request for ${recordId}.`);
    if (input.approvalConfirmation !== APPROVAL_REQUEST_WORKSPACE_CONFIRMATION) {
      throw new Error(`Confirm the independent document approval decision for ${recordId}.`);
    }
    return createApprovalRequestCompletion({ template, input, now }).request;
  });
  const generatedAt = now.toISOString();
  const batch = {
    batchVersion: 1,
    batchId: DOCUMENT_APPROVAL_BATCH_ID,
    generatedAt,
    requests,
  };

  return {
    filename: `sskem-appendix-ix-document-approval-batch-${generatedAt.slice(0, 10)}.json`,
    body: `${JSON.stringify(batch, null, 2)}\n`,
    batch,
    validation: {
      status: "ready-for-local-batch-planner",
      requestsCompleted: requests.length,
      recordIds: [...documentApprovalBatchRecordIds],
    },
    guardrails: {
      networkRequestPerformed: false,
      serverPersistencePerformed: false,
      manifestWritePerformed: false,
      batchWritePerformed: false,
      approvalGrantedByWorkspace: false,
      documentFilesRead: false,
      malwareScanPerformed: false,
      publicationActivated: false,
      privateEvidenceIncluded: false,
      approverIdentityIncluded: false,
    },
  } as const;
}
