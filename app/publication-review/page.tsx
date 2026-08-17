import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  approvalManifest,
  approvalProgress,
  approvalSummary,
  checkStateLabels,
  decisionLabels,
  filterApprovalRecords,
  firstReviewBatch,
  kindLabels,
  type ApprovalDecision,
  type ApprovalKind,
  type ApprovalRecord,
} from "@/app/data/publication-approval";
import {
  legacyCutoverDashboard,
  legacyCutoverInventory,
} from "@/app/data/legacy-cutover";
import { publicReleaseReadinessDashboard } from "@/app/data/public-release-readiness";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getHomepageEditorialContent } from "@/lib/cms/homepage-editorial.server";
import { editorialPublicationBindingSummary } from "@/lib/cms/editorial-publication-binding";
import { campusMediaPublicationSummary } from "@/lib/campus-media-publication";
import {
  formatMediaBytes,
  homepageMediaPerformanceSummary,
} from "@/lib/homepage-media-performance";
import { publicDocumentPublicationSummary } from "@/lib/public-document-publication";

import "./review.css";

export const metadata: Metadata = {
  title: "Publication Review",
  description: "Owner-only approval queue for SSKEMS media, claims and public documents.",
  robots: { index: false, follow: false, nocache: true },
};

type SearchParams = Record<string, string | string[] | undefined>;

function value(params: SearchParams, key: string) {
  const result = params[key];
  return Array.isArray(result) ? result[0] ?? "" : result ?? "";
}

function validKind(value: string): value is ApprovalKind {
  return value === "media" || value === "claim" || value === "document";
}

function validDecision(value: string): value is ApprovalDecision {
  return value === "blocked" || value === "review-required" || value === "approved" || value === "withdrawn";
}

function ReviewCard({ record, recommended = false }: { record: ApprovalRecord; recommended?: boolean }) {
  const progress = approvalProgress(record);
  const pending = Object.entries(record.checks).filter(([, state]) => state !== "verified" && state !== "not-applicable");

  return (
    <article className="review-card" data-decision={record.decision}>
      <div className="review-card__heading">
        <div>
          <span className="review-card__kind">{kindLabels[record.kind]}</span>
          {recommended ? <span className="review-card__priority">Start here</span> : null}
          <h3>{record.title}</h3>
          <code>{record.id}</code>
        </div>
        <span className="review-card__decision">{decisionLabels[record.decision]}</span>
      </div>

      <div
        className="review-card__progress"
        role="progressbar"
        aria-label="Approval checks complete"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.complete}
      >
        <span style={{ width: `${(progress.complete / progress.total) * 100}%` }} />
      </div>
      <p className="review-card__progress-label">{progress.complete} of {progress.total} checks complete</p>

      <details>
        <summary>Review requirements</summary>
        <div className="review-card__details">
          <ul className="review-checks">
            {Object.entries(record.checks).map(([check, state]) => (
              <li data-state={state} key={check}>
                <span aria-hidden="true">{state === "verified" || state === "not-applicable" ? "✓" : "○"}</span>
                <span>{check.replaceAll("-", " ")}</span>
                <strong>{checkStateLabels[state]}</strong>
              </li>
            ))}
          </ul>
          <dl className="review-card__metadata">
            <div><dt>Source</dt><dd><code>{record.sourcePointer}</code></dd></div>
            <div><dt>Public placement</dt><dd>{record.publicTargets.map((target) => <Link href={target} key={target}>{target}</Link>)}</dd></div>
            <div><dt>Evidence</dt><dd>{record.evidenceReferences.length ? `${record.evidenceReferences.length} controlled reference(s) recorded` : "Opaque controlled-record reference required"}</dd></div>
          </dl>
          <p>{record.notes}</p>
          {pending.length ? <p className="review-card__next"><strong>Next:</strong> complete {pending.map(([check]) => check.replaceAll("-", " ")).join(", ")}.</p> : null}
          {recommended ? <p className="review-card__operator"><strong>Guarded update:</strong> after independent review, generate the unfilled request with <code>npm run approvals:update -- --record {record.id}</code>. Template generation does not approve the record.</p> : null}
          <div className="review-card__actions">
            <Link
              aria-label={`Download unfilled approval request for ${record.title}`}
              className="button button--quiet"
              href={`/publication-review/approval-request/${record.id}`}
            >
              Download unfilled request
            </Link>
          </div>
        </div>
      </details>
    </article>
  );
}

