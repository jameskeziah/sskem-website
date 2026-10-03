import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  admissionStatusExamples,
  admissionsFaq,
  ageRule,
  documentChecklist,
  officialAdmissionsSources,
  provisionalAgeBaselines,
} from "@/app/data/admissions";
import {
  AdmissionsPageFrame,
  AdmissionsReviewNotice,
  ProcessTimeline,
  VerificationValue,
} from "@/components/admissions";
import {
  AgeEligibilityChecker,
  ApplicationJourneyPrototype,
  EnquiryFormPrototype,
  StatusLookupPrototype,
  VisitRequestPrototype,
} from "@/components/admissions-forms";
import { PageContainer } from "@/components/layout";
import { siteFacts } from "@/app/data/site";

const pageDetails = {
  process: {
    title: "Admission process",
    eyebrow: "Admissions Â· Parent journey",
    summary: "Eight visible stages separate an initial question from a formal, authorised admission decision.",
  },
  "age-criteria": {
    title: "Age criteria",
    eyebrow: "Admissions Â· Eligibility",
    summary: "Age guidance is generated from an approved Maharashtra rule recordâ€”not copied from an old page or typed as a permanent date range.",
  },
  enquire: {
    title: "Make an admissions enquiry",
    eyebrow: "Admissions ? First contact",
    summary:
      "Ask a simple question about class availability, curriculum, fees, transport, visits or the right next step. No certificates are needed at this stage.",
  },

  apply: {
    title: "Start an application",
    eyebrow: "Admissions Â· Formal application",
    summary: "Review the planned seven-step mobile application and the privacy and security gates required before it can accept real information.",
  },
  "application-status": {
    title: "Application status",
    eyebrow: "Admissions Â· Parent tracking",
    summary: "A parent-safe view of progress, actions and deadlinesâ€”protected by the application reference, registered mobile and a one-time password.",
  },
  "documents-required": {
    title: "Documents required",
    eyebrow: "Admissions Â· Conditional checklist",
    summary: "The documents depend on the class, admission category, previous board and transfer context. They are not required for a short enquiry.",
  },
  fees: {
    title: "Admission fees",
    eyebrow: "Admissions Â· Approved schedules",
    summary: "Fee information will be shown only with its academic year, approving authority, effective date and controlled public document.",
  },
  faq: {
    title: "Admissions FAQ",
    eyebrow: "Admissions Â· Quick answers",
    summary: "Plain-language answers about availability, age, documents, transfers, RTE and the review environment.",
  },
  contact: {
    title: "Contact admissions",
    eyebrow: "Admissions Â· Help",
    summary: "Use the verified general school channels while a dedicated admissions contact and service standard await approval.",
  },
  rte: {
    title: "RTE 25% admissions",
    eyebrow: "Admissions Â· Official Maharashtra process",
    summary: "The regular SSKEMS enquiry and application are not the official RTE application. Parents must use the Maharashtra Government process.",
  },
  "class-9-and-11-transfers": {
    title: "Class IX and XI transfers",
    eyebrow: "Admissions Â· Special review",
    summary: "Prior-class, board, subject and timing rules make these applications different from elementary entry.",
  },
  school: {
    title: "School admissions",
    eyebrow: "Admissions Â· Classes Iâ€“VIII",
    summary: "A Maharashtra-specific route for age, previous-class eligibility, documents, availability and family support.",
  },
  "senior-secondary": {
    title: "Senior-secondary admissions",
    eyebrow: "Admissions Â· Classes IXâ€“XII",
    summary: "Direct-entry and transfer rules, programme confirmation and subject availability must be checked before an application is invited.",
  },
  visit: {
    title: "Visit SSKEMS",
    eyebrow: "Admissions Â· School visit",
    summary: "Speak with the school, understand routines and request any accessibility or communication support before your visit.",
  },
} as const;

type PageKey = keyof typeof pageDetails;
type RouteProps = { params: Promise<{ section: string[] }> };

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return <div className="admissions-section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{children}</div>;
}

function ProcessPage() {
  return (
    <>
      <section
        id="admissions-process-journey"
        className="admissions-band admissions-process-v2"
        aria-labelledby="process-steps-title"
      >
        <PageContainer className="admissions-process-page admissions-process-page--v2">
          <div className="admissions-process-v2__intro">
            <p className="eyebrow">The complete parent journey</p>

            <h2 id="process-steps-title">
              Eight clear stages. No hidden step.
            </h2>

            <p>
              An enquiry is not an application, and an application is
              not an admission decision. Each stage has a different
              purpose and a different level of information.
            </p>

            <div
              className="admissions-process-phase-row"
              aria-label="Admission journey phases"
            >
              <span>
                <b>01-03</b>
                Explore
              </span>

              <span>
                <b>04</b>
                Apply
              </span>

              <span>
                <b>05-07</b>
                Review
              </span>

              <span>
                <b>08</b>
                Confirm
              </span>
            </div>
          </div>

          <ProcessTimeline />
        </PageContainer>
      </section>

      <section
        className="admissions-band admissions-process-principles"
        aria-labelledby="process-boundaries-title"
      >
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--split">
            <div>
              <p className="eyebrow">Important boundaries</p>

              <h2 id="process-boundaries-title">
                What each decision actually means.
              </h2>
            </div>

            <p>
              The process stays useful only when families can distinguish
              guidance, review, an offer and final confirmation.
            </p>
          </div>

          <div className="admissions-process-principle-grid">
            <article>
              <span>Elementary stage</span>

              <h3>Orientation is not selection</h3>

              <p>
                A family interaction may identify learning, language,
                transport, accessibility or health support. It must not
                become a selection test, parental interview or screening
                procedure.
              </p>
            </article>

            <article>
              <span>Provisional offer</span>

              <h3>Conditions stay visible</h3>

              <p>
                The class, academic year, outstanding documents,
                approved fee schedule and response deadline remain
                visible before acceptance.
              </p>
            </article>

            <article>
              <span>Final confirmation</span>

              <h3>Admission follows authorised approval</h3>

              <p>
                Confirmation follows the applicable checks, document
                verification, authorised fee recording where relevant,
                and admission-register entry.
              </p>
            </article>
          </div>
        </PageContainer>
      </section>

      <section className="admissions-process-help">
        <PageContainer>
          <div>
            <p className="eyebrow">Not sure where to begin?</p>

            <h2>
              Start with an enquiry, not paperwork.
            </h2>
          </div>

          <p>
            Ask one question about availability, the right class,
            transport, fees, curriculum or a school visit before
            moving into a formal application.
          </p>

          <Link
            className="button button--primary"
            href="/admissions/enquire"
          >
            Make an enquiry
          </Link>
        </PageContainer>
      </section>
    </>
  );
}

