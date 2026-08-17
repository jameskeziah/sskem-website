import manifestData from "../content/approval-manifest.json" with { type: "json" };

import { createApprovalUpdateRequestTemplate } from "./approval-manifest-update.mjs";

const recordIdPattern = /^(media|claim|document)-[a-z0-9-]+$/;

export function createApprovalRequestDownload(
  recordId: string,
  manifest = manifestData,
) {
  if (!recordIdPattern.test(recordId) || !manifest.records.some((record) => record.id === recordId)) {
    throw new Error(`Unknown approval record: ${recordId}.`);
  }

  const request = createApprovalUpdateRequestTemplate({ manifest, recordId });
  return {
    filename: `sskem-approval-request-${recordId}-${manifest.updatedOn}.json`,
    body: `${JSON.stringify(request, null, 2)}\n`,
    request,
    guardrails: {
      readOnly: true,
      checkDecisionsPreselected: false,
      evidenceReferencesIncluded: false,
      approverIdentityIncluded: false,
      approvalGrantedByDownload: false,
    },
  } as const;
}
