"use client";

import { type FormEvent, useState } from "react";

import { type ApprovalRequestWorkspaceTemplate, APPROVAL_REQUEST_WORKSPACE_CONFIRMATION } from "@/lib/approval-request-workspace";
import { DOCUMENT_APPROVAL_BATCH_CONFIRMATION } from "@/lib/document-approval-batch-contract";
import { createDocumentApprovalBatchCompletion } from "@/lib/document-approval-batch-workspace";

type DocumentApprovalRecord = {
  recordId: string;
  title: string;
  notes: string;
  decision: string;
  checkNames: string[];
  appendixSection: string;
  appendixRow: number;
  template: ApprovalRequestWorkspaceTemplate;
};

function field(recordId: string, name: string) {
  return `${recordId}:${name}`;
}

export function DocumentApprovalBatchForm({ records }: { records: DocumentApprovalRecord[] }) {
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const completion = createDocumentApprovalBatchCompletion({
        templates: records.map((record) => record.template),
        input: {
          requests: Object.fromEntries(records.map((record) => [record.recordId, {
            checks: Object.fromEntries(record.checkNames.map((check) => [check, form.get(field(record.recordId, `check:${check}`))])),
            evidenceReferences: String(form.get(field(record.recordId, "evidenceReferences")) ?? "").split(/\r?\n/),
            approvedByRole: form.get(field(record.recordId, "approvedByRole")),
            expiryChoice: form.get(field(record.recordId, "expiryChoice")),
            expiresAt: form.get(field(record.recordId, "expiresAt")),
            approvalConfirmation: form.get(field(record.recordId, "approvalConfirmation")),
          }])),
          batchConfirmation: form.get("batchConfirmation"),
        },
      });
      const objectUrl = URL.createObjectURL(new Blob([completion.body], { type: "application/json" }));
      const download = document.createElement("a");
      download.href = objectUrl;
      download.download = completion.filename;
      download.click();
      URL.revokeObjectURL(objectUrl);
      setMessage("Twelve-request approval batch downloaded. Retain it in the controlled system and run the read-only local batch planner.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The Appendix IX document approval batch is incomplete or invalid.");
    }
  }

  return (
    <form className="document-approval-form" onSubmit={handleSubmit}>
      {records.map((record, index) => (
        <section className="document-approval-record" aria-labelledby={`${record.recordId}-approval-title`} key={record.recordId}>
          <header className="document-approval-record__header">
            <div>
              <span>Section {record.appendixSection} Â· row {record.appendixRow} Â· record {index + 1} of {records.length} Â· {record.decision}</span>
              <h2 id={`${record.recordId}-approval-title`}>{record.title}</h2>
              <code>{record.recordId}</code>
            </div>
            <p>{record.notes}</p>
          </header>

          <fieldset className="document-approval-checks">
            <legend>{index + 1}.1 Decide every required check independently</legend>
            <p>Choose only after the named check has been completed in the controlled workflow. “Not applicable” requires its own documented basis.</p>
            <div className="document-approval-check-grid">
              {record.checkNames.map((check) => (
                <label key={check}>
                  <span>{check.replaceAll("-", " ")}</span>
                  <select name={field(record.recordId, `check:${check}`)} defaultValue="" required>
                    <option value="" disabled>Choose a decision</option>
                    <option value="verified">Verified</option>
                    <option value="not-applicable">Not applicable</option>
                  </select>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="document-approval-fields">
            <legend>{index + 1}.2 Record references, role and approval period</legend>
            <p>Use opaque controlled-record IDs only. Do not enter evidence text, filenames, local paths, URLs, people or signatures.</p>
            <div className="document-approval-field-grid">
              <label className="document-approval-evidence">
                <span>Controlled evidence references</span>
                <textarea name={field(record.recordId, "evidenceReferences")} rows={5} placeholder={"CONTROLLED/DOCUMENT-REVIEW-2026-001\nCONTROLLED/MALWARE-SCAN-2026-001"} autoComplete="off" required />
                <small>One unique opaque reference per line. Keep the referenced evidence outside the website and repository.</small>
              </label>
              <label>
                <span>Approving role</span>
                <input name={field(record.recordId, "approvedByRole")} type="text" pattern="[a-z][a-z0-9-]{2,63}" placeholder="compliance-owner" autoComplete="off" required />
                <small>Role only; never enter the approverâ€™s name, email or identity.</small>
              </label>
              <div className="document-approval-expiry">
                <span>Approval period</span>
                {record.template.expiresAt !== null ? <label><input type="radio" name={field(record.recordId, "expiryChoice")} value="retain" required /> Retain current expiry</label> : null}
                <label><input type="radio" name={field(record.recordId, "expiryChoice")} value="none" required /> No expiry</label>
                <label><input type="radio" name={field(record.recordId, "expiryChoice")} value="date" required /> Use a verified expiry date</label>
                <label className="document-approval-date"><span>Expiry date, when selected</span><input name={field(record.recordId, "expiresAt")} type="date" /></label>
              </div>
            </div>
          </fieldset>

          <label className="document-approval-record-confirmation">
            <input type="checkbox" name={field(record.recordId, "approvalConfirmation")} value={APPROVAL_REQUEST_WORKSPACE_CONFIRMATION} required />
            <span>I confirm this record independently represents the approving roleâ€™s completed decision and contains no approver identity or private evidence.</span>
          </label>
        </section>
      ))}

      <section className="document-approval-submit" aria-labelledby="document-approval-submit-title">
        <div>
          <p className="eyebrow">Final batch confirmation</p>
          <h2 id="document-approval-submit-title">Download one controlled twelve-request bundle.</h2>
          <p>The bundle is an operator handoff, not an approval action. Every request is bound to the current canonical record digest; one stale or invalid request blocks the entire local write.</p>
        </div>
        <label className="document-approval-final-confirmation">
          <input type="checkbox" name="batchConfirmation" value={DOCUMENT_APPROVAL_BATCH_CONFIRMATION} required />
          <span>I confirm all twelve independent document decisions are complete and ready for the guarded local batch planner.</span>
        </label>
        <button className="button button--primary" type="submit">Validate and download document approval batch</button>
        <p className="document-approval-message" aria-live="polite">{message}</p>
      </section>
    </form>
  );
}
