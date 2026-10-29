import type { Metadata } from "next";
import Link from "next/link";

import {
  academicLinks,
  appendixSections,
  disclosureReview,
  generalInformation,
  infrastructureFacts,
  resultRows,
  teachingStaffSummary,
} from "@/app/data/disclosure";
import { mandatoryDocuments } from "@/app/data/documents";
import { saras7SectionBDocuments, saras7SectionCDocuments, saras7Source, saras7Staff } from "@/app/data/saras7-disclosure";
import { siteFacts } from "@/app/data/site";
import {
  ComplianceSectionHeading,
  DisclosureFactTable,
  MandatoryDocumentTable,
  VerificationState,
} from "@/components/compliance";
import { Alert } from "@/components/content";
import { PageContainer } from "@/components/layout";
import { PrintButton } from "@/components/print-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Mandatory Public Disclosure",
  description: "SSKEMS Appendix IX Mandatory Public Disclosure, with SARAS 7.0 source records and explicit verification status.",
  alternates: { canonical: "/mandatory-public-disclosure" },
  robots: { index: false, follow: true },
};

export default function MandatoryPublicDisclosurePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="compliance-page">
        <header className="compliance-hero">
          <PageContainer className="compliance-hero__grid">
            <div>
              <p className="eyebrow">Appendix IX · SARAS 7.0 source review</p>
              <h1>Mandatory Public Disclosure</h1>
              <p className="compliance-hero__marathi" lang="mr">अनिवार्य सार्वजनिक प्रकटीकरण</p>
              <p className="lead">{siteFacts.name}</p>
              <div className="compliance-hero__actions">
                <PrintButton />
                <a className="button button--quiet" href={`mailto:${disclosureReview.reportEmail}?subject=Broken%20document%20report%20-%20SSKEMS`}>Report a broken document</a>
              </div>
            </div>
            <aside className="compliance-register" aria-label="Disclosure review status">
              <p className="eyebrow">Disclosure source review</p>
              <strong>{disclosureReview.approvalState}</strong>
              <dl>
                <div><dt>Source received</dt><dd>{disclosureReview.reviewedOn}</dd></div>
                <div><dt>Affiliation no.</dt><dd>{siteFacts.affiliationNumber}</dd></div>
                <div><dt>Source</dt><dd>SARAS 7.0 · Appendix IX</dd></div>
                <div><dt>School code</dt><dd>30780</dd></div>
                <div><dt>Compliance contact</dt><dd><a href={`mailto:${disclosureReview.reportEmail}`}>{disclosureReview.reportEmail}</a></dd></div>
              </dl>
            </aside>
          </PageContainer>
        </header>

        <PageContainer>
          <Alert title="Compliance warning: approved records are still required" kind="warning">
            The school-supplied SARAS 7.0 Appendix IX file has been transcribed, but this is not a declaration of completed CBSE compliance. Its document links, 2026 results, staffing and facilities still require school approval and evidence checks. Original WordPress PDF references are recorded for validation; downloads continue to use the existing approved-document publication system.
          </Alert>

          <nav className="appendix-index" aria-label="Appendix IX sections">
            <p>On this page</p>
            <ol>
              {appendixSections.map((section) => <li key={section.id}><a href={`#${section.id}`}><span>{section.letter}</span>{section.title}</a></li>)}
            </ol>
          </nav>

          <section className="compliance-section" aria-labelledby="section-a-title" id="section-a">
            <ComplianceSectionHeading letter="A" title="General information" id="section-a-title" />
            <DisclosureFactTable rows={generalInformation} caption="Section A — General information and review status" />
            <p className="source-note">Source: {saras7Source.description}. The submitted contact number differs from the site contact records, and Section A abbreviates the principal’s name. Confirm these against authorised school records before publication.</p>
          </section>

          <section className="compliance-section" aria-labelledby="section-b-title" id="section-b">
            <ComplianceSectionHeading letter="B" title="Documents and information" id="section-b-title">
              <p>Eight prescribed rows are retained in their required order. The supplied PDF includes {saras7SectionBDocuments.length} legacy document URLs, recorded for file verification. Links remain gated by the existing document-approval workflow.</p>
            </ComplianceSectionHeading>
            <MandatoryDocumentTable documents={mandatoryDocuments} />
            <p className="source-note">The {saras7SectionBDocuments.length} source URLs are preserved in the SARAS import register for document administrators; listing a URL in the supplied PDF does not establish its validity, self-attestation or publication approval.</p>
          </section>

          <section className="compliance-section" aria-labelledby="section-c-title" id="section-c">
            <ComplianceSectionHeading letter="C" title="Results and academics" id="section-c-title" />
            <div className="academic-document-links">
              {academicLinks.map((item) => <Link href={item.href} key={item.href}>{item.label}<span>Review required →</span></Link>)}
            </div>
            <p className="source-note">The submitted PDF lists five academic document URLs, including a “last three-year result” PDF. Only the 2026 Class X and Class XII result figures are tabulated in the supplied Appendix IX; earlier yearly figures have not been inferred. {saras7SectionCDocuments.length} source references are retained for verification.</p>
            <div className="compliance-table-wrap">
              <table className="compliance-table compliance-table--results">
                <caption>Reported 2026 Class X and XII board results from supplied SARAS 7.0 file</caption>
                <thead><tr><th scope="col">Class</th><th scope="col">Year</th><th scope="col">Registered</th><th scope="col">Passed</th><th scope="col">Pass percentage</th><th scope="col">Remarks</th></tr></thead>
                <tbody>{resultRows.map((row) => <tr key={`${row.classLevel}-${row.year}`}><th scope="row">{row.classLevel}</th><td data-label="Year">{row.year}</td><td data-label="Registered">{row.registered}</td><td data-label="Passed">{row.passed}</td><td data-label="Pass percentage">{row.percentage}% (as reported)</td><td data-label="Remarks">{row.remarks}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="source-note">Verification note: 26 out of 28 Class XII passes conventionally rounds to 92.86%, but the supplied PDF prints 92.85%. The source value is displayed unchanged pending clarification.</p>
          </section>

          <section className="compliance-section" aria-labelledby="section-d-title" id="section-d">
            <ComplianceSectionHeading letter="D" title="Teaching staff" id="section-d-title" />
            <div className="compliance-summary-grid">
              {teachingStaffSummary.map((item) => <div className="compliance-summary-item" key={item.label}><span>{item.label}</span><strong>{item.value}</strong>{item.note ? <small>{item.note}</small> : null}<VerificationState state={item.state} /></div>)}
            </div>
            <p className="source-note">The detailed Section F register contains {saras7Staff.length} personnel, including non-teaching “OTHER” entries. Counts in Sections D and F require reconciliation; the submitted numbers have not been silently corrected.</p>
            <Link className="button button--secondary" href="/mandatory-public-disclosure/teaching-staff">Review the supplied Section F staff register</Link>
          </section>

          <section className="compliance-section" aria-labelledby="section-e-title" id="section-e">
            <ComplianceSectionHeading letter="E" title="School infrastructure" id="section-e-title" />
            <div className="compliance-table-wrap">
              <table className="compliance-table">
                <caption>Section E — Source-reported infrastructure figures awaiting verification</caption>
                <thead><tr><th scope="col">Infrastructure item</th><th scope="col">Public value</th><th scope="col">Review status</th></tr></thead>
                <tbody>{infrastructureFacts.map((fact) => <tr key={fact.label}><th scope="row">{fact.label}</th><td data-label="Public value"><strong>{fact.value}</strong>{fact.note ? <small>{fact.note}</small> : null}</td><td data-label="Review status"><VerificationState state="approval-required" /></td></tr>)}</tbody>
              </table>
            </div>
            <Link className="button button--secondary" href="/mandatory-public-disclosure/infrastructure-inspection">Open the infrastructure inspection page</Link>
          </section>

          <section className="compliance-section" aria-labelledby="section-f-title" id="section-f">
            <ComplianceSectionHeading letter="F" title="Teacher details" id="section-f-title">
              <p>The source PDF lists {saras7Staff.length} personnel by name, designation and qualification, including teaching and other staff. School approval and staff-category reconciliation remain outstanding.</p>
            </ComplianceSectionHeading>
            <Link className="button button--secondary" href="/mandatory-public-disclosure/teaching-staff">Open the 58-person SARAS staff register</Link>
          </section>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
