"use client";

import { useRef, useState } from "react";

import type { LegacyContentMigrationMatrix } from "@/lib/legacy-content-migration";
import {
  createLegacyMigrationWaveMergePlan,
  type LegacyMigrationWaveMergePlan,
} from "@/lib/legacy-migration-wave-merge";

export function MigrationWaveMergeForm({
  matrix,
  waveRecordIds,
}: {
  matrix: LegacyContentMigrationMatrix;
  waveRecordIds: readonly string[];
}) {
  const waveInputRef = useRef<HTMLInputElement>(null);
  const masterInputRef = useRef<HTMLInputElement>(null);
  const [waveFile, setWaveFile] = useState<File | null>(null);
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<LegacyMigrationWaveMergePlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Choose the completed Wave 1 CSV and a fresh full 115-row master CSV.");

  function chooseWave(file: File | null) {
    setWaveFile(file);
    setPlan(null);
    setMessage(file ? "Wave 1 worksheet selected. Choose the full master worksheet next." : "Choose the completed Wave 1 CSV.");
  }

  function chooseMaster(file: File | null) {
    setMasterFile(file);
    setPlan(null);
    setMessage(file ? "Both worksheets are selected. Validate them before downloading a merged master." : "Choose a fresh full 115-row master CSV.");
  }

  async function validateAndMerge() {
    if (!waveFile || !masterFile) {
      setMessage("Both CSV worksheets are required.");
      return;
    }
    setBusy(true);
    setPlan(null);
    setMessage("Validating exact bindings and controlled decisions in this browser tab...");
    try {
      const [waveCsv, masterCsv] = await Promise.all([waveFile.text(), masterFile.text()]);
      const next = await createLegacyMigrationWaveMergePlan({
        waveCsv,
        masterCsv,
        matrix,
        waveRecordIds,
        now: new Date().toISOString(),
      });
      setPlan(next);
      setMessage(next.status === "ready-for-download"
        ? "Wave 1 is valid. The combined master worksheet is ready to download."
        : "The files were not merged. Resolve the listed checks and try again with fresh downloads.");
    } catch {
      setMessage("The worksheets could not be validated. Download fresh copies and try again.");
    } finally {
      setBusy(false);
    }
  }

  function downloadMergedWorksheet() {
    if (!plan?.mergedCsv || plan.status !== "ready-for-download") return;
    const objectUrl = URL.createObjectURL(new Blob([plan.mergedCsv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "sskem-legacy-migration-master-wave-1-merged.csv";
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  function clearFiles() {
    setWaveFile(null);
    setMasterFile(null);
    setPlan(null);
    setMessage("Files cleared. Choose the completed Wave 1 CSV and a fresh full master CSV.");
    if (waveInputRef.current) waveInputRef.current.value = "";
    if (masterInputRef.current) masterInputRef.current.value = "";
    waveInputRef.current?.focus();
  }

  return (
    <section className="migration-wave-merger" aria-busy={busy || undefined} aria-labelledby="migration-wave-merger-title">
      <div className="migration-wave-merger__heading">
        <div>
          <p className="eyebrow">Browser-only validator and merger</p>
          <h2 id="migration-wave-merger-title">Combine Wave 1 without manual row copying.</h2>
          <p>Both files stay in this browser tab. The validator checks the exact matrix, records, immutable fields, routes, targets, reason codes, roles and review dates before enabling a download.</p>
        </div>
        <span className="migration-wave-merger__privacy">No upload or storage</span>
      </div>

      <div className="migration-wave-merger__inputs">
        <label>
          <span>1. Completed Wave 1 worksheet</span>
          <input
            accept=".csv,text/csv"
            disabled={busy}
            onChange={(event) => chooseWave(event.currentTarget.files?.[0] ?? null)}
            ref={waveInputRef}
            type="file"
          />
          <small>{waveFile ? "Wave file selected" : "Exactly 10 Wave 1 rows"}</small>
        </label>
        <label>
          <span>2. Fresh full master worksheet</span>
          <input
            accept=".csv,text/csv"
            disabled={busy}
            onChange={(event) => chooseMaster(event.currentTarget.files?.[0] ?? null)}
            ref={masterInputRef}
            type="file"
          />
          <small>{masterFile ? "Master file selected" : "Exactly 115 canonical rows"}</small>
        </label>
      </div>

      <div className="migration-wave-merger__actions">
        <button className="button button--primary" disabled={busy || !waveFile || !masterFile} onClick={() => void validateAndMerge()} type="button">
          {busy ? "Validating..." : "Validate and merge"}
        </button>
        <button className="button button--quiet" disabled={busy || (!waveFile && !masterFile && !plan)} onClick={clearFiles} type="button">Clear files</button>
      </div>
      <p className="migration-wave-merger__message" aria-live="polite">{message}</p>

      {plan ? (
        <section className="migration-wave-merge-result" data-status={plan.status} aria-labelledby="migration-wave-merge-result-title">
          <div className="migration-wave-merge-result__heading">
            <div>
              <p className="eyebrow">Validation result</p>
              <h3 id="migration-wave-merge-result-title">{plan.status === "ready-for-download" ? "Combined worksheet ready" : "Merge blocked"}</h3>
            </div>
            <strong>{plan.status === "ready-for-download" ? "Validated" : "Blocked"}</strong>
          </div>
          <dl className="migration-wave-merge-result__metrics">
            <div><dt>Wave rows accepted</dt><dd>{plan.summary.acceptedWaveRecords} / {plan.summary.expectedWaveRecords}</dd></div>
            <div><dt>Master rows</dt><dd>{plan.summary.masterRecords}</dd></div>
            <div><dt>Content decisions carried</dt><dd>{plan.summary.carriedContentDecisions}</dd></div>
            <div><dt>Content decisions remaining</dt><dd>{plan.summary.remainingContentDecisions}</dd></div>
            <div><dt>Route decisions remaining</dt><dd>{plan.summary.remainingRouteDecisions}</dd></div>
            <div><dt>Blocking checks</dt><dd>{plan.summary.issueCount}</dd></div>
          </dl>

          {plan.planId ? <p className="migration-wave-merge-result__binding"><span>Merge plan binding</span><code>{plan.planId}</code></p> : null}
          {plan.issues.length > 0 ? (
            <div className="migration-wave-merge-result__issues" role="region" aria-labelledby="migration-wave-merge-issues-title">
              <h4 id="migration-wave-merge-issues-title">Checks to resolve</h4>
              <ul>
                {plan.issues.slice(0, 30).map((issue, index) => (
                  <li key={`${issue.source}-${issue.code}-${issue.row ?? "all"}-${issue.column ?? "all"}-${index}`}>
                    <strong>{issue.code}</strong>
                    <span>{issue.source}{issue.row ? ` row ${issue.row}` : ""}{issue.column ? `, ${issue.column}` : ""}. {issue.message}</span>
                  </li>
                ))}
              </ul>
              {plan.issues.length > 30 ? <p>{plan.issues.length - 30} additional checks are suppressed.</p> : null}
            </div>
          ) : null}

          {plan.status === "ready-for-download" ? (
            <div className="migration-wave-merge-result__download">
              <button className="button button--primary" onClick={downloadMergedWorksheet} type="button">Download combined master worksheet</button>
              <p>The download carries these decisions into the full register. It does not record, approve, implement or publish them.</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <noscript><p className="migration-wave-merger__message">Local worksheet validation requires JavaScript. No files are uploaded when JavaScript is enabled.</p></noscript>
    </section>
  );
}
