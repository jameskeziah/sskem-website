"use client";

import { type FormEvent, useState } from "react";

import {
  PROGRAMMES_CONTENT_PACKAGE_CONFIRMATION,
  createProgrammesContentPackage,
  programmeMediaRecordIds,
} from "@/lib/programmes-content-package";

type ProgrammePrefix = "cbseSeniorSecondary" | "juniorCollege";

const mediaLabels: Record<(typeof programmeMediaRecordIds)[number], string> = {
  "media-campus-main": "Main campus exterior",
  "media-campus-grounds": "Campus grounds exterior",
  "media-xii-science-2025-26": "XII Science results artwork 2025-26",
  "media-result-admissions-2025-26": "Results and engineering/medical guidance artwork 2025-26",
};

function text(form: FormData, name: string) {
  return String(form.get(name) ?? "");
}

function lines(form: FormData, name: string) {
  return text(form, name).split(/\r?\n/);
}

function programmeInput(form: FormData, prefix: ProgrammePrefix) {
  return {
    officialName: text(form, `${prefix}:officialName`),
    board: text(form, `${prefix}:board`),
    affiliationOrRecognition: text(form, `${prefix}:affiliationOrRecognition`),
    classes: lines(form, `${prefix}:classes`),
    streams: lines(form, `${prefix}:streams`),
    subjects: lines(form, `${prefix}:subjects`),
    eligibility: text(form, `${prefix}:eligibility`),
    feeSummary: text(form, `${prefix}:feeSummary`),
    admissionProcedure: text(form, `${prefix}:admissionProcedure`),
    publicSummary: text(form, `${prefix}:publicSummary`),
  };
}

function ProgrammeDetailsFields({ prefix, title, active }: { prefix: ProgrammePrefix; title: string; active: boolean }) {
  return (
    <fieldset className="programmes-package-fieldset" disabled={!active} hidden={!active}>
      <legend>{title}</legend>
      <p>Use the exact current institutional wording approved for public use. List items one per line.</p>
      <div className="programmes-package-grid programmes-package-grid--two">
        <label><span>Official name</span><input name={`${prefix}:officialName`} type="text" autoComplete="off" required={active} /></label>
        <label><span>Board</span><input name={`${prefix}:board`} type="text" autoComplete="off" required={active} /></label>
        <label className="programmes-package-wide"><span>Affiliation or recognition</span><textarea name={`${prefix}:affiliationOrRecognition`} rows={2} required={active} /></label>
        <label><span>Classes</span><textarea name={`${prefix}:classes`} rows={3} placeholder={"Class XI\nClass XII"} required={active} /></label>
        <label><span>Streams</span><textarea name={`${prefix}:streams`} rows={3} placeholder={"Science\nCommerce\nArts"} required={active} /></label>
        <label className="programmes-package-wide"><span>Subjects</span><textarea name={`${prefix}:subjects`} rows={5} required={active} /></label>
        <label><span>Eligibility</span><textarea name={`${prefix}:eligibility`} rows={5} required={active} /></label>
        <label><span>Approved public fee summary</span><textarea name={`${prefix}:feeSummary`} rows={5} required={active} /></label>
        <label><span>Admission procedure</span><textarea name={`${prefix}:admissionProcedure`} rows={6} required={active} /></label>
        <label><span>Public programme summary</span><textarea name={`${prefix}:publicSummary`} rows={6} required={active} /></label>
      </div>
    </fieldset>
  );
}

