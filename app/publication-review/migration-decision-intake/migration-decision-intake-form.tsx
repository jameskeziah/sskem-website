"use client";

import { useRef, useState } from "react";

import {
  LEGACY_MIGRATION_DECISION_ACKNOWLEDGEMENT,
  LEGACY_MIGRATION_DECISION_MAX_BYTES,
  createLegacyMigrationDecisionPlan,
  type LegacyMigrationDecisionPlan,
} from "@/lib/legacy-migration-decision-intake";
import type { LegacyContentMigrationMatrix } from "@/lib/legacy-content-migration";

type Props = {
  matrix: LegacyContentMigrationMatrix;
};

function ratio(value: number, total: number) {
  return `${value} / ${total}`;
}

export function MigrationDecisionIntakeForm({ matrix }: Props) {
  const [plan, setPlan] = useState<LegacyMigrationDecisionPlan | null>(null);
  const [message, setMessage] = useState("Choose a completed decision-contract CSV to create a temporary local plan.");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function inspect(file: File | undefined) {
    if (!file) return;
    setPlan(null);
    setBusy(true);
    setMessage("Validating all worksheet bindings and proposed decisions locally...");
    try {
      if (file.size > LEGACY_MIGRATION_DECISION_MAX_BYTES) throw new Error("The worksheet exceeds the one-megabyte intake limit.");
      const csv = await file.text();
      const nextPlan = await createLegacyMigrationDecisionPlan({ csv, matrix });
      setPlan(nextPlan);
      setMessage(nextPlan.status === "ready-for-explicit-atomic-write"
        ? "Validation passed. Review the digest-bound plan below; no matrix write has occurred."
        : "Validation blocked the worksheet. No matrix write has occurred.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The worksheet could not be validated.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
      setBusy(false);
    }
  }

  function clearPlan() {
    setPlan(null);
    setMessage("Temporary plan cleared. Choose a completed decision-contract CSV to start again.");
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.focus();
  }

  function downloadPlan() {
    if (!plan || !plan.planId) return;
    const body = `${JSON.stringify(plan, null, 2)}\n`;
    const objectUrl = URL.createObjectURL(new Blob([body], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${plan.planId}.json`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  const visibleIssues = plan?.issues.slice(0, 30) ?? [];

  return (
    <section className="migration-intake-tool" aria-busy={busy || undefined} aria-labelledby="migration-intake-tool-title">
      <div className="migration-intake-tool__heading">
        <div>
          <p className="eyebrow">Browser-only decision preflight</p>
          <h2 id="migration-intake-tool-title">Validate the complete worksheet before any local update.</h2>
          <p id="migration-intake-file-help">Only the eight <code>proposed_*</code> columns are editable. Use controlled values in <code>proposed_reason_code</code> and <code>proposed_owner_role</code>; free-form names or notes are rejected. The browser checks all 115 record IDs, digests, bindings, decisions and targets without uploading the file.</p>
        </div>
        <label className="button button--primary migration-intake-tool__picker">
          <span>{busy ? "Validating..." : "Choose completed CSV"}</span>
          <input
            accept=".csv,text/csv"
            aria-describedby="migration-intake-file-help"
            disabled={busy}
            onChange={(event) => void inspect(event.currentTarget.files?.[0])}
            ref={inputRef}
            type="file"
          />
        </label>
      </div>

      <p className="migration-intake-tool__message" aria-live="polite">{message}</p>
      <noscript>
        <style>{`.migration-intake-tool__picker { display: none !important; }`}</style>
        <p className="migration-intake-tool__message">Local CSV validation requires JavaScript. The worksheet is not uploaded when JavaScript is enabled.</p>
      </noscript>

      <div className="migration-intake-baseline" aria-label="Canonical decision intake baseline">
        <div><span>Required rows</span><strong>{matrix.records.length}</strong></div>
        <div><span>Matrix binding</span><code>{matrix.matrixId}</code></div>
        <div><span>Archive binding</span><code>{matrix.archive.id}</code></div>
        <div><span>Write state</span><strong>Not performed</strong></div>
      </div>

      {plan ? (
        <section className="migration-intake-plan" data-status={plan.status} aria-labelledby="migration-intake-plan-title">
          <div className="migration-intake-plan__heading">
            <div>
              <p className="eyebrow">Temporary validation result</p>
              <h3 id="migration-intake-plan-title">{plan.status === "ready-for-explicit-atomic-write" ? "Ready for separate controlled recording" : "Fail-closed worksheet"}</h3>
            </div>
            <span className="migration-intake-state">{plan.status === "ready-for-explicit-atomic-write" ? "Validated" : "Blocked"}</span>
          </div>

          <dl className="migration-intake-metrics">
            <div><dt>Accepted records</dt><dd>{ratio(plan.summary.acceptedRecords, plan.summary.expectedRecords)}</dd></div>
            <div><dt>Route changes</dt><dd>{plan.summary.routeChanges}</dd></div>
            <div><dt>Content changes</dt><dd>{plan.summary.contentChanges}</dd></div>
            <div><dt>Blocking issues</dt><dd>{plan.summary.issueCount}</dd></div>
          </dl>

          {plan.planId ? (
            <div className="migration-intake-plan__binding">
              <span>Reviewed decision batch ID</span>
              <code>{plan.planId}</code>
              <p>This ID binds the current matrix and the exact completed worksheet. Editing either one creates a different or blocked plan.</p>
            </div>
          ) : null}

          {visibleIssues.length > 0 ? (
            <div className="migration-intake-issues" role="region" aria-labelledby="migration-intake-issues-title">
              <h4 id="migration-intake-issues-title">Fail-closed checks</h4>
              <ul>
                {visibleIssues.map((issue, index) => (
                  <li key={`${issue.code}-${issue.row ?? "all"}-${issue.column ?? "all"}-${index}`}>
                    <strong>{issue.code}</strong>
                    <span>{issue.row ? `Row ${issue.row}${issue.column ? ` - ${issue.column}` : ""}. ` : ""}{issue.message}</span>
                  </li>
                ))}
              </ul>
              {plan.issues.length > visibleIssues.length ? <p>{plan.issues.length - visibleIssues.length} additional issues are suppressed from this view.</p> : null}
            </div>
          ) : null}

          {plan.planId ? (
            <div className="migration-intake-command" aria-labelledby="migration-intake-command-title">
              <div>
                <h4 id="migration-intake-command-title">Separate local-write gate</h4>
                <p>Review the downloaded plan first. The command must revalidate the original CSV, reproduce this exact batch ID and receive the explicit acknowledgement.</p>
              </div>
              <code>npm run migration:decisions -- --worksheet=&quot;CONTROLLED_DECISIONS.csv&quot; --decision-batch-id={plan.planId} --apply --acknowledge-local-write={LEGACY_MIGRATION_DECISION_ACKNOWLEDGEMENT}</code>
            </div>
          ) : null}

          <div className="migration-intake-actions">
            {plan.planId ? <button className="button button--quiet" onClick={downloadPlan} type="button">Download read-only plan</button> : null}
            <button className="button button--quiet" onClick={clearPlan} type="button">Clear temporary plan</button>
          </div>
        </section>
      ) : null}

      <footer className="migration-intake-tool__boundary">
        <strong>Decision recording is not verification or publication.</strong>
        <p>The intake cannot change implementation status, satisfy required reviews, grant management approval, alter publication eligibility, update the CMS, activate navigation or deploy the site. A downloaded plan also performs no write.</p>
      </footer>
    </section>
  );
}
