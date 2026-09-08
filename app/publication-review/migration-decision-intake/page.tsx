import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import {
  legacyContentMigrationDashboard,
  legacyContentMigrationMatrix,
} from "@/app/data/legacy-content-migration";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  migrationDecisionOwnerRoles,
  migrationDecisionReasonCodesByDecision,
} from "@/lib/legacy-content-migration";

import { MigrationDecisionIntakeForm } from "./migration-decision-intake-form";

import "../review.css";
import "./workspace.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Migration Decision Intake",
  description: "Private, digest-bound preflight for the SSKEMS legacy content migration worksheet.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function MigrationDecisionIntakePage() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-decision-intake");

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="publication-review-page migration-intake-page">
        <header className="review-hero migration-intake-hero">
          <PageContainer className="review-hero__grid">
            <div>
              <p className="eyebrow">Authenticated migration control</p>
              <h1>Legacy migration decision intake</h1>
              <p className="lead">Turn a fully completed safe worksheet into a digest-bound, read-only change plan before any local matrix update is allowed.</p>
            </div>
            <aside className="review-hero__status" aria-label="Current migration decision status">
              <span>Content decisions recorded</span>
              <strong>{legacyContentMigrationDashboard.contentDecided} of {legacyContentMigrationDashboard.total}</strong>
              <p>Implementation and public release remain blocked.</p>
            </aside>
          </PageContainer>
        </header>

        <PageContainer>
          <nav className="migration-intake-toolbar" aria-label="Legacy migration decision navigation">
            <Link href="/publication-review/migration-matrix">Back to migration matrix</Link>
            <Link href="/publication-review/migration-matrix-export">Download fresh decision worksheet</Link>
          </nav>

          <section className="review-safety migration-intake-boundary" aria-labelledby="migration-intake-boundary-title">
            <div>
              <p className="eyebrow">Local and fail closed</p>
              <h2 id="migration-intake-boundary-title">The CSV stays in this browser tab.</h2>
            </div>
            <p>Validation performs no upload, POST, storage write or route activation. Blockers use codes and row numbers without echoing worksheet values. Exact source content, identities, evidence and private paths remain in the controlled archive.</p>
          </section>

          <section className="migration-intake-codebook" aria-labelledby="migration-intake-codebook-title">
            <div>
              <p className="eyebrow">Decision-contract version 2</p>
              <h2 id="migration-intake-codebook-title">Use only these controlled codes.</h2>
              <p>Detailed notes, identities and evidence locations stay in the controlled system. The repository receives only one compatible reason code and one institutional role code per decision.</p>
            </div>
            <div className="migration-intake-codebook__grid">
              <div className="migration-intake-codebook__table-wrap" tabIndex={0} role="region" aria-label="Allowed reason codes by content decision">
                <table>
                  <caption>Allowed <code>proposed_reason_code</code> values</caption>
                  <thead><tr><th scope="col">Content decision</th><th scope="col">Allowed reason code</th></tr></thead>
                  <tbody>
                    {Object.entries(migrationDecisionReasonCodesByDecision).flatMap(([decision, codes]) => codes.map((code) => (
                      <tr key={`${decision}-${code}`}><th scope="row">{decision}</th><td><code>{code}</code></td></tr>
                    )))}
                  </tbody>
                </table>
              </div>
              <div className="migration-intake-codebook__roles">
                <h3>Allowed <code>proposed_owner_role</code> values</h3>
                <ul>{migrationDecisionOwnerRoles.map((role) => <li key={role}><code>{role}</code></li>)}</ul>
              </div>
            </div>
          </section>

          <MigrationDecisionIntakeForm matrix={legacyContentMigrationMatrix} />

          <section className="migration-intake-next" aria-labelledby="migration-intake-next-title">
            <div><p className="eyebrow">Controlled sequence</p><h2 id="migration-intake-next-title">Download, decide, validate, review, record.</h2></div>
            <ol>
              <li>Download a fresh worksheet so its matrix and record digests match the current register.</li>
              <li>Complete only the eight proposed decision columns for all 115 records, using the listed reason and institutional role codes.</li>
              <li>Validate locally and review the exact decision batch ID and sanitized plan.</li>
              <li>Run the read-only command independently before considering the acknowledged local write.</li>
              <li>Implement and verify destinations later through separate gates; this intake never performs those steps.</li>
            </ol>
          </section>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
