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
  description: "SSKEMS Mandatory Public Disclosure in the revised Appendix IX five-section HTML format.",
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
              <p className="eyebrow">Appendix IX – Revised Format</p>
              <h1>Mandatory Public Disclosure</h1>
              <p className="compliance-hero__marathi" lang="mr">अनिवार्य सार्वजनिक प्रकटीकरण</p>
              <p className="lead">{siteFacts.name}</p>
              <div className="compliance-hero__actions">
                <PrintButton />
                <a className="button button--quiet" href={`mailto:${disclosureReview.reportEmail}?subject=Broken%20document%20report%20-%20SSKEMS`}>Report a broken document</a>
              </div>
            </div>
            <aside className="compliance-register" aria-label="Disclosure review status">
              <p className="eyebrow">Public register review</p>
              <strong>{disclosureReview.approvalState}</strong>
              <dl>
                <div><dt>Last reviewed</dt><dd>{disclosureReview.reviewedOn}</dd></div>
                <div><dt>Affiliation no.</dt><dd>{siteFacts.affiliationNumber}</dd></div>
                <div><dt>Validity candidate</dt><dd>1 April 2022–31 March 2027</dd></div>
                <div><dt>School code</dt><dd>30780</dd></div>
                <div><dt>Compliance contact</dt><dd><a href={`mailto:${disclosureReview.reportEmail}`}>{disclosureReview.reportEmail}</a></dd></div>
              </dl>
            </aside>
          </PageContainer>
        </header>

        <PageContainer>
          <Alert title="Compliance warning: approved records are still required" kind="warning">
            This is a transparent Stage 2 review foundation, not a declaration of completed CBSE compliance. No PDF is exposed until its authority, dates, self-attestation, privacy, accessibility and public file have been approved.
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
            <p className="source-note">Authority baseline: <a href="https://saras.cbse.gov.in/SARAS/AffiliatedList/AfflicationDetails/1130851" target="_blank" rel="noreferrer">CBSE SARAS affiliation record <span className="visually-hidden">(opens in a new tab)</span></a>. Principal name and postal PIN still require school approval because public records conflict.</p>
          </section>

          <section className="compliance-section" aria-labelledby="section-b-title" id="section-b">
            <ComplianceSectionHeading letter="B" title="Documents and information" id="section-b-title">
              <p>Eight prescribed rows are retained in their required order. Missing approvals are shown as compliance actions, never as silent placeholders.</p>
            </ComplianceSectionHeading>
            <MandatoryDocumentTable documents={mandatoryDocuments} />
          </section>

          <section className="compliance-section" aria-labelledby="section-c-title" id="section-c">
            <ComplianceSectionHeading letter="C" title="Results and academics" id="section-c-title" />
            <div className="academic-document-links">
              {academicLinks.map((item) => <Link href={item.href} key={item.href}>{item.label}<span>Review required →</span></Link>)}
            </div>
            <div className="compliance-table-wrap">
              <table className="compliance-table compliance-table--results">
                <caption>Last three applicable academic years of Class X and Class XII results</caption>
                <thead><tr><th scope="col">Class</th><th scope="col">Year</th><th scope="col">Registered</th><th scope="col">Passed</th><th scope="col">Pass percentage</th><th scope="col">Remarks</th></tr></thead>
                <tbody>{resultRows.map((row) => <tr key={`${row.classLevel}-${row.year}`}><th scope="row">{row.classLevel}</th><td data-label="Year">{row.year}</td><td data-label="Registered">Verification required</td><td data-label="Passed">Verification required</td><td data-label="Pass percentage">Calculated after approval</td><td data-label="Remarks">{row.remarks}</td></tr>)}</tbody>
              </table>
            </div>
          </section>

          <section className="compliance-section" aria-labelledby="section-d-title" id="section-d">
            <ComplianceSectionHeading letter="D" title="Teaching staff" id="section-d-title" />
            <div className="compliance-summary-grid">
              {teachingStaffSummary.map((item) => <div className="compliance-summary-item" key={item.label}><span>{item.label}</span><strong>{item.value}</strong><VerificationState state={item.state} /></div>)}
            </div>
            <Link className="button button--secondary" href="/mandatory-public-disclosure/teaching-staff">Open the public teaching-staff register</Link>
          </section>

          <section className="compliance-section" aria-labelledby="section-e-title" id="section-e">
            <ComplianceSectionHeading letter="E" title="School infrastructure" id="section-e-title" />
            <div className="compliance-table-wrap">
              <table className="compliance-table">
                <caption>Section E — Infrastructure facts awaiting approved evidence</caption>
                <thead><tr><th scope="col">Infrastructure item</th><th scope="col">Public value</th><th scope="col">Review status</th></tr></thead>
                <tbody>{infrastructureFacts.map((fact) => <tr key={fact.label}><th scope="row">{fact.label}</th><td data-label="Public value"><strong>{fact.value}</strong>{fact.note ? <small>{fact.note}</small> : null}</td><td data-label="Review status"><VerificationState state="approval-required" /></td></tr>)}</tbody>
              </table>
            </div>
            <Link className="button button--secondary" href="/mandatory-public-disclosure/infrastructure-inspection">Open the infrastructure inspection page</Link>
          </section>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
