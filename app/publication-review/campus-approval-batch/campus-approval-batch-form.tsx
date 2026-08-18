"use client";

import { type FormEvent, useState } from "react";

import { APPROVAL_REQUEST_WORKSPACE_CONFIRMATION, type ApprovalRequestWorkspaceTemplate } from "@/lib/approval-request-workspace";
import {
  CAMPUS_APPROVAL_BATCH_CONFIRMATION,
  createCampusApprovalBatchCompletion,
} from "@/lib/campus-approval-batch-workspace";

type CampusBatchRecord = {
  recordId: string;
  title: string;
  notes: string;
  imagePath: string;
  decision: string;
  checkNames: string[];
  template: ApprovalRequestWorkspaceTemplate;
};

function field(recordId: string, name: string) {
  return `${recordId}:${name}`;
}

export function CampusApprovalBatchForm({ records }: { records: CampusBatchRecord[] }) {
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const completion = createCampusApprovalBatchCompletion({
        templates: records.map((record) => record.template),
        input: {
          requests: Object.fromEntries(records.map((record) => [
            record.recordId,
            {
              checks: Object.fromEntries(record.checkNames.map((check) => [check, form.get(field(record.recordId, `check:${check}`))])),
              evidenceReferences: String(form.get(field(record.recordId, "evidenceReferences")) ?? "").split(/\r?\n/),
              approvedByRole: form.get(field(record.recordId, "approvedByRole")),
              expiryChoice: form.get(field(record.recordId, "expiryChoice")),
              expiresAt: form.get(field(record.recordId, "expiresAt")),
              approvalConfirmation: form.get(field(record.recordId, "approvalConfirmation")),
            },
          ])),
          batchConfirmation: form.get("batchConfirmation"),
        },
      });
      const objectUrl = URL.createObjectURL(new Blob([completion.body], { type: "application/json" }));
      const download = document.createElement("a");
      download.href = objectUrl;
      download.download = completion.filename;
      download.click();
      URL.revokeObjectURL(objectUrl);
      setMessage("Campus batch downloaded. Retain it in the controlled system and run the local batch planner before any atomic write.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The campus approval batch is incomplete or invalid.");
    }
  }

  return (
    <form className="campus-batch-form" onSubmit={handleSubmit}>
      {records.map((record, index) => (
        <section className="campus-batch-record" aria-labelledby={`${record.recordId}-title`} key={record.recordId}>
          <header className="campus-batch-record__header">
            <div>
              <span>Shot {index + 1} · {record.decision}</span>
              <h2 id={`${record.recordId}-title`}>{record.title}</h2>
              <code>{record.recordId}</code>
            </div>
            <p>{record.notes}</p>
          </header>

          <figure className="campus-batch-reference">
            {/* The authored prototype is shown whole: no crop, overlay or reconstruction. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- private review must show the exact existing asset without transformation. */}
            <img src={record.imagePath} alt={`${record.title}, current uncropped prototype reference`} />
            <figcaption>Prototype framing reference only. Production-master inspection and exact derivative activation remain separate.</figcaption>
          </figure>

          <fieldset className="campus-batch-checks">
            <legend>{index + 1}.1 Decide every check</legend>
            <div className="campus-batch-check-grid">
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

          <fieldset className="campus-batch-fields">
            <legend>{index + 1}.2 Record references, role and period</legend>
            <p>Use opaque controlled-record IDs only. Do not enter evidence text, names, paths or URLs.</p>
            <div className="campus-batch-field-grid">
              <label className="campus-batch-evidence">
                <span>Controlled evidence references</span>
                <textarea name={field(record.recordId, "evidenceReferences")} rows={4} placeholder={"CONTROLLED/CAMPUS-REVIEW-2026-001\nCONTROLLED/MINUTES-2026-001"} autoComplete="off" required />
              </label>
              <label>
                <span>Approving role</span>
                <input name={field(record.recordId, "approvedByRole")} type="text" pattern="[a-z][a-z0-9-]{2,63}" placeholder="school-management" autoComplete="off" required />
              </label>
              <div className="campus-batch-expiry">
                <span>Approval period</span>
                <label><input type="radio" name={field(record.recordId, "expiryChoice")} value="none" required /> No expiry</label>
                <label><input type="radio" name={field(record.recordId, "expiryChoice")} value="date" required /> Use expiry date</label>
                <label className="campus-batch-date"><span>Expiry date, when selected</span><input name={field(record.recordId, "expiresAt")} type="date" /></label>
              </div>
            </div>
          </fieldset>

          <label className="campus-batch-record-confirmation">
            <input type="checkbox" name={field(record.recordId, "approvalConfirmation")} value={APPROVAL_REQUEST_WORKSPACE_CONFIRMATION} required />
            <span>I confirm this record independently represents the approving role’s decision.</span>
          </label>
        </section>
      ))}

      <section className="campus-batch-submit" aria-labelledby="campus-batch-submit-title">
        <div>
          <p className="eyebrow">Final batch confirmation</p>
          <h2 id="campus-batch-submit-title">Download one controlled four-request bundle.</h2>
          <p>The bundle is only an operator handoff. The default local command plans without writing; an exact acknowledgement is required for a later all-or-nothing manifest update.</p>
        </div>
        <label className="campus-batch-final-confirmation">
          <input type="checkbox" name="batchConfirmation" value={CAMPUS_APPROVAL_BATCH_CONFIRMATION} required />
          <span>I confirm all four independent record decisions are complete and ready for local planning.</span>
        </label>
        <button className="button button--primary" type="submit">Validate and download campus batch</button>
        <p className="campus-batch-message" aria-live="polite">{message}</p>
      </section>
    </form>
  );
}
