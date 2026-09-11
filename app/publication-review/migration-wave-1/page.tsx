import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import {
  legacyMigrationWave1Manifest,
  legacyMigrationWave1Records,
  legacyMigrationWave1Summary,
} from "@/app/data/legacy-migration-wave-1";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "../review.css";
import "./workspace.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Migration Wave 1",
  description: "Private SSKEMS decision packet for the first core-information migration wave.",
  robots: { index: false, follow: false, nocache: true },
};

function titleCase(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function LegacyMigrationWave1Page() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-wave-1");

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="publication-review-page migration-wave-page">
        <header className="review-hero migration-wave-hero">
          <PageContainer className="review-hero__grid">
            <div>
              <p className="eyebrow">Authenticated migration control</p>
              <h1>Wave 1: {legacyMigrationWave1Manifest.label}</h1>
              <p className="lead">Review ten high-value public pages without mixing in galleries, results, staff identities, fees, notices or regulatory documents.</p>
            </div>
            <aside className="review-hero__status" aria-label="Wave 1 decision status">
              <span>Content decisions recorded</span>
              <strong>{legacyMigrationWave1Summary.contentDecided} of {legacyMigrationWave1Summary.total}</strong>
              <p>No archived copy is approved or published by this packet.</p>
            </aside>
          </PageContainer>
        </header>

        <PageContainer>
          <nav className="migration-wave-toolbar" aria-label="Legacy migration Wave 1 navigation">
            <Link href="/publication-review/migration-matrix">Back to full migration matrix</Link>
            <Link href="/publication-review/migration-wave-1/export">Download Wave 1 worksheet</Link>
          </nav>

          <section className="review-safety migration-wave-boundary" aria-labelledby="migration-wave-boundary-title">
            <div>
              <p className="eyebrow">Decision packet only</p>
              <h2 id="migration-wave-boundary-title">Source copy stays in the controlled archive.</h2>
            </div>
            <p>This workspace exposes public-safe labels, routes, review requirements and opaque source references. It contains no legacy page text, approval evidence, private path, approver identity or automatic publication action.</p>
          </section>

          <section className="migration-wave-summary" aria-labelledby="migration-wave-summary-title">
            <div className="review-section-heading">
              <div>
                <p className="eyebrow">Bounded first cohort</p>
                <h2 id="migration-wave-summary-title">Start with the information families use first.</h2>
              </div>
              <p>Homepage, school overview, vision, facilities, clubs, uniform guidance, admissions guidance, enrolment and contact.</p>
            </div>
            <dl className="migration-wave-summary__grid">
              <div><dt>Wave records</dt><dd><strong>{legacyMigrationWave1Summary.total}</strong><span>Public page records only.</span></dd></div>
              <div><dt>Routes already mapped</dt><dd><strong>{legacyMigrationWave1Summary.routeMapped}</strong><span>Route continuity is already defined.</span></dd></div>
              <div><dt>Route decisions required</dt><dd><strong>{legacyMigrationWave1Summary.routeDecisionRequired}</strong><span>About Us still needs a route treatment.</span></dd></div>
              <div><dt>Implementation verified</dt><dd><strong>{legacyMigrationWave1Summary.implementationVerified}</strong><span>Work starts only after decisions are recorded.</span></dd></div>
            </dl>
          </section>

          <section className="migration-wave-register" aria-labelledby="migration-wave-register-title">
            <div className="review-section-heading">
              <div>
                <p className="eyebrow">Management decision register</p>
                <h2 id="migration-wave-register-title">Decide what survives before copy is moved.</h2>
              </div>
              <p>For each row, select migrate, rewrite, merge, archive, redirect-only or retire in the downloaded worksheet.</p>
            </div>

            <div className="migration-wave-table-wrap" tabIndex={0} role="region" aria-label="Scrollable Wave 1 migration records">
              <table className="migration-wave-table">
                <thead>
                  <tr>
                    <th scope="col">Archived page</th>
                    <th scope="col">Legacy route</th>
                    <th scope="col">Current route treatment</th>
                    <th scope="col">Required reviews</th>
                    <th scope="col">Decision state</th>
                  </tr>
                </thead>
                <tbody>
                  {legacyMigrationWave1Records.map((record) => (
                    <tr key={record.id}>
                      <th scope="row" data-label="Archived page">
                        <strong>{record.label}</strong>
                        <code>{record.sourceRef}</code>
                      </th>
                      <td data-label="Legacy route"><code>{record.legacyPath}</code></td>
                      <td data-label="Current route treatment">
                        <span className="migration-wave-state" data-state={record.routeContinuity.status}>{titleCase(record.routeContinuity.status)}</span>
                        <small>{record.routeContinuity.action === "unselected" ? "No treatment selected" : `${titleCase(record.routeContinuity.action)} → ${record.routeContinuity.targetPath}`}</small>
                      </td>
                      <td data-label="Required reviews">
                        <ul>{record.requiredReviews.map((review) => <li key={review}>{titleCase(review)}</li>)}</ul>
                      </td>
                      <td data-label="Decision state"><span className="migration-wave-state" data-state="unselected">Unselected</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="migration-wave-next" aria-labelledby="migration-wave-next-title">
            <div>
              <p className="eyebrow">What management completes</p>
              <h2 id="migration-wave-next-title">One decision row for each archived page.</h2>
            </div>
            <ol>
              <li>Open each opaque source reference only inside the controlled archive and check accuracy and currency.</li>
              <li>Complete the eight <code>proposed_*</code> columns without changing any binding or current-state column.</li>
              <li>Use institutional role codes, not personal names, and keep evidence locations outside the worksheet.</li>
              <li>Copy the ten completed rows into a fresh full migration worksheet; the existing browser-only intake still requires all 115 rows before recording.</li>
            </ol>
            <div className="migration-wave-next__actions">
              <Link className="button button--primary" href="/publication-review/migration-wave-1/export">Download Wave 1 worksheet</Link>
              <Link className="button button--quiet" href="/publication-review/migration-decision-intake">Open full worksheet validator</Link>
            </div>
            <p className="migration-wave-next__boundary"><strong>Still blocked:</strong> this packet does not record decisions, implement content, satisfy reviews, authorize public release or change the existing WordPress site.</p>
          </section>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
