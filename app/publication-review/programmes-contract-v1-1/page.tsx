import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { programmesPrivateReviewCandidates } from "@/app/data/programmes-private-review-candidates";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { programmesPublicationV11DraftSummary } from "@/lib/programmes-publication-v1-1-draft";

import "../review.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Programmes Contract v1.1 Draft",
  description: "Private review of the non-activating SSKEMS Programmes publication contract v1.1 draft.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function ProgrammesContractV11DraftPage() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/programmes-contract-v1-1");
  const contract = programmesPublicationV11DraftSummary();
  const supplied = programmesPrivateReviewCandidates.suppliedProgrammeIntake;
  const institutionalEvidence = programmesPrivateReviewCandidates.institutionalEvidenceAssessment;
  const managementSubmission = programmesPrivateReviewCandidates.managementSubmissionAssessment;

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="publication-review-page">
        <header className="review-hero">
          <PageContainer className="review-hero__grid">
            <div>
              <p className="eyebrow">Authenticated contract review</p>
              <h1>Programmes contract v1.1 draft</h1>
              <p className="lead">Review the proposed data additions before they are promoted into the live publication schema or management intake.</p>
            </div>
            <aside className="review-hero__status" aria-label="Programmes contract status">
              <span>Contract status</span>
              <strong>Draft only</strong>
              <p>Active runtime remains v{contract.baseVersion}.</p>
            </aside>
          </PageContainer>
        </header>

        <PageContainer>
          <section className="review-safety" aria-labelledby="contract-boundary-title">
            <div>
              <p className="eyebrow">Fail-closed boundary</p>
              <h2 id="contract-boundary-title">A field contract, not publication authority.</h2>
            </div>
            <p>The v1.0 schema remains active and digest-pinned. This draft cannot approve claims or documents, issue a render gate, activate routes or navigation, update the sitemap, or deploy the website.</p>
          </section>

          <section className="review-cms" aria-labelledby="supplied-intake-title">
            <div className="review-section-heading">
              <div>
                <p className="eyebrow">Supplied rows 2-32</p>
                <h2 id="supplied-intake-title">Recorded as a blocked private-review candidate.</h2>
              </div>
              <p>The usable values and later corrections are retained for reconciliation; remaining blanks and ambiguous selections stay explicit blockers.</p>
            </div>
            <dl className="review-cms__grid">
              <div><dt>Short name</dt><dd><strong>{supplied.identity.shortDisplayName}</strong><span>User-confirmed for private review</span></dd></div>
              <div><dt>Academic year</dt><dd><strong>{supplied.identity.academicYearNormalized}</strong><span>Normalized from {supplied.identity.academicYearRaw}</span></dd></div>
              <div><dt>Institutional model</dt><dd><strong>{supplied.identity.institutionalModel}</strong><span>CBSE Senior Secondary and separate Junior College candidate</span></dd></div>
              <div><dt>Board candidate</dt><dd><strong>{supplied.recognition.boardTypeCandidate.toUpperCase()}</strong><span>Documentary status still missing</span></dd></div>
              <div><dt>Operator candidate</dt><dd><strong>{supplied.governance.operatorOrganisationCandidate}</strong><span>Stable organisation ID and evidence required</span></dd></div>
              <div><dt>XI-XII enrolment</dt><dd><strong>{supplied.classesXiXii.enrolmentOrganisationCandidate}</strong><span>User-confirmed for private review</span></dd></div>
              <div><dt>Publication request</dt><dd><strong>Blocked</strong><span>A request to publish is not approval</span></dd></div>
            </dl>
            <div className="review-card__details">
              <h3>Items still requiring correction or evidence</h3>
              <ul className="review-checks">
                {supplied.blockers.map((blocker) => <li data-state="pending" key={blocker}><span aria-hidden="true">○</span><span>{blocker}</span><strong>Required</strong></li>)}
              </ul>
            </div>
          </section>

          <section className="review-cms" aria-labelledby="institutional-evidence-title">
            <div className="review-section-heading">
              <div>
                <p className="eyebrow">Official-record reconciliation</p>
                <h2 id="institutional-evidence-title">Three programme entities are now distinguished.</h2>
              </div>
              <p>The research record resolves the institutional model and corrects the legacy affiliation timeline. These values remain private candidates until their evidence metadata, claims and exact route output are bound to the publication manifest.</p>
            </div>
            <dl className="review-cms__grid">
              <div><dt>CBSE school</dt><dd><strong>{institutionalEvidence.entities.cbseSchool.officialName}</strong><span>Affiliation {institutionalEvidence.entities.cbseSchool.affiliationNumber}; UDISE {institutionalEvidence.entities.cbseSchool.udiseCode}</span></dd></div>
              <div><dt>CBSE renewal</dt><dd><strong>{institutionalEvidence.entities.cbseSchool.renewalPeriod.validFrom} to {institutionalEvidence.entities.cbseSchool.renewalPeriod.validUntil}</strong><span>Evidence {institutionalEvidence.entities.cbseSchool.evidenceIds.join(", ")}</span></dd></div>
              <div><dt>Junior College</dt><dd><strong>{institutionalEvidence.entities.juniorCollege.recommendedPublicName}</strong><span>College No. {institutionalEvidence.entities.juniorCollege.collegeNumber}; UDISE {institutionalEvidence.entities.juniorCollege.udiseCode}</span></dd></div>
              <div><dt>Current stream evidence</dt><dd><strong>{institutionalEvidence.entities.juniorCollege.currentAdmissionsPortalStreams.join(", ")}</strong><span>Science appears in the latest Board report; Commerce still requires sanction evidence; Arts is withheld</span></dd></div>
              <div><dt>Entrance-exam operator</dt><dd><strong>{institutionalEvidence.entities.entranceExamInstitute.operatorNameCandidate}</strong><span>NEET evidenced; detailed JEE claims and legal-entity evidence remain pending</span></dd></div>
              <div><dt>Information architecture</dt><dd><strong>Sibling sections</strong><span>CBSE School and Junior College must not be merged</span></dd></div>
              <div><dt>Public release</dt><dd><strong>Blocked</strong><span>No route, navigation item or deployment was activated</span></dd></div>
            </dl>
            <div className="review-card__details">
              <h3>Remaining route evidence</h3>
              <ul className="review-checks">
                {[...institutionalEvidence.entities.cbseSchool.remainingPublicationRequirements,
                  ...institutionalEvidence.entities.juniorCollege.remainingPublicationRequirements,
                  ...institutionalEvidence.entities.entranceExamInstitute.remainingPublicationRequirements]
                  .map((requirement, index) => <li data-state="pending" key={`${index}-${requirement}`}><span aria-hidden="true">&#9675;</span><span>{requirement}</span><strong>Required</strong></li>)}
              </ul>
            </div>
          </section>

          <section className="review-readiness" aria-labelledby="contract-scope-title">
            <div className="review-section-heading">
              <div>
                <p className="eyebrow">Proposed v1.1 scope</p>
                <h2 id="contract-scope-title">The missing publication and governance records are now explicit.</h2>
              </div>
              <p>Each collection rejects unknown fields and preserves <code>not-confirmed</code> values without turning them into public placeholder copy.</p>
            </div>
            <dl className="review-readiness__grid">
              {contract.collections.map((collection) => (
                <div data-ready={false} key={collection.id}>
                  <dt>{collection.label}</dt>
                  <dd><strong>Draft</strong><span>{collection.purpose}</span></dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="review-cms" aria-labelledby="management-submission-title">
            <div className="review-section-heading">
              <div>
                <p className="eyebrow">Management submission received</p>
                <h2 id="management-submission-title">Approval was declared, but the publication contract rejected the package.</h2>
              </div>
              <p>Personal approver and change-contact identities were not copied into the repository. Only a privacy-safe assessment and public-content candidates are shown here.</p>
            </div>
            <dl className="review-cms__grid">
              <div><dt>Submitted decision</dt><dd><strong>Approved</strong><span>Received as management input</span></dd></div>
              <div><dt>Contract validation</dt><dd><strong>Rejected</strong><span>Required programme and evidence fields are incomplete</span></dd></div>
              <div><dt>Approval role</dt><dd><strong>{managementSubmission.approvedByRoleCandidate.toUpperCase()}</strong><span>Role retained; person identity withheld</span></dd></div>
              <div><dt>Next review</dt><dd><strong>{managementSubmission.nextReviewOnCandidate}</strong><span>Normalized from the supplied date</span></dd></div>
              <div><dt>Submission coverage</dt><dd><strong>{managementSubmission.nonBlankValueCount}/{managementSubmission.suppliedRowCount}</strong><span>Nonblank values; row 137 absent</span></dd></div>
              <div><dt>School route</dt><dd><strong>Blocked</strong><span>Not ready for public rendering</span></dd></div>
              <div><dt>Junior College route</dt><dd><strong>Blocked</strong><span>Recognition and pathway facts missing</span></dd></div>
              <div><dt>JEE/NEET route</dt><dd><strong>Blocked</strong><span>Curriculum, schedule, faculty and fee facts missing</span></dd></div>
            </dl>
            <div className="review-card__details">
              <h3>Blocking row groups</h3>
              <ul className="review-checks">
                {managementSubmission.blockingRowGroups.map((blocker) => <li data-state="pending" key={blocker}><span aria-hidden="true">○</span><span>{blocker}</span><strong>Required</strong></li>)}
              </ul>
            </div>
          </section>

          <section className="review-cms" aria-labelledby="contract-binding-title">
            <div className="review-section-heading">
              <div>
                <p className="eyebrow">Frozen base binding</p>
                <h2 id="contract-binding-title">v1.0 remains the only accepted contract.</h2>
              </div>
              <p>The draft supplement must bind both an exact v1.0 package digest and this frozen schema digest.</p>
            </div>
            <dl className="review-cms__grid">
              <div><dt>Active version</dt><dd><strong>{contract.baseVersion}</strong><span>Unchanged runtime contract</span></dd></div>
              <div><dt>Draft version</dt><dd><strong>{contract.version}</strong><span>{contract.status.replaceAll("-", " ")}</span></dd></div>
              <div><dt>Base digest</dt><dd><strong>{contract.baseSchemaSha256.slice(0, 12)}…</strong><span>SHA-256 pinned in the registry</span></dd></div>
              <div><dt>Publication</dt><dd><strong>{contract.publicationAuthorized ? "Authorized" : "Blocked"}</strong><span>Requires later schema promotion and approvals</span></dd></div>
            </dl>
            <div className="review-cms__actions">
              <p className="review-cms__boundary">The restricted intake contract is aligned. Next: correct the blocked source fields, review this draft, and only then promote accepted definitions into a full package schema. Real evidence and management decisions remain in the controlled system.</p>
              <Link className="button button--quiet" href="/publication-review/programmes-content-package">Return to Programmes package</Link>
            </div>
          </section>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
