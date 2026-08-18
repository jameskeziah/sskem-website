"use client";

import { type FormEvent, useState } from "react";

import {
  APPROVAL_REQUEST_WORKSPACE_CONFIRMATION,
  createApprovalRequestCompletion,
  type ApprovalRequestWorkspaceTemplate,
} from "@/lib/approval-request-workspace";

function labelFor(value: string) {
  return value.replaceAll("-", " ");
}

export function ApprovalRequestWorkspaceForm({
  recordTitle,
  checkNames,
  template,
}: {
  recordTitle: string;
  checkNames: string[];
  template: ApprovalRequestWorkspaceTemplate;
}) {
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const completion = createApprovalRequestCompletion({
        template,
        input: {
          checks: Object.fromEntries(checkNames.map((check) => [check, form.get(`check:${check}`)])),
          evidenceReferences: String(form.get("evidenceReferences") ?? "").split(/\r?\n/),
          approvedByRole: form.get("approvedByRole"),
          expiryChoice: form.get("expiryChoice"),
          expiresAt: form.get("expiresAt"),
          approvalConfirmation: form.get("approvalConfirmation"),
        },
      });
      const objectUrl = URL.createObjectURL(new Blob([completion.body], { type: "application/json" }));
      const download = document.createElement("a");
      download.href = objectUrl;
      download.download = completion.filename;
      download.click();
      URL.revokeObjectURL(objectUrl);
      setMessage("Completed request downloaded. Retain it in the school-controlled system, then run the guarded local planner before any write.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The approval request is incomplete or invalid.");
    }
  }

  return (
    <form className="approval-workspace-form" onSubmit={handleSubmit}>
      <fieldset className="approval-workspace-checks">
        <legend>1. Decide every required check</legend>
        <p className="approval-workspace-help">Nothing is preselected. Choose “not applicable” only when the controlled evidence establishes that the check does not apply.</p>
        <div className="approval-workspace-check-grid">
          {checkNames.map((check) => (
            <label key={check}>
              <span>{labelFor(check)}</span>
              <select name={`check:${check}`} defaultValue="" required>
                <option value="" disabled>Choose a decision</option>
                <option value="verified">Verified</option>
                <option value="not-applicable">Not applicable</option>
              </select>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="approval-workspace-record-fields">
        <legend>2. Identify the controlled evidence and role</legend>
        <p className="approval-workspace-help">Enter one opaque reference ID per line. Do not enter names, email addresses, paths, URLs, certificate text or consent details.</p>
        <div className="approval-workspace-field-grid">
          <label className="approval-workspace-evidence">
            <span>Controlled evidence references</span>
            <textarea name="evidenceReferences" rows={4} placeholder={"CONTROLLED/REVIEW-2026-001\nCONTROLLED/MINUTES-2026-001"} autoComplete="off" required />
          </label>
          <label>
            <span>Approving role</span>
            <input name="approvedByRole" type="text" pattern="[a-z][a-z0-9-]{2,63}" placeholder="school-management" autoComplete="off" required />
          </label>
        </div>
      </fieldset>

      <fieldset className="approval-workspace-expiry">
        <legend>3. Decide the approval period</legend>
        <p className="approval-workspace-help">Choose deliberately. A dated approval must expire after today.</p>
        <div className="approval-workspace-expiry-options">
          {template.expiresAt ? (
            <label>
              <input type="radio" name="expiryChoice" value="retain" required />
              <span>Retain the manifest expiry: <strong>{String(template.expiresAt)}</strong></span>
            </label>
          ) : null}
          <label>
            <input type="radio" name="expiryChoice" value="none" required />
            <span>No expiry</span>
          </label>
          <label>
            <input type="radio" name="expiryChoice" value="date" required />
            <span>Use this expiry date</span>
          </label>
          <label className="approval-workspace-expiry-date">
            <span>Expiry date, when selected</span>
            <input name="expiresAt" type="date" />
          </label>
        </div>
      </fieldset>

      <section className="approval-workspace-submit" aria-labelledby="approval-workspace-submit-title">
        <div>
          <p className="eyebrow">Final confirmation</p>
          <h2 id="approval-workspace-submit-title">Download the completed approval request.</h2>
          <p>The approval time is recorded when this form is completed. A fresh local plan must still confirm the record digest and every rule before an explicit manifest write.</p>
        </div>
        <label className="approval-workspace-confirmation">
          <input type="checkbox" name="approvalConfirmation" value={APPROVAL_REQUEST_WORKSPACE_CONFIRMATION} required />
          <span>I confirm this completed request represents the approving role’s decision for <strong>{recordTitle}</strong>.</span>
        </label>
        <button className="button button--primary" type="submit">Validate and download request</button>
        <p className="approval-workspace-message" aria-live="polite">{message}</p>
      </section>
    </form>
  );
}
