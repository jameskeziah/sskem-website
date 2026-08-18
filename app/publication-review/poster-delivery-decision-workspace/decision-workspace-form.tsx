"use client";

import { type FormEvent, useState } from "react";

import {
  createHomepagePosterDeliveryDecisionCompletion,
  POSTER_DECISION_WORKSPACE_CONFIRMATION,
  type HomepagePosterDeliveryDecisionWorkspaceTemplate,
} from "@/lib/homepage-poster-delivery-decision-workspace";

type DecisionOption = {
  readonly id: string;
  readonly label: string;
  readonly scope: string;
};

const acknowledgements = [
  ["artworkAndSourceRemainUnchanged", "The approved artwork and source file remain unchanged."],
  ["performanceBudgetRemainsFixed", "The 400,000-byte public-release ceiling remains fixed."],
  ["reviewCandidatesRemainPrivate", "Any resulting candidates remain private until separately reviewed."],
  ["publicationApprovalRemainsSeparate", "This decision does not grant publication approval."],
] as const;

export function DecisionWorkspaceForm({
  options,
  template,
}: {
  options: readonly DecisionOption[];
  template: HomepagePosterDeliveryDecisionWorkspaceTemplate;
}) {
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const completion = createHomepagePosterDeliveryDecisionCompletion({
        template,
        input: {
          selectedOption: form.get("selectedOption"),
          acknowledgements: {
            artworkAndSourceRemainUnchanged: form.get("artworkAndSourceRemainUnchanged") === "true",
            performanceBudgetRemainsFixed: form.get("performanceBudgetRemainsFixed") === "true",
            reviewCandidatesRemainPrivate: form.get("reviewCandidatesRemainPrivate") === "true",
            publicationApprovalRemainsSeparate: form.get("publicationApprovalRemainsSeparate") === "true",
          },
          evidenceReferences: form.getAll("evidenceReference"),
          approvedByRole: form.get("approvedByRole"),
          decisionConfirmation: form.get("decisionConfirmation"),
        },
      });
      const objectUrl = URL.createObjectURL(new Blob([completion.body], { type: "application/json" }));
      const download = document.createElement("a");
      download.href = objectUrl;
      download.download = completion.filename;
      download.click();
      URL.revokeObjectURL(objectUrl);
      setMessage("Completed packet downloaded. Retain it in the school-controlled system, then run the local planner before recording.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The decision worksheet is incomplete or invalid.");
    }
  }

  return (
    <form className="poster-decision-form" onSubmit={handleSubmit}>
      <fieldset className="poster-decision-options">
        <legend>1. Select exactly one scope</legend>
        <p className="poster-decision-help">No option is preselected. Select only the authority management intends to grant.</p>
        <div className="poster-decision-options__grid">
          {options.map((option) => (
            <label className="poster-decision-option" key={option.id}>
              <input type="radio" name="selectedOption" value={option.id} required />
              <span>
                <strong>{option.label}</strong>
                <small>{option.scope}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="poster-decision-checks">
        <legend>2. Confirm every boundary</legend>
        <div className="poster-decision-checks__list">
          {acknowledgements.map(([name, label]) => (
            <label key={name}>
              <input type="checkbox" name={name} value="true" required />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="poster-decision-record">
        <legend>3. Identify the controlled record</legend>
        <p className="poster-decision-help">Use opaque references only. Do not enter names, email addresses, local paths or evidence text.</p>
        <div className="poster-decision-fields">
          <label>
            <span>Decision reference</span>
            <input name="evidenceReference" type="text" pattern="[A-Z0-9][A-Z0-9._/-]{2,79}" placeholder="POSTER-DECISION-2026-001" autoComplete="off" required />
          </label>
          <label>
            <span>Supporting reference (optional)</span>
            <input name="evidenceReference" type="text" pattern="[A-Z0-9][A-Z0-9._/-]{2,79}" placeholder="POSTER-REVIEW-MINUTES-2026-001" autoComplete="off" />
          </label>
          <label>
            <span>Approving role</span>
            <input name="approvedByRole" type="text" pattern="[a-z][a-z0-9-]{2,63}" placeholder="school-management" autoComplete="off" required />
          </label>
        </div>
      </fieldset>

      <section className="poster-decision-submit" aria-labelledby="poster-decision-submit-title">
        <div>
          <p className="eyebrow">Final confirmation</p>
          <h2 id="poster-decision-submit-title">Download the completed controlled-record packet.</h2>
          <p>The approval time is the moment this form is completed in your browser. The downloaded file must still pass the guarded local planner before it can be recorded.</p>
        </div>
        <label className="poster-decision-confirmation">
          <input type="checkbox" name="decisionConfirmation" value={POSTER_DECISION_WORKSPACE_CONFIRMATION} required />
          <span>I confirm this submission represents the approving role’s decision.</span>
        </label>
        <button className="button button--primary" type="submit">Validate and download packet</button>
        <p className="poster-decision-message" aria-live="polite">{message}</p>
      </section>
    </form>
  );
}
