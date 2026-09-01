import { publicDocumentActivationBatchRecordIds } from "./public-document-activation-batch-contract.ts";

export const DOCUMENT_APPROVAL_BATCH_ID = "sskem-appendix-ix-document-approval-batch";
export const DOCUMENT_APPROVAL_BATCH_CONFIRMATION = "confirm-controlled-appendix-ix-document-approval-batch";

export const documentApprovalBatchRecordIds = [...publicDocumentActivationBatchRecordIds] as const;
