"use client";

import { useState } from "react";

import type { ProgrammesWorkbookPrivateDraft } from "@/lib/programmes-workbook-intake";
import { createProgrammePageRehearsal } from "@/lib/programmes-page-rehearsal";

export function ProgrammePageRehearsal({ drafts }: { drafts: readonly ProgrammesWorkbookPrivateDraft[] }) {
  const [selectedRecordId, setSelectedRecordId] = useState(drafts[0]?.recordId ?? "");
  const selectedDraft = drafts.find((draft) => draft.recordId === selectedRecordId) ?? drafts[0];
  if (!selectedDraft) return null;

  const rehearsal = createProgrammePageRehearsal(selectedDraft);

  return (
    <section className="programme-rehearsal" aria-labelledby="programme-rehearsal-title">
      <header className="programme-rehearsal__heading">
        <div>
          <p className="eyebrow">Page rehearsal</p>
          <h3 id="programme-rehearsal-title">Test the ten-section page structure before approval.</h3>
        </div>
        <p>This is a layout and completeness check only. Screened workbook facts are visible; every approval-dependent section remains locked.</p>
      </header>

      <fieldset className="programme-rehearsal__switcher">
        <legend>Choose a temporary source record</legend>
        <div>
          {drafts.map((draft) => (
            <button
              aria-controls="programme-rehearsal-canvas"
              aria-pressed={draft.recordId === rehearsal.recordId}
              className="button button--quiet"
              key={draft.recordId}
              onClick={() => setSelectedRecordId(draft.recordId)}
              type="button"
            >
              <span>{draft.title}</span>
              <small>{draft.recordId === rehearsal.recordId ? "Shown" : "Show"}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="programme-rehearsal__coverage" aria-live="polite">
        <div>
          <span>Screened section coverage</span>
          <strong>{rehearsal.coveredSectionCount} / {rehearsal.totalSectionCount}</strong>
        </div>
        <div>
          <span>Publication readiness</span>
          <strong>{rehearsal.publicationReadySectionCount} / {rehearsal.totalSectionCount}</strong>
        </div>
        <progress
          aria-label={`${rehearsal.coveredSectionCount} of ${rehearsal.totalSectionCount} page sections contain screened draft facts`}
          max={rehearsal.totalSectionCount}
          value={rehearsal.coveredSectionCount}
        />
        <p>Coverage means that at least one screened fact can be rehearsed. It does not mean that a section is complete or approved.</p>
      </div>

      <article
        className="programme-rehearsal__canvas"
        data-publication-authorized="false"
        data-review-scope="browser-memory"
        id="programme-rehearsal-canvas"
      >
        <header className="programme-rehearsal__canvas-hero">
          <p>Temporary private page rehearsal</p>
          <h4>{rehearsal.title}</h4>
          <p>Not verified · Not approved · Not publishable</p>
        </header>

        <ol className="programme-rehearsal__sections">
          {rehearsal.sections.map((section) => (
            <li data-publication-state={section.publicationState} data-state={section.state} key={section.id}>
              <header>
                <span>{section.number}</span>
                <div>
                  <h5>{section.title}</h5>
                  <p>{section.state === "screened-facts-present" ? "Screened draft facts present" : "Locked pending management confirmation"}</p>
                </div>
              </header>

              {section.facts.length ? (
                <dl>
                  {section.facts.map((fact) => (
                    <div key={`${section.id}-${fact.label}`}>
                      <dt>{fact.label}</dt>
                      <dd>{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="programme-rehearsal__locked-copy">Awaiting management confirmation</p>
              )}

              {section.id === "admissions-cta" ? (
                <span className="button button--quiet programme-rehearsal__locked-action">Admissions action locked</span>
              ) : null}
            </li>
          ))}
        </ol>
      </article>

      <section className="programme-rehearsal__checklist" aria-labelledby="programme-rehearsal-checklist-title">
        <header>
          <div>
            <p className="eyebrow">Sanitized completion checklist</p>
            <h4 id="programme-rehearsal-checklist-title">Information still required for {rehearsal.title}</h4>
          </div>
          <button className="button button--quiet programme-rehearsal__print" onClick={() => window.print()} type="button">
            Print checklist
          </button>
        </header>
        <ol>
          {rehearsal.sections.map((section) => (
            <li key={`missing-${section.id}`}>
              <strong>{section.number} · {section.title}</strong>
              <span>{section.missing.join("; ")}.</span>
            </li>
          ))}
        </ol>
        <p>No workbook response text, person, contact, fee, result, affiliation, evidence reference or approval identity is added to this checklist. Printing creates a user-controlled private copy; it remains unverified and not publishable.</p>
      </section>
    </section>
  );
}
