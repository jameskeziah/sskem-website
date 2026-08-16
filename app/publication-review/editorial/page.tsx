import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import {
  getHomepageEditorialReview,
  type EditorialReviewItem,
} from "@/lib/cms/homepage-editorial.server";

import "../review.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editorial Revision Review",
  description: "Private exact-output review for SSKEMS Sanity revisions and publication receipts.",
  robots: { index: false, follow: false, nocache: true },
};

const contentTypeLabels: Record<EditorialReviewItem["contentType"], string> = {
  siteSettings: "Site settings",
  announcement: "Announcement",
  admissionCycle: "Admission cycle",
  event: "Event",
};

const statusLabels: Record<EditorialReviewItem["status"], string> = {
  blocked: "Blocked",
  "ready-to-bind": "Receipt ready",
  bound: "Exactly bound",
};

function CheckList({ item }: { item: EditorialReviewItem }) {
  const checks = [
    ["Published identity", item.checks.identityValid],
    ["Sanitized output", item.checks.projectionValid],
    ["Canonical approval", item.checks.manifestApproved],
    ["Current display window", item.checks.publicationWindowCurrent],
    ["Exact revision receipt", item.checks.exactBinding],
  ] as const;

  return (
    <ul className="editorial-review-card__checks" aria-label="Publication checks">
      {checks.map(([label, complete]) => (
        <li data-complete={complete} key={label}>
          <span aria-hidden="true">{complete ? "✓" : "○"}</span>
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}

function EditorialReviewCard({ item }: { item: EditorialReviewItem }) {
  const receiptHref = item.receiptProposal
    ? `/publication-review/editorial-receipt?${new URLSearchParams({
        type: item.contentType,
        id: item.documentId ?? "",
        revision: item.revision ?? "",
      })}`
    : null;

  return (
    <article className="editorial-review-card" data-status={item.status}>
      <div className="editorial-review-card__heading">
        <div>
          <p className="eyebrow">{contentTypeLabels[item.contentType]}</p>
          <h2>{item.documentId ?? "Invalid document identity"}</h2>
        </div>
        <span className="editorial-review-card__status">{statusLabels[item.status]}</span>
      </div>

      <dl className="editorial-review-card__meta">
        <div><dt>Revision</dt><dd><code>{item.revision ?? "Unavailable"}</code></dd></div>
        <div><dt>Approval records</dt><dd><code>{item.approvalRecordIds.length ? item.approvalRecordIds.join(", ") : "Missing or invalid"}</code></dd></div>
        <div><dt>Valid from</dt><dd>{item.validFrom ?? "Missing"}</dd></div>
        <div><dt>Valid until</dt><dd>{item.validUntil ?? "Missing"}</dd></div>
      </dl>

      <CheckList item={item} />

      <details className="editorial-review-card__projection" open={item.status === "ready-to-bind"}>
        <summary>Exact sanitized public output</summary>
        {item.projection
          ? <pre>{JSON.stringify(item.projection, null, 2)}</pre>
          : <p>No public output is available because sanitization failed.</p>}
      </details>

      {item.contentDigestSha256 ? (
        <div className="editorial-review-card__digest">
          <span>SHA-256 public-output receipt</span>
          <code>{item.contentDigestSha256}</code>
        </div>
      ) : null}

      {item.blockers.length ? (
        <div className="editorial-review-card__blockers">
          <strong>{item.status === "ready-to-bind" ? "Final step" : "Required before receipt"}</strong>
          <ul>{item.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
        </div>
      ) : null}

      {receiptHref ? (
        <a className="button button--primary" href={receiptHref}>Download exact binding receipt</a>
      ) : null}
    </article>
  );
}

export default async function EditorialReviewPage() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/editorial");

  const review = await getHomepageEditorialReview();
  const connectionReady = review.status.reason === "review-ready";

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="publication-review-page editorial-review-page">
        <header className="review-hero">
          <PageContainer className="review-hero__grid">
            <div>
              <p className="eyebrow">Private Sites review surface</p>
              <h1>Editorial revision review</h1>
              <p className="lead">Inspect only the fields the public homepage would display, then download a receipt bound to that exact Sanity revision and sanitized output.</p>
            </div>
            <aside className="review-hero__status" aria-label="Editorial receipt readiness">
              <span>Exact receipts</span>
              <strong>{review.status.readyToBind} ready</strong>
              <p>{review.status.bound} bound · {review.status.blocked} blocked</p>
            </aside>
          </PageContainer>
        </header>

        <PageContainer>
          <div className="editorial-review-toolbar">
            <Link href="/publication-review">← Back to approval queue</Link>
            <Link className="button button--quiet" href="/publication-review/editorial-site-settings-packet">Download first site settings packet</Link>
            <Link className="button button--quiet" href="/publication-review/editorial-announcement-packet">Download announcement intake packet</Link>
          </div>

          <section className="review-safety" aria-labelledby="editorial-review-boundary-title">
            <div>
              <p className="eyebrow">Exact-output boundary</p>
              <h2 id="editorial-review-boundary-title">Raw CMS records never reach this screen.</h2>
            </div>
            <p>The server requests only allowlisted public fields and displays the same normalized projection used by the homepage. Drafts, credentials, controlled evidence and non-public fields are excluded.</p>
          </section>

          {!connectionReady ? (
            <section className="editorial-review-empty" aria-labelledby="editorial-review-empty-title">
              <p className="eyebrow">Sanity connection</p>
              <h2 id="editorial-review-empty-title">No review candidates are available.</h2>
              <p>Status: {review.status.reason.replaceAll("-", " ")}. Verified local homepage content remains active.</p>
              <p>The site settings and announcement packets can still be reviewed now. Neither performs an external CMS write; the announcement packet remains source-required until exact school copy is supplied.</p>
            </section>
          ) : review.items.length ? (
            <section className="editorial-review-list" aria-labelledby="editorial-review-list-title">
              <div className="review-section-heading">
                <div><p className="eyebrow">Published candidates</p><h2 id="editorial-review-list-title">Review {review.status.candidates} exact revision{review.status.candidates === 1 ? "" : "s"}</h2></div>
                <p>A receipt download becomes available only after sanitization, canonical claim approval and a current publication window all pass.</p>
              </div>
              <div className="editorial-review-grid">
                {review.items.map((item, index) => <EditorialReviewCard item={item} key={`${item.contentType}-${item.documentId ?? index}-${item.revision ?? "invalid"}`} />)}
              </div>
            </section>
          ) : (
            <section className="editorial-review-empty" aria-labelledby="editorial-review-empty-title">
              <p className="eyebrow">Published candidates</p>
              <h2 id="editorial-review-empty-title">The connected dataset has no reviewable homepage records.</h2>
              <p>Publish the exact reviewed Sanity document first. The public homepage will continue rejecting it until its approval and binding receipt also pass.</p>
            </section>
          )}

          <section className="review-finish" aria-labelledby="editorial-review-sequence-title">
            <p className="eyebrow">Receipt sequence</p>
            <h2 id="editorial-review-sequence-title">Review output → approve claim → download receipt → audit → release.</h2>
            <ol>
              <li>Compare the sanitized projection with the authoritative public wording.</li>
              <li>Complete the controlled claim approval without storing identities or evidence here.</li>
              <li>Download and add the proposed binding to the repository registry.</li>
              <li>Run the binding audit; any later Sanity edit requires a new review.</li>
            </ol>
          </section>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