function AgeCriteriaPage() {
  return (
    <>
      <section
        id="age-rule-status"
        className="admissions-band admissions-age-status"
        aria-labelledby="age-status-title"
      >
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--split">
            <div>
              <p className="eyebrow">Current rule status</p>

              <h2 id="age-status-title">
                What can be confirmed today?
              </h2>
            </div>

            <p>
              SSKEMS will publish the exact Maharashtra cut-off date,
              source order and any applicable relaxation only after the
              official record is archived and approved.
            </p>
          </div>

          <dl className="admissions-verification-grid admissions-age-verification-grid">
            <VerificationValue
              label="Academic year"
              value={ageRule.academicYear}
            />

            <VerificationValue
              label="Authority"
              value={ageRule.authority}
            />

            <VerificationValue
              label="Official Maharashtra cut-off"
              value="Government order required"
              pending
            />

            <VerificationValue
              label="Source government order"
              value="Archive record required"
              pending
            />
          </dl>

          <div className="admissions-age-source-panel">
            <div>
              <span>Why this remains pending</span>

              <strong>
                The checker must follow the approved State rule.
              </strong>

              <p>
                CBSE directs schools to follow the age limits established
                by the applicable State or Union Territory. The national
                Grade I age-six baseline can support planning, but it does
                not replace the exact Maharashtra record for the selected
                academic year.
              </p>
            </div>

            <div className="admissions-age-source-links">
              <a
                href={officialAdmissionsSources.cbseDirectAdmission}
                target="_blank"
                rel="noreferrer"
              >
                CBSE admission rules
                <span className="visually-hidden">
                  {" "}(opens in a new tab)
                </span>
              </a>

              <a
                href={officialAdmissionsSources.ministryGradeOneAge}
                target="_blank"
                rel="noreferrer"
              >
                Ministry Grade I baseline
                <span className="visually-hidden">
                  {" "}(opens in a new tab)
                </span>
              </a>
            </div>
          </div>
        </PageContainer>
      </section>


      <section
        className="admissions-band admissions-age-baselines"
        aria-labelledby="age-baseline-title"
      >
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--split">
            <div>
              <p className="eyebrow">
                Provisional planning baseline
              </p>

              <h2 id="age-baseline-title">
                A simple starting reference.
              </h2>
            </div>

            <p>
              These minimum-age baselines support planning only.
              They do not create a final date-of-birth window,
              maximum age or relaxation rule.
            </p>
          </div>

          <div className="admissions-age-baseline-grid">
            {provisionalAgeBaselines.map((row, index) => (
              <article key={row.entryClass}>
                <span>
                  {String(index + 1).padStart(2, "0")}
                </span>

                <p>Entry class</p>

                <h3>{row.entryClass}</h3>

                <div>
                  <small>Planning baseline</small>
                  <strong>{row.minimumAge}</strong>
                </div>

                <em>Government-order verification required</em>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>


      <section
        id="age-review-checker"
        className="admissions-band admissions-age-checker-section"
        aria-labelledby="age-checker-heading"
      >
        <PageContainer>
          <div className="admissions-age-checker-heading">
            <div>
              <p className="eyebrow">
                Age review tool
              </p>

              <h2 id="age-checker-heading">
                Check which review pathway applies.
              </h2>
            </div>

            <p>
              Until the current Maharashtra order is configured,
              every result safely returns manual review rather than
              guessing an eligibility decision.
            </p>
          </div>

          <AgeEligibilityChecker />
        </PageContainer>
      </section>


      <section className="admissions-age-closing">
        <PageContainer>
          <div>
            <p className="eyebrow">
              Need a class-specific answer?
            </p>

            <h2>
              Ask admissions before preparing documents.
            </h2>
          </div>

          <p>
            The school can guide you on the correct class and next step
            without requiring certificates in the initial enquiry.
          </p>

          <Link
            className="button button--primary"
            href="/admissions/enquire"
          >
            Make an enquiry
          </Link>
        </PageContainer>
      </section>
    </>
  );
}

function EnquirePage() {
  return (
    <>
      <section
        className="admissions-band admissions-enquiry-v2"
        aria-labelledby="enquiry-form-title"
      >
        <PageContainer className="admissions-enquiry-layout">
          <aside className="admissions-enquiry-intro">
            <p className="eyebrow">A simpler first step</p>

            <h2 id="enquiry-form-title">
              Tell us what you need help with.
            </h2>

            <p>
              An initial enquiry should be quick. We only need enough
              information to understand your question and respond.
            </p>

            <div className="admissions-enquiry-intro__points">
              <div>
                <span>01</span>
                <strong>No certificates</strong>
                <p>
                  Birth certificates, marksheets and transfer records
                  do not belong in this first step.
                </p>
              </div>

              <div>
                <span>02</span>
                <strong>No payment details</strong>
                <p>
                  Bank, card and fee-payment information is never
                  requested in an enquiry.
                </p>
              </div>

              <div>
                <span>03</span>
                <strong>One question is enough</strong>
                <p>
                  Ask about a class, fees, transport, curriculum,
                  accessibility or a school visit.
                </p>
              </div>
            </div>
          </aside>

          <EnquiryFormPrototype />
        </PageContainer>
      </section>

      <section
        className="admissions-band admissions-band--soft enquiry-boundaries-section"
        aria-labelledby="enquiry-boundaries-title"
      >
        <PageContainer className="enquiry-boundaries enquiry-boundaries--v2">
          <div className="admissions-section-heading">
            <p className="eyebrow">Privacy by stage</p>

            <h2 id="enquiry-boundaries-title">
              Share only what this step actually needs.
            </h2>

            <p>
              More detailed information belongs later, and only when
              it is genuinely required for the selected admission route.
            </p>
          </div>

          <div className="enquiry-boundary-card enquiry-boundary-card--now">
            <span>Now</span>
            <h3>Good things to ask</h3>
            <p>
              Availability, intended class, fees, curriculum, transport,
              visits, accessibility and callback preference.
            </p>
          </div>

          <div className="enquiry-boundary-card enquiry-boundary-card--later">
            <span>Later</span>
            <h3>Only when applicable</h3>
            <p>
              Age evidence, report cards, transfer records, category
              documents and relevant support information.
            </p>
          </div>

          <div className="enquiry-boundary-card enquiry-boundary-card--never">
            <span>Not here</span>
            <h3>Do not send these in an enquiry</h3>
            <p>
              Aadhaar, bank details, certificates, detailed medical
              records, marksheets or income evidence.
            </p>
          </div>
        </PageContainer>
      </section>
    </>
  );
}

function ApplyPage() {
  return (
    <>
      <PageContainer><AdmissionsReviewNotice>The formal application is an interactive blueprint only. Save, resume, uploads and submission stay off until durable encrypted storage, private files, authentication and staff permissions are ready.</AdmissionsReviewNotice></PageContainer>
      <section className="admissions-band" aria-label="Application journey prototype"><PageContainer><ApplicationJourneyPrototype /></PageContainer></section>
      <section className="admissions-band admissions-band--soft" aria-labelledby="application-rules-title">
        <PageContainer>
          <SectionHeading eyebrow="Routing rules" title="Some classes require special review" />
          <div className="admissions-policy-grid" id="application-rules-title">
            <article><span>Class X</span><h3>Not an ordinary direct-entry class</h3><p>Class X requires restricted transfer review, completion of Class IX and the applicable CBSE conditions.</p></article>
            <article><span>Class XII</span><h3>Not an ordinary direct-entry class</h3><p>Class XII requires restricted transfer review, completion of Class XI and the applicable CBSE conditions.</p></article>
            <article><span>After 31 August</span><h3>Authority review required</h3><p>Class IX and above cannot be processed as an ordinary late admission where prior permission is required.</p></article>
          </div>
        </PageContainer>
      </section>
    </>
  );
}

function StatusPage() {
  return (
    <>
      <PageContainer><AdmissionsReviewNotice>Status lookup is not connected. The production route will require an application reference, registered mobile number and one-time password (OTP).</AdmissionsReviewNotice></PageContainer>
      <section className="admissions-band" aria-label="Status lookup prototype"><PageContainer className="status-layout"><StatusLookupPrototype /><div><SectionHeading eyebrow="Parent-safe history" title="Only useful progress is shown"><p>Internal notes, staff discussions and risk flags remain private and are never exposed to parents.</p></SectionHeading><ul className="status-history-fields"><li>Date</li><li>Status</li><li>Parent action required</li><li>Deadline</li><li>Message</li></ul></div></PageContainer></section>
      <section className="admissions-band admissions-band--soft" aria-labelledby="status-language-title"><PageContainer><SectionHeading eyebrow="Status language" title="Plain words, protected detail" /><div className="admissions-table-wrap"><table className="admissions-table"><caption id="status-language-title">Internal-to-parent status mapping</caption><thead><tr><th scope="col">Workflow state</th><th scope="col">Parent-facing status</th></tr></thead><tbody>{admissionStatusExamples.map(([internal, parent]) => <tr key={internal}><th scope="row">{internal}</th><td data-label="Parent-facing status">{parent}</td></tr>)}</tbody></table></div></PageContainer></section>
    </>
  );
}

function DocumentsPage() {
  return (
    <>
      <section
        id="documents-checklist"
        className="admissions-band admissions-documents-v2"
        aria-labelledby="documents-list-title"
      >
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--split">
            <div>
              <p className="eyebrow">
                Conditional document checklist
              </p>

              <h2 id="documents-list-title">
                Prepare only what your admission route requires.
              </h2>
            </div>

            <p>
              The exact list depends on the class, previous school,
              board, transfer context and admission category.
              An initial enquiry does not require these documents.
            </p>
          </div>

          <div className="admissions-documents-grid">
            {documentChecklist.map((document, index) => (
              <article key={document.title}>
                <div className="admissions-documents-grid__top">
                  <span>
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <strong>Conditional</strong>
                </div>

                <h3>{document.title}</h3>

                <p>{document.note}</p>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>


      <section
        className="admissions-band admissions-documents-stages"
        aria-labelledby="documents-stage-title"
      >
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--split">
            <div>
              <p className="eyebrow">
                Documents by stage
              </p>

              <h2 id="documents-stage-title">
                Do not send paperwork too early.
              </h2>
            </div>

            <p>
              Personal documents should appear only at the stage where
              they are actually required for an authorised review.
            </p>
          </div>

          <div className="admissions-documents-stage-grid">
            <article className="admissions-documents-stage-card admissions-documents-stage-card--enquiry">
              <span>Stage 01</span>

              <h3>Initial enquiry</h3>

              <strong>No documents</strong>

              <p>
                Ask about availability, class, fees, transport,
                curriculum or a visit without sending certificates.
              </p>
            </article>

            <article className="admissions-documents-stage-card admissions-documents-stage-card--application">
              <span>Stage 02</span>

              <h3>Formal application</h3>

              <strong>Conditional checklist</strong>

              <p>
                The required evidence depends on the child&apos;s class,
                previous school, board and admission route.
              </p>
            </article>

            <article className="admissions-documents-stage-card admissions-documents-stage-card--verification">
              <span>Stage 03</span>

              <h3>School verification</h3>

              <strong>Authorised review</strong>

              <p>
                Staff review only the documents required for the
                applicable eligibility and admission checks.
              </p>
            </article>
          </div>
        </PageContainer>
      </section>


      <section className="admissions-band admissions-documents-privacy">
        <PageContainer className="admissions-documents-privacy__layout">
          <div>
            <p className="eyebrow">
              Private-document standard
            </p>

            <h2>
              Student documents should never behave like public website files.
            </h2>

            <p>
              When online document upload is eventually activated,
              files must remain private and accessible only through
              the authorised admissions workflow.
            </p>
          </div>

          <div className="admissions-documents-privacy__rules">
            <article>
              <span>01</span>
              <strong>Private storage</strong>
              <p>
                Applicant documents stay outside public media folders
                and public URLs.
              </p>
            </article>

            <article>
              <span>02</span>
              <strong>Controlled access</strong>
              <p>
                Only authorised staff should be able to view or
                download applicant records.
              </p>
            </article>

            <article>
              <span>03</span>
              <strong>File safety</strong>
              <p>
                Upload validation and malware scanning are required
                before real online submission is enabled.
              </p>
            </article>

            <article>
              <span>04</span>
              <strong>Access history</strong>
              <p>
                Sensitive document access should be auditable rather
                than anonymous.
              </p>
            </article>
          </div>
        </PageContainer>
      </section>


      <section className="admissions-documents-closing">
        <PageContainer>
          <div>
            <p className="eyebrow">
              Not sure what applies to your child?
            </p>

            <h2>
              Ask before collecting paperwork.
            </h2>
          </div>

          <p>
            Tell admissions the class and transfer context first.
            The school can then guide you toward the correct next step.
          </p>

          <Link
            className="button button--primary"
            href="/admissions/enquire"
          >
            Make an enquiry
          </Link>
        </PageContainer>
      </section>
    </>
  );
}

function FeesPage() {
  return (
    <>
      <section
        id="fee-publication-status"
        className="admissions-band admissions-fees-v2"
        aria-labelledby="fees-status-title"
      >
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--split">
            <div>
              <p className="eyebrow">
                2026-27 fee publication
              </p>

              <h2 id="fees-status-title">
                No unapproved amount is shown.
              </h2>
            </div>

            <p>
              A fee amount should be published only with the correct
              academic year, approving authority, effective date and
              controlled public schedule.
            </p>
          </div>

          <div className="admissions-fees-status-card">
            <div className="admissions-fees-status-card__main">
              <span>Current publication status</span>

              <strong>
                Approved public fee schedule pending
              </strong>

              <p>
                The controlled fee record exists in the document system,
                but the public academic-year schedule still requires
                authorised publication.
              </p>
            </div>

            <div className="admissions-fees-status-card__meta">
              <div>
                <span>Academic year</span>
                <strong>2026-27</strong>
              </div>

              <div>
                <span>Public amount</span>
                <strong>Not published</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>Approval required</strong>
              </div>
            </div>

            <div className="admissions-fees-status-card__actions">
              <Link
                className="button button--secondary"
                href="/documents/current-fee-structure"
              >
                Open controlled fee record
              </Link>

              <Link
                className="admissions-fees-status-card__text-link"
                href="/admissions/enquire"
              >
                Ask for current guidance{" "}
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </PageContainer>
      </section>


      <section
        className="admissions-band admissions-fees-publication"
        aria-labelledby="fees-publication-title"
      >
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--split">
            <div>
              <p className="eyebrow">
                Before fees go public
              </p>

              <h2 id="fees-publication-title">
                A useful schedule needs more than a number.
              </h2>
            </div>

            <p>
              Parents should be able to identify exactly which year,
              authority, charge and payment condition a published
              amount belongs to.
            </p>
          </div>

          <div className="admissions-fees-publication-grid">
            <article>
              <span>01</span>
              <p>Academic year</p>
              <h3>Correct cycle</h3>
              <small>
                The fee schedule must clearly identify the year
                to which every amount applies.
              </small>
            </article>

            <article>
              <span>02</span>
              <p>Authority</p>
              <h3>Approved source</h3>
              <small>
                Publication should identify the authorised schedule,
                not an old poster, message or copied amount.
              </small>
            </article>

            <article>
              <span>03</span>
              <p>Charges</p>
              <h3>Clear breakdown</h3>
              <small>
                Parents should be able to understand what each
                approved charge represents.
              </small>
            </article>

            <article>
              <span>04</span>
              <p>Timing</p>
              <h3>Dates and conditions</h3>
              <small>
                Applicable deadlines, instalments and conditions
                should accompany the published schedule.
              </small>
            </article>
          </div>
        </PageContainer>
      </section>


      <section
        className="admissions-band admissions-fees-safeguards"
        aria-labelledby="fees-safeguards-title"
      >
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--light">
            <p className="eyebrow">
              Payment safeguards
            </p>

            <h2 id="fees-safeguards-title">
              Clear before payment. Recorded after payment.
            </h2>

            <p>
              Fee communication, payment recording and official
              processes should remain distinct and traceable.
            </p>
          </div>

          <div className="admissions-fees-safeguard-grid">
            <article>
              <span>Before an offer</span>

              <h3>
                See the authorised schedule
              </h3>

              <p>
                Families should be able to review applicable charges,
                what they cover, deadlines and relevant conditions
                before completing an authorised payment.
              </p>
            </article>

            <article>
              <span>After payment</span>

              <h3>
                Record and receipt
              </h3>

              <p>
                Authorised payments should be recorded through the
                correct accounting boundary and accompanied by an
                appropriate receipt.
              </p>
            </article>

            <article>
              <span>RTE process</span>

              <h3>
                No unofficial payment
              </h3>

              <p>
                The regular school fee process must not be used to
                request unofficial payment for the official
                Maharashtra RTE admission process.
              </p>
            </article>
          </div>
        </PageContainer>
      </section>


      <section
        className="admissions-band admissions-fees-record"
        aria-labelledby="fee-record-title"
      >
        <PageContainer className="admissions-fees-record__layout">
          <div>
            <p className="eyebrow">
              Controlled document
            </p>

            <h2 id="fee-record-title">
              One public schedule. One controlled source.
            </h2>

            <p>
              When the authorised fee schedule is approved for
              publication, parents should reach it through the
              controlled document record rather than duplicated
              amounts across multiple pages.
            </p>
          </div>

          <aside>
            <span>Current fee structure</span>

            <strong>
              Public schedule awaiting approval
            </strong>

            <p>
              No amount is being inferred from previous academic
              years or unapproved material.
            </p>

            <Link
              className="button button--primary"
              href="/documents/current-fee-structure"
            >
              Open fee record
            </Link>
          </aside>
        </PageContainer>
      </section>


      <section className="admissions-fees-closing">
        <PageContainer>
          <div>
            <p className="eyebrow">
              Need current fee guidance?
            </p>

            <h2>
              Ask for the authorised schedule.
            </h2>
          </div>

          <p>
            Contact admissions for the current position rather than
            relying on an old fee amount, screenshot or forwarded message.
          </p>

          <Link
            className="button button--primary"
            href="/admissions/enquire"
          >
            Make an enquiry
          </Link>
        </PageContainer>
      </section>
    </>
  );
}

function FaqPage() {
  return (
    <>
      <section
        id="admissions-faq-list"
        className="admissions-band admissions-faq-v2"
        aria-labelledby="faq-title"
      >
        <PageContainer className="admissions-faq-v2__layout">
          <aside className="admissions-faq-v2__intro">
            <p className="eyebrow">
              Frequently asked questions
            </p>

            <h2 id="faq-title">
              Quick answers before you contact us.
            </h2>

            <p>
              These answers explain the current admissions position
              without guessing availability, dates, fees or eligibility.
            </p>

            <div className="admissions-faq-v2__topics">
              <span>Availability</span>
              <span>Age criteria</span>
              <span>Documents</span>
              <span>Transfers</span>
              <span>RTE</span>
              <span>Language</span>
            </div>
          </aside>

          <div
            className="admissions-faq admissions-faq-v2__list"
          >
            {admissionsFaq.map((item, index) => (
              <details key={item.question}>
                <summary>
                  <span>
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <strong>
                    {item.question}
                  </strong>

                  <i aria-hidden="true">+</i>
                </summary>

                <div>
                  <p>{item.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </PageContainer>
      </section>


      <section
        className="admissions-band admissions-faq-support"
        aria-labelledby="faq-support-title"
      >
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--split">
            <div>
              <p className="eyebrow">
                Still deciding what to do next?
              </p>

              <h2 id="faq-support-title">
                Use the right admissions route.
              </h2>
            </div>

            <p>
              Different questions belong in different parts of the
              admissions journey. Start with the smallest useful step.
            </p>
          </div>

          <div className="admissions-faq-support-grid">
            <Link href="/admissions/age-criteria">
              <span>Eligibility</span>

              <h3>
                Check age guidance
              </h3>

              <p>
                Review the current publication status and provisional
                planning baselines.
              </p>

              <strong>
                Age criteria{" "}
                <span aria-hidden="true">&rarr;</span>
              </strong>
            </Link>

            <Link href="/admissions/documents-required">
              <span>Preparation</span>

              <h3>
                See document guidance
              </h3>

              <p>
                Understand which documents may apply and when they
                should be provided.
              </p>

              <strong>
                Documents{" "}
                <span aria-hidden="true">&rarr;</span>
              </strong>
            </Link>

            <Link href="/admissions/fees">
              <span>Costs</span>

              <h3>
                Review fee status
              </h3>

              <p>
                See why no unapproved amount is published and where
                the controlled fee record belongs.
              </p>

              <strong>
                Fees{" "}
                <span aria-hidden="true">&rarr;</span>
              </strong>
            </Link>
          </div>
        </PageContainer>
      </section>


      <section className="admissions-faq-closing">
        <PageContainer>
          <div>
            <p className="eyebrow">
              Need an answer for your child?
            </p>

            <h2>
              Ask one clear question.
            </h2>
          </div>

          <p>
            A short enquiry is enough to ask about a class,
            availability, fees, transport, curriculum or a visit.
          </p>

          <Link
            className="button button--primary"
            href="/admissions/enquire"
          >
            Make an enquiry
          </Link>
        </PageContainer>
      </section>
    </>
  );
}

function ContactPage() {
  return (
    <>
      <section
        id="contact-channels"
        className="admissions-band admissions-contact-v2"
        aria-labelledby="contact-channels-title"
      >
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--split">
            <div>
              <p className="eyebrow">
                Verified public channels
              </p>

              <h2 id="contact-channels-title">
                Contact the school office.
              </h2>
            </div>

            <p>
              A separate admissions contact has not yet been approved,
              so admissions questions currently use the verified
              SSKEMS school-office channels.
            </p>
          </div>

          <div className="admissions-contact-v2__grid">
            <article className="admissions-contact-v2__card admissions-contact-v2__card--primary">
              <span>01 ? Main channel</span>

              <p>School office</p>

              <h3>
                General admissions help
              </h3>

              <div className="admissions-contact-v2__details">
                <div>
                  <small>Telephone</small>

                  <a href={`tel:${siteFacts.phone.replaceAll(" ", "")}`}>
                    {siteFacts.phone}
                  </a>
                </div>

                <div>
                  <small>Email</small>

                  <a href={`mailto:${siteFacts.email}`}>
                    {siteFacts.email}
                  </a>
                </div>

                <div>
                  <small>Office hours</small>

                  <strong>
                    {siteFacts.workingHours.weekdays}
                  </strong>

                  <strong>
                    {siteFacts.workingHours.saturday}
                  </strong>
                </div>
              </div>

              <div className="admissions-contact-v2__card-actions">
                <a
                  className="button button--primary"
                  href={`tel:${siteFacts.phone.replaceAll(" ", "")}`}
                >
                  Call school office
                </a>

                <a
                  className="admissions-contact-v2__text-link"
                  href={`mailto:${siteFacts.email}`}
                >
                  Send an email{" "}
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </article>


            <article className="admissions-contact-v2__card">
              <span>02 ? Escalation channel</span>

              <p>Principal office</p>

              <h3>
                Arrange the right conversation.
              </h3>

              <div className="admissions-contact-v2__details">
                <div>
                  <small>Mobile</small>

                  <a href={`tel:${siteFacts.mobile}`}>
                    {siteFacts.mobile}
                  </a>
                </div>

                <div>
                  <small>Email</small>

                  <a href={`mailto:${siteFacts.principalEmail}`}>
                    {siteFacts.principalEmail}
                  </a>
                </div>

                <div>
                  <small>Timing</small>

                  <strong>
                    Contact the school office to arrange a suitable time.
                  </strong>
                </div>
              </div>

              <div className="admissions-contact-v2__card-actions">
                <a
                  className="button button--secondary"
                  href={`tel:${siteFacts.mobile}`}
                >
                  Call principal office
                </a>

                <a
                  className="admissions-contact-v2__text-link"
                  href={`mailto:${siteFacts.principalEmail}`}
                >
                  Send an email{" "}
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </article>
          </div>
        </PageContainer>
      </section>


      <section
        className="admissions-band admissions-contact-message"
        aria-labelledby="contact-message-title"
      >
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--split">
            <div>
              <p className="eyebrow">
                Help us route your question
              </p>

              <h2 id="contact-message-title">
                A useful message can be very short.
              </h2>
            </div>

            <p>
              You do not need to explain the entire admission history
              or send documents just to ask an initial question.
            </p>
          </div>

          <div className="admissions-contact-message__grid">
            <article>
              <span>01</span>

              <p>Tell us</p>

              <h3>
                Academic year and class
              </h3>

              <small>
                Mention the academic year and the class you are
                considering for the child.
              </small>
            </article>

            <article>
              <span>02</span>

              <p>Choose the topic</p>

              <h3>
                What do you need help with?
              </h3>

              <small>
                For example: availability, fees, transport, curriculum,
                accessibility or a school visit.
              </small>
            </article>

            <article>
              <span>03</span>

              <p>Tell us how to reply</p>

              <h3>
                Preferred contact method
              </h3>

              <small>
                Include whether you prefer a phone call or email
                response and any useful timing information.
              </small>
            </article>
          </div>
        </PageContainer>
      </section>


      <section
        className="admissions-band admissions-contact-location"
        aria-labelledby="contact-location-title"
      >
        <PageContainer className="admissions-contact-location__layout">
          <div>
            <p className="eyebrow">
              Visit or write to the school
            </p>

            <h2 id="contact-location-title">
              SSKEMS ? Veral
            </h2>

            <p>
              This is the reviewed public postal address currently
              used by the school website.
            </p>
          </div>

          <address>
            <span>School address</span>

            <strong>
              {siteFacts.name}
            </strong>

            <p>
              {siteFacts.location}
            </p>

            <Link href="/admissions/visit">
              Plan a school visit{" "}
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </address>
        </PageContainer>
      </section>


      <section className="admissions-contact-privacy">
        <PageContainer className="admissions-contact-privacy__layout">
          <div>
            <p className="eyebrow">
              Protect student information
            </p>

            <h2>
              Do not email sensitive documents with a first enquiry.
            </h2>
          </div>

          <div className="admissions-contact-privacy__content">
            <p>
              Aadhaar, certificates, marksheets, bank details,
              income evidence and detailed medical records do not
              belong in an ordinary admissions email.
            </p>

            <p>
              If a document is later required, use only the
              school-approved process for that admission stage.
            </p>
          </div>
        </PageContainer>
      </section>


      <section className="admissions-contact-closing">
        <PageContainer>
          <div>
            <p className="eyebrow">
              Prefer the guided route?
            </p>

            <h2>
              Start with the short admissions enquiry.
            </h2>
          </div>

          <p>
            The enquiry page helps structure your question without
            collecting certificates or unnecessary applicant details.
          </p>

          <Link
            className="button button--primary"
            href="/admissions/enquire"
          >
            Make an enquiry
          </Link>
        </PageContainer>
      </section>
    </>
  );
}

function RtePage() {
  return (
    <>
      <section className="admissions-band" aria-labelledby="rte-route-title"><PageContainer className="rte-route"><div><p className="eyebrow">Separate official route</p><h2 id="rte-route-title">Use the Maharashtra RTE portal</h2><p>The ordinary SSKEMS enquiry or regular school application is not the official RTE 25% application. Use the School Education and Sports Department process and follow the current official notification.</p><a className="button button--primary" href={officialAdmissionsSources.maharashtraRte} target="_blank" rel="noreferrer">Open Maharashtra education portal <span className="visually-hidden">(opens in a new tab)</span></a></div><aside><span>Before production publication</span><strong>Participation must be verified</strong><p>SSKEMS participation, entry class, dates, eligibility rules and post-allotment requirements are not yet approved for this page.</p></aside></PageContainer></section>
      <section className="admissions-band admissions-band--soft"><PageContainer><div className="admissions-policy-grid"><article><span>Apply</span><h3>Official state process</h3><p>Do not use the regular school form as a substitute.</p></article><article><span>After allotment</span><h3>School verification</h3><p>The school will publish the verified appointment and document procedure.</p></article><article><span>Payments</span><h3>No unofficial charges</h3><p>Report any request that conflicts with the official process.</p></article></div></PageContainer></section>
    </>
  );
}

function TransfersPage() {
  return (
    <section className="admissions-band" aria-labelledby="transfer-rules-title"><PageContainer><SectionHeading eyebrow="CBSE admission rules" title="Prior class, timing and authority matter" /><div className="transfer-rule-grid" id="transfer-rules-title"><article><span>Class IX</span><h3>Passed Class VIII</h3><p>The previous institution must be CBSE-affiliated, another recognised board, or recognised by the relevant State education department.</p></article><article><span>Class XI</span><h3>Passed Class X or equivalent</h3><p>Subject combinations, prerequisites and the programme actually offered by SSKEMS still require confirmation.</p></article><article><span>Class IXâ€“XII</span><h3>After 31 August</h3><p>Admission after 31 August requires prior permission from the competent authority except in specified late-result circumstances. Attendance feasibility also matters.</p></article></div><p className="admissions-source-note">Official source: <a href={officialAdmissionsSources.cbseDirectAdmission} target="_blank" rel="noreferrer">CBSE Direct Admission rules <span className="visually-hidden">(opens in a new tab)</span></a>.</p></PageContainer></section>
  );
}

function SchoolPage() {
  return (
    <section className="admissions-band" aria-labelledby="school-route-title"><PageContainer><SectionHeading eyebrow="Classes Iâ€“VIII" title="Maharashtra-specific eligibility"><p>CBSE delegates admission through Class VIII to the applicable State rules. The school must therefore configure Maharashtra age and previous-class rules rather than present a generic â€œCBSE age ruleâ€.</p></SectionHeading><div className="admissions-policy-grid" id="school-route-title"><article><span>Age</span><h3>Official cut-off record</h3><p>The 2026â€“27 Maharashtra order and any relaxation must be approved first.</p></article><article><span>Prior learning</span><h3>Previous-class eligibility</h3><p>For classes above entry level, age alone is not enough.</p></article><article><span>Family support</span><h3>Non-selective orientation</h3><p>Interactions help plan language, learning, accessibility, health and transport support; they are not screening tests.</p></article></div></PageContainer></section>
  );
}

function SeniorSecondaryPage() {
  return (
    <section className="admissions-band" aria-labelledby="senior-rules-title"><PageContainer><SectionHeading eyebrow="Classes IXâ€“XII" title="Programme and transfer rules before promotion"><p><a href={officialAdmissionsSources.cbseSaras} target="_blank" rel="noreferrer">CBSE SARAS records SSKEMS as a Senior Secondary school <span className="visually-hidden">(opens in a new tab)</span></a>. A separately named Junior College or Maharashtra FYJC pathway must not be presented as current until management confirms its board and programme.</p></SectionHeading><div className="admissions-policy-grid" id="senior-rules-title"><article><span>Class X</span><h3>Restricted, not ordinary open entry</h3><p>Completion of Class IX and the specific CBSE transfer conditions must be checked.</p></article><article><span>Class XI</span><h3>Programme confirmation required</h3><p>A passed Class X or recognised equivalent, approved subjects and actual school availability are required.</p></article><article><span>Class XII</span><h3>Restricted, not ordinary open entry</h3><p>Completion of Class XI and the applicable transfer conditions must be checked.</p></article></div><div className="fyjc-note"><strong>Important FYJC distinction</strong><p>Maharashtraâ€™s centralised Class XI portal applies to its State Board process. Do not direct a CBSE applicant there as mandatory unless SSKEMS confirms that the intended programme is governed by FYJC.</p><a href={officialAdmissionsSources.maharashtraClassEleven} target="_blank" rel="noreferrer">View the official Maharashtra FYJC portal <span className="visually-hidden">(opens in a new tab)</span></a></div></PageContainer></section>
  );
}

function VisitPage() {
  return (
    <>
      <section
        id="visit-options"
        className="admissions-band admissions-visit-v2"
        aria-labelledby="visit-options-title"
      >
        <PageContainer className="admissions-visit-layout">
          <aside className="admissions-visit-intro">
            <p className="eyebrow">
              Plan before you arrive
            </p>

            <h2 id="visit-options-title">
              Make the school visit useful.
            </h2>

            <p>
              A visit is a chance to understand routines, ask practical
              questions and discuss any accessibility or communication
              support your family may need.
            </p>

            <div className="admissions-visit-intro__points">
              <div>
                <span>01</span>
                <strong>Arrange the appointment</strong>
                <p>
                  School opening hours do not automatically mean an
                  admissions appointment is available.
                </p>
              </div>

              <div>
                <span>02</span>
                <strong>Share support needs early</strong>
                <p>
                  Tell the office about mobility, communication or
                  interpretation needs when arranging the visit.
                </p>
              </div>

              <div>
                <span>03</span>
                <strong>Bring questions, not paperwork</strong>
                <p>
                  Curriculum, routines, transport and fee guidance can
                  be discussed without bringing sensitive documents.
                </p>
              </div>
            </div>

            <div className="admissions-visit-office">
              <span>Current booking route</span>

              <strong>
                Contact the school office
              </strong>

              <a
                href={`tel:${siteFacts.phone.replaceAll(" ", "")}`}
              >
                {siteFacts.phone}
              </a>

              <small>
                {siteFacts.workingHours.weekdays}
              </small>

              <small>
                {siteFacts.workingHours.saturday}
              </small>
            </div>
          </aside>

          <VisitRequestPrototype />
        </PageContainer>
      </section>


      <section
        className="admissions-band admissions-visit-prepare"
        aria-labelledby="visit-prepare-title"
      >
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--split">
            <div>
              <p className="eyebrow">
                Before you arrive
              </p>

              <h2 id="visit-prepare-title">
                Three things to confirm first.
              </h2>
            </div>

            <p>
              A confirmed appointment and a little preparation make
              it much easier for the school to give your family useful
              guidance during the visit.
            </p>
          </div>

          <div className="admissions-visit-prepare-grid">
            <article>
              <span>01</span>

              <p>Confirm</p>

              <h3>
                Date and arrival point
              </h3>

              <small>
                Ask the office to confirm the appointment date,
                reporting location and any arrival instructions.
              </small>
            </article>

            <article>
              <span>02</span>

              <p>Request</p>

              <h3>
                Accessibility support
              </h3>

              <small>
                Mention mobility, interpretation or communication
                requirements while arranging the appointment.
              </small>
            </article>

            <article>
              <span>03</span>

              <p>Prepare</p>

              <h3>
                Your priority questions
              </h3>

              <small>
                Write down the things that matter most to your family
                so the visit stays focused.
              </small>
            </article>
          </div>
        </PageContainer>
      </section>


      <section
        className="admissions-band admissions-visit-discuss"
        aria-labelledby="visit-discuss-title"
      >
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--light">
            <p className="eyebrow">
              What can you discuss?
            </p>

            <h2 id="visit-discuss-title">
              Use the visit to understand daily school life.
            </h2>

            <p>
              The visit can answer practical questions without turning
              the first meeting into a document-verification exercise.
            </p>
          </div>

          <div className="admissions-visit-discuss-grid">
            <article>
              <span>01</span>
              <strong>Curriculum</strong>
              <p>
                Ask about the applicable school programme and the
                learning experience for the class you are considering.
              </p>
            </article>

            <article>
              <span>02</span>
              <strong>Daily routines</strong>
              <p>
                Understand timings, arrival, departure and the practical
                rhythm of the school day.
              </p>
            </article>

            <article>
              <span>03</span>
              <strong>Student support</strong>
              <p>
                Discuss language, accessibility or other relevant
                support without sending detailed private records.
              </p>
            </article>

            <article>
              <span>04</span>
              <strong>Transport</strong>
              <p>
                Ask about the current transport position and which
                details still need school confirmation.
              </p>
            </article>

            <article>
              <span>05</span>
              <strong>Fee guidance</strong>
              <p>
                Request the authorised current schedule rather than
                relying on an old amount or forwarded message.
              </p>
            </article>

            <article>
              <span>06</span>
              <strong>Next step</strong>
              <p>
                Confirm whether your family should enquire further,
                prepare documents or move toward formal application.
              </p>
            </article>
          </div>
        </PageContainer>
      </section>


      <section className="admissions-visit-privacy">
        <PageContainer className="admissions-visit-privacy__layout">
          <div>
            <p className="eyebrow">
              First visit, minimal data
            </p>

            <h2>
              You normally do not need sensitive documents just to visit.
            </h2>
          </div>

          <div>
            <p>
              Do not bring or email Aadhaar, bank information, detailed
              medical records or other sensitive records simply to ask
              initial admissions questions.
            </p>

            <p>
              If a document later becomes relevant, follow the approved
              process for that stage of admission.
            </p>
          </div>
        </PageContainer>
      </section>


      <section className="admissions-visit-closing">
        <PageContainer>
          <div>
            <p className="eyebrow">
              Ready to arrange a visit?
            </p>

            <h2>
              Contact the school office first.
            </h2>
          </div>

          <p>
            Online visit booking is not active yet. The verified school
            office can confirm a suitable appointment.
          </p>

          <Link
            className="button button--primary"
            href="/admissions/contact"
          >
            Contact SSKEMS
          </Link>
        </PageContainer>
      </section>
    </>
  );
}

function contentFor(page: PageKey) {
  switch (page) {
    case "process": return <ProcessPage />;
    case "age-criteria": return <AgeCriteriaPage />;
    case "enquire": return <EnquirePage />;
    case "apply": return <ApplyPage />;
    case "application-status": return <StatusPage />;
    case "documents-required": return <DocumentsPage />;
    case "fees": return <FeesPage />;
    case "faq": return <FaqPage />;
    case "contact": return <ContactPage />;
    case "rte": return <RtePage />;
    case "class-9-and-11-transfers": return <TransfersPage />;
    case "school": return <SchoolPage />;
    case "senior-secondary": return <SeniorSecondaryPage />;
    case "visit": return <VisitPage />;
  }
}

function pageKey(section: string[]): PageKey | null {
  if (section.length !== 1) return null;
  const candidate = section[0] as PageKey;
  return candidate in pageDetails ? candidate : null;
}

export function generateStaticParams() {
  return Object.keys(pageDetails).map((section) => ({ section: [section] }));
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { section } = await params;
  const key = pageKey(section);
  if (!key) return { title: "Admissions page not found" };
  const details = pageDetails[key];
  return {
    title: details.title,
    description: details.summary,
    alternates: { canonical: `/admissions/${key}` },
    robots: { index: false, follow: true },
  };
}

export default async function AdmissionsSubPage({ params }: RouteProps) {
  const { section } = await params;
  const key = pageKey(section);

  if (!key) notFound();

  const details = pageDetails[key];

  const enquiryPage = key === "enquire";
  const processPage = key === "process";
  const agePage = key === "age-criteria";
  const documentsPage = key === "documents-required";
  const feesPage = key === "fees";
  const faqPage = key === "faq";
  const contactPage = key === "contact";
  const visitPage = key === "visit";

  const cinematicPage =
    enquiryPage ||
    processPage ||
    agePage ||
    documentsPage ||
    feesPage ||
    faqPage ||
    contactPage ||
    visitPage;

  const heroActions = enquiryPage ? (
    <>
      <a
        className="button button--primary admissions-hero__primary-action"
        href="#enquiry-form"
      >
        Start the enquiry
      </a>

      <Link
        className="admissions-hero__secondary-action"
        href="/admissions"
      >
        Admissions overview
      </Link>
    </>
  ) : processPage ? (
    <>
      <a
        className="button button--primary admissions-hero__primary-action"
        href="#admissions-process-journey"
      >
        View the 8 stages
      </a>

      <Link
        className="admissions-hero__secondary-action"
        href="/admissions/enquire"
      >
        Make an enquiry
      </Link>
    </>
  ) : agePage ? (
    <>
      <a
        className="button button--primary admissions-hero__primary-action"
        href="#age-rule-status"
      >
        See current rule status
      </a>

      <a
        className="admissions-hero__secondary-action"
        href="#age-review-checker"
      >
        Open age review tool
      </a>
    </>
  ) : documentsPage ? (
    <>
      <a
        className="button button--primary admissions-hero__primary-action"
        href="#documents-checklist"
      >
        View document guidance
      </a>

      <Link
        className="admissions-hero__secondary-action"
        href="/admissions/enquire"
      >
        Ask admissions
      </Link>
    </>
  ) : feesPage ? (
    <>
      <a
        className="button button--primary admissions-hero__primary-action"
        href="#fee-publication-status"
      >
        See fee publication status
      </a>

      <Link
        className="admissions-hero__secondary-action"
        href="/admissions/enquire"
      >
        Ask for current guidance
      </Link>
    </>
  ) : faqPage ? (
    <>
      <a
        className="button button--primary admissions-hero__primary-action"
        href="#admissions-faq-list"
      >
        Browse questions
      </a>

      <Link
        className="admissions-hero__secondary-action"
        href="/admissions/enquire"
      >
        Ask admissions
      </Link>
    </>
  ) : contactPage ? (
    <>
      <a
        className="button button--primary admissions-hero__primary-action"
        href="#contact-channels"
      >
        View contact options
      </a>

      <Link
        className="admissions-hero__secondary-action"
        href="/admissions/enquire"
      >
        Make an enquiry
      </Link>
    </>
  ) : visitPage ? (
    <>
      <a
        className="button button--primary admissions-hero__primary-action"
        href="#visit-options"
      >
        Plan your visit
      </a>

      <Link
        className="admissions-hero__secondary-action"
        href="/admissions/contact"
      >
        Contact school office
      </Link>
    </>
  ) : undefined;

  const heroAside = enquiryPage ? (
    <aside
      className="admissions-cycle-card admissions-enquiry-hero-card"
      aria-label="What you need for an enquiry"
    >
      <div>
        <span>For this first step</span>
        <strong>Keep it simple</strong>
      </div>

      <p>You only need</p>

      <small>
        Your contact details, the class you are considering,
        and the question you want the school to answer.
      </small>

      <Link href="/admissions/contact">
        Prefer to contact the school directly?{" "}
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </aside>
  ) : processPage ? (
    <aside
      className="admissions-cycle-card admissions-process-hero-card"
      aria-label="Admissions process summary"
    >
      <div>
        <span>The complete journey</span>
        <strong>8 stages</strong>
      </div>

      <p>From first check to confirmation</p>

      <small>
        Eligibility, enquiry, school contact, application,
        review, orientation, provisional offer and final
        admission confirmation remain distinct stages.
      </small>

      <Link href="/admissions/enquire">
        Ask a question first{" "}
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </aside>
  ) : agePage ? (
    <aside
      className="admissions-cycle-card admissions-age-hero-card"
      aria-label="Age rule publication status"
    >
      <div>
        <span>2026-27 age guidance</span>
        <strong>Verification required</strong>
      </div>

      <p>Exact cut-off not yet published</p>

      <small>
        The Maharashtra government order, exact cut-off date
        and source record must be approved before a final
        date-of-birth calculation can be shown.
      </small>

      <a href="#age-rule-status">
        See what is confirmed{" "}
        <span aria-hidden="true">&rarr;</span>
      </a>
    </aside>
  ) : documentsPage ? (
    <aside
      className="admissions-cycle-card admissions-documents-hero-card"
      aria-label="Document checklist guidance"
    >
      <div>
        <span>Document guidance</span>
        <strong>Conditional</strong>
      </div>

      <p>Not every document applies to every child</p>

      <small>
        Requirements depend on class, previous school,
        board, transfer context and admission category.
      </small>

      <Link href="/admissions/enquire">
        Ask which route applies{" "}
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </aside>
  ) : feesPage ? (
    <aside
      className="admissions-cycle-card admissions-fees-hero-card"
      aria-label="Fee publication status"
    >
      <div>
        <span>2026-27 fee guidance</span>
        <strong>Approval required</strong>
      </div>

      <p>No unapproved fee amount is shown</p>

      <small>
        The authorised public schedule must identify the
        academic year, authority, effective date and
        applicable charges before amounts are published.
      </small>

      <a href="#fee-publication-status">
        See current status{" "}
        <span aria-hidden="true">&rarr;</span>
      </a>
    </aside>
  ) : faqPage ? (
    <aside
      className="admissions-cycle-card admissions-faq-hero-card"
      aria-label="Admissions frequently asked questions"
    >
      <div>
        <span>Quick guidance</span>
        <strong>{admissionsFaq.length} questions</strong>
      </div>

      <p>Current admissions answers</p>

      <small>
        Availability, age, documents, transfers, RTE and
        language guidance are explained without inventing
        unapproved information.
      </small>

      <a href="#admissions-faq-list">
        Browse the answers{" "}
        <span aria-hidden="true">&rarr;</span>
      </a>
    </aside>
  ) : contactPage ? (
    <aside
      className="admissions-cycle-card admissions-contact-hero-card"
      aria-label="Verified admissions contact channels"
    >
      <div>
        <span>Verified channels</span>
        <strong>School office</strong>
      </div>

      <p>No dedicated admissions contact published yet</p>

      <small>
        Admissions questions currently use the verified
        general school-office and principal-office channels.
      </small>

      <a href="#contact-channels">
        View contact details{" "}
        <span aria-hidden="true">&rarr;</span>
      </a>
    </aside>
  ) : visitPage ? (
    <aside
      className="admissions-cycle-card admissions-visit-hero-card"
      aria-label="School visit booking status"
    >
      <div>
        <span>Visit booking</span>
        <strong>Contact the office</strong>
      </div>

      <p>Online booking is not active yet</p>

      <small>
        The verified school office can arrange a suitable
        appointment and note any accessibility or communication
        support required for the visit.
      </small>

      <a href="#visit-options">
        Plan before you arrive{" "}
        <span aria-hidden="true">&rarr;</span>
      </a>
    </aside>
  ) : undefined;

  return (
    <AdmissionsPageFrame
      eyebrow={details.eyebrow}
      title={details.title}
      summary={details.summary}
      actions={
        !(
          [
            "process",
            "enquire",
            "apply",
            "application-status",
            "age-criteria",
            "documents-required",
            "fees",
            "faq",
            "contact",
            "visit",
          ] as PageKey[]
        ).includes(key)
      }
      landing={cinematicPage}
      heroActions={heroActions}
      heroAside={heroAside}
    >
      {contentFor(key)}
    </AdmissionsPageFrame>
  );
}