export default async function PublicationReviewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();

  const params = await searchParams;
  const selectedKind = value(params, "kind");
  const selectedDecision = value(params, "decision");
  const kind = validKind(selectedKind) ? selectedKind : "";
  const decision = validDecision(selectedDecision) ? selectedDecision : "";
  const records = filterApprovalRecords(kind, decision);
  const summary = approvalSummary();
  const releaseReadiness = publicReleaseReadinessDashboard();
  const editorial = await getHomepageEditorialContent();
  const bindingSummary = editorialPublicationBindingSummary();
  const mediaPublication = campusMediaPublicationSummary();
  const mediaPerformance = homepageMediaPerformanceSummary({ campusSummary: mediaPublication });
  const heroPosterPerformance = mediaPerformance.assets.find((asset) => asset.id === "homepage-social-poster");
  const documentPublication = publicDocumentPublicationSummary();
  const cmsState = editorial.status.reason === "missing-config"
    ? "Ready for connection"
    : editorial.status.reason === "invalid-config"
      ? "Configuration needs attention"
      : editorial.status.source === "fallback"
        ? "Safe fallback active"
        : "Approved content connected";

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="publication-review-page">
        <header className="review-hero">
          <PageContainer className="review-hero__grid">
            <div>
              <p className="eyebrow">Owner-only publication control</p>
              <h1>Approval queue</h1>
              <p className="lead">Clear the real evidence and sign-off work behind every homepage image, public claim and Appendix IX document.</p>
            </div>
            <aside className="review-hero__status" aria-label="Current public release status">
              <span>Public release</span>
              <strong>{releaseReadiness.releaseReady ? "Ready" : "Blocked"}</strong>
              <p>{releaseReadiness.blockedGates} of {releaseReadiness.totalGates} launch gates remain blocked.</p>
            </aside>
          </PageContainer>
        </header>

        <PageContainer>
          <section className="review-safety" aria-labelledby="review-safety-title">
            <div>
              <p className="eyebrow">Privacy boundary</p>
              <h2 id="review-safety-title">Evidence stays in the school’s controlled system.</h2>
            </div>
            <p>This dashboard shows status and generates unfilled request templates only. Store consent forms, certificates, pupil records, completed requests and approver identities outside the website; record only opaque evidence reference IDs in the manifest.</p>
          </section>

          <section className="review-readiness" aria-labelledby="review-readiness-title">
            <div className="review-section-heading">
              <div>
                <p className="eyebrow">Composite launch gate</p>
                <h2 id="review-readiness-title">One result across every release dependency.</h2>
              </div>
              <p>Public release becomes ready only when all six independent gates pass. A structurally valid manifest alone is not a launch decision.</p>
            </div>
            <dl className="review-readiness__grid">
              {releaseReadiness.gates.map((gate) => (
                <div data-ready={gate.ready} key={gate.id}>
                  <dt>{gate.label}</dt>
                  <dd>
                    <strong>{gate.ready ? "Ready" : "Blocked"}</strong>
                    <span>{gate.completed} of {gate.required}</span>
                    {gate.blocker ? <small>{gate.blocker}</small> : null}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="review-readiness__note">Run <code>npm run release:audit</code> for the same fail-closed result in the build pipeline.</p>
          </section>

          <section className="review-cms" aria-labelledby="review-cms-title">
            <div className="review-section-heading">
              <div>
                <p className="eyebrow">Editorial CMS</p>
                <h2 id="review-cms-title">Sanity delivery status</h2>
              </div>
              <p>The website accepts only published, currently valid records whose exact Sanity revision and sanitized public-output digest match an approved review receipt.</p>
            </div>
            <dl className="review-cms__grid">
              <div><dt>Connection</dt><dd><strong>{cmsState}</strong><span>{editorial.status.reason.replaceAll("-", " ")}</span></dd></div>
              <div><dt>Homepage source</dt><dd><strong>{editorial.status.source}</strong><span>Verified local content remains available.</span></dd></div>
              <div><dt>Accepted records</dt><dd><strong>{editorial.status.remoteAccepted}</strong><span>Across contact, notice, admissions and events.</span></dd></div>
              <div><dt>Rejected records</dt><dd><strong>{editorial.status.remoteRejected}</strong><span>Nothing rejected reaches public output.</span></dd></div>
              <div><dt>Exact bindings</dt><dd><strong>{bindingSummary.valid} of {bindingSummary.recorded}</strong><span>Revision or digest mismatch fails closed.</span></dd></div>
            </dl>
            <div className="review-cms__actions">
              <p className="review-cms__boundary">A CMS edit creates a new revision and requires a new review receipt. Applicant records, pupil data, controlled documents, consent evidence and approver identities never enter this CMS.</p>
              <Link className="button button--quiet" href="/publication-review/editorial">Review exact CMS revisions</Link>
            </div>
          </section>

          <section className="review-cutover" aria-labelledby="review-cutover-title">
            <div className="review-section-heading">
              <div>
                <p className="eyebrow">Legacy cutover</p>
                <h2 id="review-cutover-title">Old WordPress links now have a controlled destination.</h2>
              </div>
              <p>Permanent redirects preserve route continuity without copying old claims, pupil media, forms or downloads into the rebuilt site.</p>
            </div>
            <dl className="review-cutover__grid">
              <div><dt>Routes inventoried</dt><dd><strong>{legacyCutoverDashboard.total}</strong><span>Captured {legacyCutoverInventory.capturedOn}</span></dd></div>
              <div><dt>Permanent redirects</dt><dd><strong>{legacyCutoverDashboard.redirects}</strong><span>Mapped directly to final modern routes.</span></dd></div>
              <div><dt>High-risk sources</dt><dd><strong>{legacyCutoverDashboard.highRisk}</strong><span>Forms, identities, claims or pupil media.</span></dd></div>
              <div><dt>Route readiness</dt><dd><strong>{legacyCutoverDashboard.pendingImplementation === 0 ? "Ready" : "Incomplete"}</strong><span>{legacyCutoverDashboard.approvalBlocked} legacy content items still need approval or replacement.</span></dd></div>
            </dl>
            <div className="review-cutover__actions">
              <p>Redirect readiness does not make the legacy content approved.</p>
              <Link className="button button--quiet" href="/publication-review/cutover-export">Download cutover worksheet</Link>
            </div>
          </section>

          <section className="review-summary" aria-labelledby="review-summary-title">
            <div className="review-section-heading">
              <div><p className="eyebrow">Manifest snapshot</p><h2 id="review-summary-title">{summary.total} governed records</h2></div>
              <p>Last updated {approvalManifest.updatedOn}</p>
            </div>
            <dl className="review-summary__grid">
              <div><dt>Media</dt><dd>{summary.byKind.media}</dd></div>
              <div><dt>Claims</dt><dd>{summary.byKind.claim}</dd></div>
              <div><dt>Documents</dt><dd>{summary.byKind.document}</dd></div>
              <div><dt>Approved</dt><dd>{summary.byDecision.approved}</dd></div>
            </dl>
          </section>

          <section className="review-first-batch" aria-labelledby="review-first-batch-title">
            <div className="review-section-heading">
              <div><p className="eyebrow">Recommended first batch</p><h2 id="review-first-batch-title">Approve the four campus photographs first.</h2></div>
              <p>They unlock the strongest homepage imagery without waiting for pupil-result consent and verification.</p>
            </div>
            <div className="review-card-grid">
              {firstReviewBatch.map((record) => <ReviewCard record={record} recommended key={record.id} />)}
            </div>
          </section>

          <section className="review-media-intake" aria-labelledby="review-media-intake-title">
            <div className="review-section-heading">
              <div><p className="eyebrow">Production media gate</p><h2 id="review-media-intake-title">Approved masters become responsive, privacy-clean assets.</h2></div>
              <p>The production pipeline preserves the photograph’s composition, strips embedded metadata and audits transfer budgets without modifying the artwork.</p>
            </div>
            <dl className="review-media-intake__grid">
              <div><dt>Master size</dt><dd><strong>2400 × 1350 minimum</strong><span>Long edge × short edge; never enlarged.</span></dd></div>
              <div><dt>Responsive formats</dt><dd><strong>AVIF · WebP · JPEG</strong><span>Five widths from 480 to 2000 pixels.</span></dd></div>
              <div><dt>Privacy</dt><dd><strong>Metadata removed</strong><span>EXIF, XMP and IPTC are stripped and rechecked.</span></dd></div>
              <div><dt>Exact activation</dt><dd><strong>{mediaPublication.valid} of {mediaPublication.required} bound</strong><span>Only approved, receipt-matched derivative sets count.</span></dd></div>
              <div><dt>Hero transfer</dt><dd><strong>{heroPosterPerformance ? `${formatMediaBytes(heroPosterPerformance.observedBytes)} / ${formatMediaBytes(heroPosterPerformance.maximumBytes)}` : "Audit unavailable"}</strong><span>{heroPosterPerformance?.withinBudget ? "Within the public-release budget." : "Prototype is over the public-release budget."}</span></dd></div>
              <div><dt>Poster optimization</dt><dd><strong>Pixel-exact staging</strong><span>Lossless review never changes the public artwork or budget.</span></dd></div>
              <div><dt>Media release</dt><dd><strong>{mediaPerformance.releaseReady ? "Ready" : "Blocked"}</strong><span>{mediaPerformance.blockers.length} media performance blocker(s) remain.</span></dd></div>
            </dl>
            <div className="review-media-intake__actions">
              <p>Run <code>npm run performance:audit</code> before public release. Use <code>npm run poster:inspect</code> to measure a pixel-identical lossless candidate without writing it. Because that candidate still exceeds the current budget, a format or pixel change requires a separate approved art-direction decision.</p>
              <Link className="button button--quiet" href="/publication-review/campus-media-packet">Download campus capture packet</Link>
            </div>
          </section>

          <section className="review-document-intake" aria-labelledby="review-document-intake-title">
            <div className="review-section-heading">
              <div><p className="eyebrow">Appendix IX document gate</p><h2 id="review-document-intake-title">Every PDF is rendered, checked and bound to its approval.</h2></div>
              <p>The intake pipeline rejects encrypted or interactive PDFs, prepares page-by-page visual previews and refuses publication unless the reviewed file hash matches an approved document record.</p>
            </div>
            <dl className="review-document-intake__grid">
              <div><dt>Static PDF</dt><dd><strong>Active content rejected</strong><span>Scripts, attachments, launch actions and forms stop intake.</span></dd></div>
              <div><dt>Visual QA</dt><dd><strong>Every page rendered</strong><span>Numbered previews support legibility and completeness review.</span></dd></div>
              <div><dt>Accessibility</dt><dd><strong>Text layer assessed</strong><span>Sparse or scanned pages are flagged for OCR and remediation.</span></dd></div>
              <div><dt>Publication</dt><dd><strong>Exact hash required</strong><span>External malware-scan evidence and manifest approval remain mandatory.</span></dd></div>
              <div><dt>Exact activation</dt><dd><strong>{documentPublication.valid} of {documentPublication.required} bound</strong><span>Only a receipt-matched, hash-verified PDF becomes downloadable.</span></dd></div>
            </dl>
            <p className="review-document-intake__note">After publishing an approved PDF, review its public metadata and run <code>npm run documents:activate</code>. The default mode is read-only and never grants approval.</p>
          </section>

          <section className="review-queue" aria-labelledby="review-queue-title">
            <div className="review-section-heading">
              <div><p className="eyebrow">Complete register</p><h2 id="review-queue-title">Review every release dependency</h2></div>
              <Link className="button button--quiet" href="/publication-review/export">Download review worksheet</Link>
            </div>

            <form className="review-filters" method="get" action="/publication-review">
              <label><span>Content type</span><select name="kind" defaultValue={kind}><option value="">All types</option><option value="media">Media</option><option value="claim">Claims</option><option value="document">Documents</option></select></label>
              <label><span>Decision</span><select name="decision" defaultValue={decision}><option value="">All decisions</option><option value="review-required">Review required</option><option value="blocked">Blocked</option><option value="approved">Approved</option><option value="withdrawn">Withdrawn</option></select></label>
              <button className="button button--primary" type="submit">Apply filters</button>
              <Link className="button button--quiet" href="/publication-review">Clear</Link>
            </form>

            <p className="review-result-count" aria-live="polite">Showing {records.length} of {summary.total} records.</p>
            <div className="review-card-grid">
              {records.map((record) => <ReviewCard record={record} key={record.id} />)}
            </div>
          </section>

          <section className="review-finish" aria-labelledby="review-finish-title">
            <p className="eyebrow">Approval sequence</p>
            <h2 id="review-finish-title">Verify → reference → approve → audit → release.</h2>
            <ol>
              <li>Verify each required check independently.</li>
              <li>Record an opaque evidence reference—never the private evidence itself.</li>
              <li>Add the approving role and timestamp only after every check passes.</li>
              <li>Run the release audit and remove review-only treatment in a separate public-release change.</li>
            </ol>
          </section>
        </PageContainer>
      </main>
      <SiteFooter contact={{
        phone: editorial.contact.phone,
        email: editorial.contact.email,
        location: editorial.contact.location,
        weekdays: editorial.contact.workingHours.weekdays,
        saturday: editorial.contact.workingHours.saturday,
      }} />
    </>
  );
}
