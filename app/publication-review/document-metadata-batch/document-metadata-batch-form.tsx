"use client";

import { type FormEvent, useState } from "react";

import { PUBLIC_DOCUMENT_ACTIVATION_BATCH_CONFIRMATION } from "@/lib/public-document-activation-batch-contract";
import {
  PUBLIC_DOCUMENT_METADATA_RECORD_CONFIRMATION,
  createPublicDocumentActivationBatchCompletion,
} from "@/lib/public-document-activation-batch-workspace";

type DocumentMetadataRecord = {
  recordId: string;
  title: string;
  notes: string;
  appendixSection: string;
  appendixRow: number;
};

function field(recordId: string, name: string) {
  return `${recordId}:${name}`;
}

export function DocumentMetadataBatchForm({ records }: { records: DocumentMetadataRecord[] }) {
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const completion = createPublicDocumentActivationBatchCompletion({
        input: {
          documents: Object.fromEntries(records.map((record) => [record.recordId, {
            publicFilename: form.get(field(record.recordId, "publicFilename")),
            label: form.get(field(record.recordId, "label")),
            status: form.get(field(record.recordId, "status")),
            academicYearChoice: form.get(field(record.recordId, "academicYearChoice")),
            academicYear: form.get(field(record.recordId, "academicYear")),
            publicationYearChoice: form.get(field(record.recordId, "publicationYearChoice")),
            publicationYear: form.get(field(record.recordId, "publicationYear")),
            issuingAuthority: form.get(field(record.recordId, "issuingAuthority")),
            issueDate: form.get(field(record.recordId, "issueDate")),
            expiryDateChoice: form.get(field(record.recordId, "expiryDateChoice")),
            expiryDate: form.get(field(record.recordId, "expiryDate")),
            language: form.get(field(record.recordId, "language")),
            publicNote: form.get(field(record.recordId, "publicNote")),
            notes: form.get(field(record.recordId, "notes")),
            recordConfirmation: form.get(field(record.recordId, "recordConfirmation")),
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
      setMessage("Twelve-record metadata batch downloaded. Retain it in the controlled system and run the read-only local batch planner.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The Appendix IX metadata batch is incomplete or invalid.");
    }
  }

  return (
    <form className="document-metadata-form" onSubmit={handleSubmit}>
      <div className="document-metadata-records">
        {records.map((record, index) => (
          <section className="document-metadata-record" aria-labelledby={`${record.recordId}-title`} key={record.recordId}>
            <header className="document-metadata-record__header">
              <div>
                <span>Appendix IX section {record.appendixSection} Â· row {record.appendixRow} Â· record {index + 1} of {records.length}</span>
                <h2 id={`${record.recordId}-title`}>{record.title}</h2>
                <code>{record.recordId}</code>
              </div>
              <p>{record.notes}</p>
            </header>

            <fieldset>
              <legend>{index + 1}.1 Public file and display identity</legend>
              <div className="document-metadata-grid">
                <label>
                  <span>Stable public PDF filename</span>
                  <input name={field(record.recordId, "publicFilename")} type="text" pattern="[a-z0-9]+(?:-[a-z0-9]+)*\.pdf" placeholder="verified-document-title-2026.pdf" autoComplete="off" required />
                  <small>Lowercase letters, numbers and hyphens only; each of the twelve filenames must be unique.</small>
                </label>
                <label>
                  <span>Public document label</span>
                  <input name={field(record.recordId, "label")} type="text" minLength={3} maxLength={100} autoComplete="off" required />
                </label>
                <label>
                  <span>Current status</span>
                  <select name={field(record.recordId, "status")} defaultValue="" required>
                    <option value="" disabled>Choose verified status</option>
                    <option value="current">Current</option>
                    <option value="expiring-soon">Expiring soon</option>
                  </select>
                  <small>“Expiring soon” is mandatory when a verified expiry is within 90 days.</small>
                </label>
                <label>
                  <span>Language</span>
                  <select name={field(record.recordId, "language")} defaultValue="" required>
                    <option value="" disabled>Choose document language</option>
                    <option value="English">English</option>
                    <option value="Marathi">Marathi</option>
                    <option value="English and Marathi">English and Marathi</option>
                  </select>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>{index + 1}.2 Verified dates and authority</legend>
              <div className="document-metadata-grid">
                <label>
                  <span>Issuing authority</span>
                  <input name={field(record.recordId, "issuingAuthority")} type="text" minLength={3} maxLength={160} autoComplete="off" required />
                  <small>Use the exact public authority; “awaiting”, “unknown”, “pending” and “TBD” are rejected.</small>
                </label>
                <label>
                  <span>Issue or effective date</span>
                  <input name={field(record.recordId, "issueDate")} type="date" required />
                </label>
                <div className="document-metadata-choice">
                  <span>Academic year</span>
                  <label><input type="radio" name={field(record.recordId, "academicYearChoice")} value="none" required /> Not applicable</label>
                  <label><input type="radio" name={field(record.recordId, "academicYearChoice")} value="value" required /> Record a verified year</label>
                  <label><span>Year, when applicable</span><input name={field(record.recordId, "academicYear")} type="text" pattern="20[0-9]{2}(?:-20[0-9]{2})?" placeholder="2026-2027" autoComplete="off" /></label>
                </div>
                <div className="document-metadata-choice">
                  <span>Publication year</span>
                  <label><input type="radio" name={field(record.recordId, "publicationYearChoice")} value="none" required /> Not applicable</label>
                  <label><input type="radio" name={field(record.recordId, "publicationYearChoice")} value="value" required /> Record a verified year</label>
                  <label><span>Year, when applicable</span><input name={field(record.recordId, "publicationYear")} type="text" pattern="20[0-9]{2}" placeholder="2026" autoComplete="off" /></label>
                </div>
                <div className="document-metadata-choice">
                  <span>Expiry date</span>
                  <label><input type="radio" name={field(record.recordId, "expiryDateChoice")} value="none" required /> No expiry applies</label>
                  <label><input type="radio" name={field(record.recordId, "expiryDateChoice")} value="date" required /> Record a verified expiry</label>
                  <label><span>Date, when applicable</span><input name={field(record.recordId, "expiryDate")} type="date" /></label>
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>{index + 1}.3 Public explanation and operator note</legend>
              <div className="document-metadata-grid document-metadata-grid--text">
                <label>
                  <span>Public note</span>
                  <textarea name={field(record.recordId, "publicNote")} minLength={10} maxLength={500} rows={4} autoComplete="off" required />
                  <small>Explain scope or validity for parents without copying private evidence or unnecessary personal information.</small>
                </label>
                <label>
                  <span>Public-safe publication note</span>
                  <textarea name={field(record.recordId, "notes")} minLength={3} maxLength={500} rows={4} autoComplete="off" required />
                  <small>Describe this binding without paths, identities, signatures or evidence contents.</small>
                </label>
              </div>
            </fieldset>

            <label className="document-metadata-record-confirmation">
              <input type="checkbox" name={field(record.recordId, "recordConfirmation")} value={PUBLIC_DOCUMENT_METADATA_RECORD_CONFIRMATION} required />
              <span>I checked every field against the controlled, reviewed public source and entered no private evidence or approver identity.</span>
            </label>
          </section>
        ))}
      </div>

      <section className="document-metadata-submit" aria-labelledby="document-metadata-submit-title">
        <div>
          <p className="eyebrow">Final batch confirmation</p>
          <h2 id="document-metadata-submit-title">Download one planner-ready metadata bundle.</h2>
          <p>All twelve records must be complete and filenames must be unique. Downloading performs no approval, scan, PDF upload, registry write or activation.</p>
        </div>
        <label className="document-metadata-final-confirmation">
          <input type="checkbox" name="batchConfirmation" value={PUBLIC_DOCUMENT_ACTIVATION_BATCH_CONFIRMATION} required />
          <span>I confirm all twelve public metadata records are complete and ready for the guarded local batch planner.</span>
        </label>
        <button className="button button--primary" type="submit">Validate and download metadata batch</button>
        <p className="document-metadata-message" aria-live="polite">{message}</p>
      </section>
    </form>
  );
}
