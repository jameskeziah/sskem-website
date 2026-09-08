"use client";

import { useRef, useState } from "react";

import {
  inspectProgrammesWorkbookForPrivateDraft,
  programmesWorkbookIssueLabels,
  type ProgrammesWorkbookIntakeReceipt,
  type ProgrammesWorkbookPrivateDraft,
} from "@/lib/programmes-workbook-intake";

import { ProgrammePageRehearsal } from "./programme-page-rehearsal";

type Props = {
  initialReceipt: ProgrammesWorkbookIntakeReceipt;
};

function ratio(value: number, total: number) {
  return `${value} / ${total}`;
}

function DraftFact({ label, value }: { label: string; value: string | null }) {
  return (
    <div data-state={value ? "available" : "withheld"}>
      <dt>{label}</dt>
      <dd>{value ?? "Awaiting management confirmation"}</dd>
    </div>
  );
}

export function ProgrammesWorkbookIntakeForm({ initialReceipt }: Props) {
  const [receipt, setReceipt] = useState(initialReceipt);
  const [drafts, setDrafts] = useState<ProgrammesWorkbookPrivateDraft[]>([]);
  const [message, setMessage] = useState("The recorded workbook audit is shown below.");
  const [busy, setBusy] = useState(false);
  const [hasLocalSelection, setHasLocalSelection] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function inspectFile(file: File | undefined) {
    if (!file) return;
    setDrafts([]);
    setHasLocalSelection(false);
    setBusy(true);
    setMessage("Inspecting the selected workbook locally in this browser...");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const inspection = await inspectProgrammesWorkbookForPrivateDraft({ bytes });
      setReceipt(inspection.receipt);
      setDrafts(inspection.drafts);
      setHasLocalSelection(true);
      setMessage(inspection.receipt.status === "blocked"
        ? "Inspection complete. A temporary screened draft is available below, but the workbook remains blocked and no content package was created."
        : "Inspection complete. The workbook may proceed to controlled manual reconciliation; this is not publication approval.");
    } catch (error) {
      setDrafts([]);
      setHasLocalSelection(false);
      setMessage(error instanceof Error ? error.message : "The selected workbook could not be inspected.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setBusy(false);
    }
  }

  function clearTemporaryPreview() {
    setReceipt(initialReceipt);
    setDrafts([]);
    setHasLocalSelection(false);
    setMessage("Temporary workbook data cleared. The recorded aggregate audit is shown below.");
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.focus();
  }

  function downloadReceipt() {
    const body = JSON.stringify({
      $schema: "./programmes-workbook-intake-receipt.schema.json",
      ...receipt,
    }, null, 2);
    const url = URL.createObjectURL(new Blob([`${body}\n`], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `sskem-programmes-workbook-intake-${receipt.sourceFingerprint.value.slice(0, 12)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section aria-busy={busy || undefined} className="workbook-intake-tool" aria-labelledby="workbook-intake-tool-title">
      <div className="workbook-intake-tool__heading">
        <div>
          <p className="eyebrow">Browser-only preflight</p>
          <h2 id="workbook-intake-tool-title">Use the workbook as a temporary private draft.</h2>
          <p id="workbook-intake-file-help">The browser creates an aggregate receipt and a tightly screened on-page preview. Names, contacts, fee amounts, results, affiliations, evidence, approval data, source filename and source path are omitted.</p>
        </div>
        <label className="button button--quiet workbook-intake-tool__picker">
          <span>{busy ? "Inspecting..." : "Choose revised XLSX"}</span>
          <input
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-describedby="workbook-intake-file-help"
            disabled={busy}
            onChange={(event) => void inspectFile(event.currentTarget.files?.[0])}
            ref={fileInputRef}
            type="file"
          />
        </label>
      </div>

      <p className="workbook-intake-tool__message" aria-live="polite">{message}</p>
      <noscript>
        <style>{`.workbook-intake-tool__picker { display: none !important; }`}</style>
        <p className="workbook-intake-tool__message">Local workbook inspection and page rehearsal require JavaScript. No file is uploaded when JavaScript is enabled.</p>
      </noscript>

      <div className="workbook-intake-status" data-status={receipt.status}>
        <div>
          <span>Status</span>
          <strong>{receipt.status === "blocked" ? "Blocked" : "Manual reconciliation allowed"}</strong>
        </div>
        <div>
          <span>Workbook fingerprint</span>
          <code>sha256:{receipt.sourceFingerprint.value.slice(0, 16)}...</code>
        </div>
        <div>
          <span>Recognized source worksheets</span>
          <strong>{ratio(receipt.structure.matchedRequiredWorksheetCount, receipt.structure.requiredWorksheetCount)}</strong>
        </div>
        <div>
          <span>Canonical intake tabs</span>
          <strong>{ratio(receipt.contractBinding.matchedWorksheetCount, receipt.contractBinding.expectedWorksheetCount)}</strong>
        </div>
      </div>

      <dl className="workbook-intake-metrics" aria-label="Programme workbook completion totals">
        <div><dt>Responses marked NOT CONFIRMED</dt><dd>{ratio(receipt.totals.notConfirmedResponses, receipt.totals.responseFields)}</dd></div>
        <div><dt>Unresolved critical responses</dt><dd>{ratio(receipt.totals.unresolvedCriticalResponses, receipt.totals.criticalFields)}</dd></div>
        <div><dt>Management-confirmed forms</dt><dd>{ratio(receipt.totals.managementConfirmedForms, receipt.totals.programmeForms)}</dd></div>
        <div><dt>Approved-for-publication forms</dt><dd>{ratio(receipt.totals.approvedForPublicationForms, receipt.totals.programmeForms)}</dd></div>
        <div><dt>Publication-ready tracker rows</dt><dd>{ratio(receipt.totals.trackerPublicationReadyRows, receipt.repeatingRows.publicationTracker)}</dd></div>
        <div><dt>Approved evidence rows</dt><dd>{receipt.totals.approvedEvidenceRows}</dd></div>
      </dl>

      <section className="workbook-intake-records" aria-labelledby="workbook-intake-records-title">
        <div>
          <p className="eyebrow">Generic record view</p>
          <h3 id="workbook-intake-records-title">No programme copy is exposed here.</h3>
        </div>
        <div className="workbook-intake-records__grid">
          {receipt.records.map((record) => (
            <article key={record.recordId}>
              <code>{record.recordId}</code>
              <dl>
                <div><dt>NOT CONFIRMED</dt><dd>{record.notConfirmedResponses}</dd></div>
                <div><dt>Critical unresolved</dt><dd>{record.unresolvedCriticalResponses}</dd></div>
                <div><dt>Management confirmed</dt><dd>{record.managementConfirmed ? "Yes" : "No"}</dd></div>
                <div><dt>Publication decision</dt><dd>{record.approvedForPublication ? "Approved" : "Not approved"}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      {drafts.length > 0 ? (
        <section className="workbook-intake-preview" aria-labelledby="workbook-intake-preview-title">
          <div className="workbook-intake-preview__heading">
            <div>
              <p className="eyebrow">Temporary private draft</p>
              <h3 id="workbook-intake-preview-title">Workbook-based programme sketch</h3>
            </div>
            <p><strong>Not verified. Not approved. Not publishable.</strong> This screened view exists only in this browser tab and disappears when it is cleared or refreshed.</p>
          </div>

          <div className="workbook-intake-preview__grid">
            {drafts.map((draft) => (
              <article key={draft.recordId}>
                <header>
                  <span className="workbook-intake-preview__badge">Provisional private draft</span>
                  <h4>{draft.title}</h4>
                  <code>{draft.recordId}</code>
                </header>

                <dl className="workbook-intake-preview__facts">
                  <DraftFact label="Academic year" value={draft.facts.academicYear} />
                  <DraftFact label="Student levels" value={draft.facts.studentLevels} />
                  <DraftFact label="Duration" value={draft.facts.duration} />
                  <DraftFact label="Entry point" value={draft.facts.entryPoint} />
                  <DraftFact label="Delivery mode" value={draft.facts.deliveryMode} />
                  <DraftFact label="Medium" value={draft.facts.medium} />
                  <DraftFact label="Curriculum outline" value={draft.facts.curriculum} />
                  <DraftFact label="Eligibility outline" value={draft.facts.eligibility} />
                  <DraftFact label="Intended audience" value={draft.facts.intendedAudience} />
                  <div data-state={draft.facts.subjects.length ? "available" : "withheld"}>
                    <dt>Subjects</dt>
                    <dd>{draft.facts.subjects.length
                      ? draft.facts.subjects.join(" · ")
                      : "Awaiting management confirmation"}</dd>
                  </div>
                </dl>

                <aside className="workbook-intake-preview__boundary">
                  <p><strong>{draft.availableFactCount} / 10</strong> screened facts available; <strong>{draft.withheldOrUnresolvedFactCount}</strong> withheld or unresolved.</p>
                  <p><strong>{draft.unresolvedCriticalResponses}</strong> critical responses and <strong>{draft.notConfirmedResponses}</strong> total responses still need confirmation.</p>
                  <details>
                    <summary>Always withheld from this preview</summary>
                    <ul>{draft.withheldCategories.map((category) => <li key={category}>{category}</li>)}</ul>
                  </details>
                </aside>
              </article>
            ))}
          </div>

          <ProgrammePageRehearsal drafts={drafts} />
        </section>
      ) : null}

      <section className="workbook-intake-issues" aria-labelledby="workbook-intake-issues-title">
        <div>
          <p className="eyebrow">Fail-closed checks</p>
          <h3 id="workbook-intake-issues-title">What still blocks the workbook</h3>
        </div>
        <ul>
          {receipt.issueCodes.map((code) => <li key={code}>{programmesWorkbookIssueLabels[code]}</li>)}
        </ul>
      </section>

      <div className="workbook-intake-tool__actions">
        <div className="workbook-intake-tool__action-buttons">
          <button className="button button--quiet" onClick={downloadReceipt} type="button">
            Download sanitized audit receipt
          </button>
          {hasLocalSelection ? (
            <button className="button button--quiet" onClick={clearTemporaryPreview} type="button">
              Clear temporary preview
            </button>
          ) : null}
        </div>
        <p>{hasLocalSelection ? "This receipt represents the locally selected workbook." : "This receipt represents the latest recorded audit."} It cannot approve, scan for malware or publish programme content.</p>
      </div>
    </section>
  );
}