export function ProgrammesContentPackageForm() {
  const [institutionalModel, setInstitutionalModel] = useState("");
  const [examOperator, setExamOperator] = useState("");
  const [resultsPublication, setResultsPublication] = useState("");
  const [message, setMessage] = useState("");

  const cbseActive = institutionalModel === "cbse-senior-secondary-only" || institutionalModel === "both";
  const juniorCollegeActive = institutionalModel === "separate-junior-college-only" || institutionalModel === "both";
  const examActive = examOperator !== "" && examOperator !== "not-offered";
  const resultsActive = examActive && resultsPublication === "verified-results-approved";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const completion = createProgrammesContentPackage({
        input: {
          academicYear: form.get("academicYear"),
          institutionalModel: form.get("institutionalModel"),
          cbseSeniorSecondary: programmeInput(form, "cbseSeniorSecondary"),
          juniorCollege: programmeInput(form, "juniorCollege"),
          examPreparation: {
            operator: form.get("examOperator"),
            operatorName: form.get("examOperatorName"),
            programmes: lines(form, "examProgrammes"),
            studentGroups: lines(form, "examStudentGroups"),
            curriculum: form.get("examCurriculum"),
            timetable: form.get("examTimetable"),
            facultySummary: form.get("examFacultySummary"),
            feeSummary: form.get("examFeeSummary"),
            facilitiesSummary: form.get("examFacilitiesSummary"),
            resultsPublication: form.get("resultsPublication"),
            verifiedResultsSummary: form.get("verifiedResultsSummary"),
            publicSummary: form.get("examPublicSummary"),
          },
          publication: {
            juniorCollegeNavigation: form.get("juniorCollegeNavigation"),
            examPreparationNavigation: form.get("examPreparationNavigation"),
            approvedMediaRecordIds: form.getAll("approvedMediaRecordIds"),
            approvedPublicClaims: lines(form, "approvedPublicClaims"),
          },
          controlledEvidenceReferences: lines(form, "controlledEvidenceReferences"),
          approvedByRole: form.get("approvedByRole"),
          approvedOn: form.get("approvedOn"),
          expiresOn: form.get("expiresOn"),
          managementConfirmation: form.get("managementConfirmation"),
        },
      });
      const objectUrl = URL.createObjectURL(new Blob([completion.body], { type: "application/json" }));
      const download = document.createElement("a");
      download.href = objectUrl;
      download.download = completion.filename;
      download.click();
      URL.revokeObjectURL(objectUrl);
      setMessage("Programmes content package downloaded. Retain it with the controlled evidence for implementation review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The Programmes content package is incomplete or invalid.");
    }
  }

  return (
    <form className="programmes-package-form" onSubmit={handleSubmit}>
      <section className="programmes-package-card" aria-labelledby="programmes-structure-title">
        <header><span>01</span><div><p className="eyebrow">Institutional decision</p><h2 id="programmes-structure-title">What currently operates?</h2></div></header>
        <fieldset className="programmes-package-fieldset">
          <legend>Academic year and institutional model</legend>
          <div className="programmes-package-grid programmes-package-grid--two">
            <label><span>Academic year</span><input name="academicYear" type="text" pattern="20[0-9]{2}-20[0-9]{2}" placeholder="2026-2027" autoComplete="off" required /></label>
            <label><span>Institutional model</span><select name="institutionalModel" value={institutionalModel} onChange={(event) => setInstitutionalModel(event.target.value)} required><option value="" disabled>Choose only after verification</option><option value="cbse-senior-secondary-only">CBSE Senior Secondary only</option><option value="separate-junior-college-only">Separate Junior College only</option><option value="both">Both pathways are current</option><option value="neither-current">Neither pathway is current</option></select></label>
          </div>
        </fieldset>
        <ProgrammeDetailsFields prefix="cbseSeniorSecondary" title="CBSE Senior Secondary details" active={cbseActive} />
        <ProgrammeDetailsFields prefix="juniorCollege" title="Separate Junior College details" active={juniorCollegeActive} />
      </section>

      <section className="programmes-package-card" aria-labelledby="exam-preparation-title">
        <header><span>02</span><div><p className="eyebrow">JEE, NEET and CET</p><h2 id="exam-preparation-title">Who operates the preparation programme?</h2></div></header>
        <fieldset className="programmes-package-fieldset">
          <legend>Operating model</legend>
          <div className="programmes-package-grid programmes-package-grid--two">
            <label><span>Operator</span><select name="examOperator" value={examOperator} onChange={(event) => setExamOperator(event.target.value)} required><option value="" disabled>Choose only after verification</option><option value="not-offered">Not currently offered</option><option value="cbse-school">CBSE school</option><option value="junior-college">Junior College</option><option value="separate-institute">Separate institute</option><option value="external-partner">External partner</option></select></label>
            <label><span>Official operator name</span><input name="examOperatorName" type="text" autoComplete="off" disabled={!examActive} required={examActive && examOperator !== "cbse-school"} /></label>
            <label className="programmes-package-wide"><span>Approved public summary</span><textarea name="examPublicSummary" rows={5} required /></label>
          </div>
        </fieldset>

        <fieldset className="programmes-package-fieldset" disabled={!examActive} hidden={!examActive}>
          <legend>Approved programme facts</legend>
          <p>Do not include student-level data, teacher contact details or unverified result claims.</p>
          <div className="programmes-package-grid programmes-package-grid--two">
            <label><span>Examinations or programmes</span><textarea name="examProgrammes" rows={4} placeholder={"JEE Main\nNEET-UG\nMHT-CET"} required={examActive} /></label>
            <label><span>Student groups</span><textarea name="examStudentGroups" rows={4} placeholder={"Class XI Science\nClass XII Science"} required={examActive} /></label>
            <label><span>Curriculum</span><textarea name="examCurriculum" rows={6} required={examActive} /></label>
            <label><span>Timetable</span><textarea name="examTimetable" rows={6} required={examActive} /></label>
            <label><span>Faculty summary</span><textarea name="examFacultySummary" rows={6} required={examActive} /></label>
            <label><span>Approved public fee summary</span><textarea name="examFeeSummary" rows={6} required={examActive} /></label>
            <label className="programmes-package-wide"><span>Facilities summary</span><textarea name="examFacilitiesSummary" rows={5} required={examActive} /></label>
            <label><span>Results publication</span><select name="resultsPublication" value={resultsPublication} onChange={(event) => setResultsPublication(event.target.value)} required={examActive}><option value="" disabled>Choose a verified state</option><option value="no-results-published">No results will be published</option><option value="verified-results-approved">Verified results are approved</option></select></label>
            <label><span>Verified results summary</span><textarea name="verifiedResultsSummary" rows={5} disabled={!resultsActive} required={resultsActive} /></label>
          </div>
        </fieldset>
      </section>

      <section className="programmes-package-card" aria-labelledby="publication-direction-title">
        <header><span>03</span><div><p className="eyebrow">Public presentation</p><h2 id="publication-direction-title">Claims, media and navigation</h2></div></header>
        <fieldset className="programmes-package-fieldset">
          <legend>Navigation placement</legend>
          <div className="programmes-package-grid programmes-package-grid--two">
            <label><span>Junior College</span><select name="juniorCollegeNavigation" defaultValue="" required><option value="" disabled>Choose placement</option><option value="hidden">Keep hidden</option><option value="primary">Primary navigation</option><option value="secondary">Secondary navigation</option></select></label>
            <label><span>JEE/NEET preparation</span><select name="examPreparationNavigation" defaultValue="" required><option value="" disabled>Choose placement</option><option value="hidden">Keep hidden</option><option value="primary">Primary navigation</option><option value="secondary">Secondary navigation</option><option value="under-junior-college">Under Junior College</option><option value="under-institute">Under Institute</option></select></label>
          </div>
        </fieldset>
        <fieldset className="programmes-package-fieldset">
          <legend>Requested media</legend>
          <p>Selection requests a placement only. Every selected item still needs its existing media and claim approvals.</p>
          <div className="programmes-package-checkboxes">
            {programmeMediaRecordIds.map((recordId) => <label key={recordId}><input type="checkbox" name="approvedMediaRecordIds" value={recordId} /><span>{mediaLabels[recordId]}<code>{recordId}</code></span></label>)}
          </div>
        </fieldset>
        <fieldset className="programmes-package-fieldset">
          <legend>Exact approved public claims</legend>
          <label className="programmes-package-block-label"><span>One claim per line</span><textarea name="approvedPublicClaims" rows={7} required /><small>Use final management-approved wording. Do not enter draft alternatives or private evidence.</small></label>
        </fieldset>
      </section>

      <section className="programmes-package-card" aria-labelledby="management-approval-title">
        <header><span>04</span><div><p className="eyebrow">Controlled approval record</p><h2 id="management-approval-title">Evidence, role and validity</h2></div></header>
        <fieldset className="programmes-package-fieldset">
          <legend>Management confirmation</legend>
          <p>Use opaque references only. Keep minutes, certificates, fee schedules, timetables, staff records, result evidence and identities outside the repository.</p>
          <div className="programmes-package-grid programmes-package-grid--two">
            <label className="programmes-package-wide"><span>Controlled evidence references</span><textarea name="controlledEvidenceReferences" rows={5} placeholder={"CONTROLLED/PROGRAMMES-REVIEW-2026-001\nCONTROLLED/MANAGEMENT-MINUTES-2026-001"} required /><small>At least two unique IDs; never paths, URLs, filenames or evidence text.</small></label>
            <label><span>Approving role</span><input name="approvedByRole" type="text" pattern="[a-z][a-z0-9-]{2,63}" placeholder="school-management" autoComplete="off" required /><small>Role only, never a person or email address.</small></label>
            <label><span>Approval date</span><input name="approvedOn" type="date" required /></label>
            <label><span>Expiry date, if applicable</span><input name="expiresOn" type="date" /></label>
          </div>
        </fieldset>
      </section>

      <section className="programmes-package-submit" aria-labelledby="programmes-package-submit-title">
        <div><p className="eyebrow">Final package confirmation</p><h2 id="programmes-package-submit-title">Download one controlled Programmes handoff.</h2><p>The download records an externally completed management decision. It does not grant approval or publish any content.</p></div>
        <label className="programmes-package-final-confirmation"><input type="checkbox" name="managementConfirmation" value={PROGRAMMES_CONTENT_PACKAGE_CONFIRMATION} required /><span>I confirm the institutional model, public facts, claims, requested media and navigation placement reflect the completed management decision and contain no private evidence or approver identity.</span></label>
        <button className="button button--primary" type="submit">Validate and download content package</button>
        <p className="programmes-package-message" aria-live="polite">{message}</p>
      </section>
    </form>
  );
}
