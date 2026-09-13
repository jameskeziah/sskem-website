import Link from "next/link";

import {
  legacyContentMigrationMatrix,
} from "@/app/data/legacy-content-migration";
import type { LegacyMigrationWave } from "@/app/data/legacy-migration-wave";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { MigrationWaveMergeForm } from "./migration-wave-merge-form";

import "./review.css";
import "./migration-wave-1/workspace.css";

type MigrationWaveWorkspaceProps = {
  wave: LegacyMigrationWave;
  waveNumber: number;
  routeBase: string;
  introduction: string;
  cohortEyebrow: string;
  cohortHeading: string;
  cohortDescription: string;
  routeSummaryNote: string;
  sequenceInstruction: string;
  relatedWaves?: readonly {
    href: string;
    label: string;
  }[];
};

function titleCase(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function MigrationWaveWorkspace({
  wave,
  waveNumber,
  routeBase,
  introduction,
  cohortEyebrow,
  cohortHeading,
  cohortDescription,
  routeSummaryNote,
  sequenceInstruction,
  relatedWaves = [],
}: MigrationWaveWorkspaceProps) {
  const waveName = `Wave ${waveNumber}`;
  const downloadHref = `${routeBase}/export`;

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="publication-review-page migration-wave-page">
        <header className="review-hero migration-wave-hero">
          <PageContainer className="review-hero__grid">
            <div>
              <p className="eyebrow">Authenticated migration control</p>
              <h1>{waveName}: {wave.manifest.label}</h1>
              <p className="lead">{introduction}</p>
            </div>
            <aside className="review-hero__status" aria-label={`${waveName} decision status`}>
              <span>Content decisions recorded</span>
              <strong>{wave.summary.contentDecided} of {wave.summary.total}</strong>
              <p>No archived copy is approved or published by this packet.</p>
            </aside>
          </PageContainer>
        </header>

        <PageContainer>
          <nav className="migration-wave-toolbar" aria-label={`Legacy migration ${waveName} navigation`}>
            <Link href="/publication-review/migration-matrix">Back to full migration matrix</Link>
            {relatedWaves.map((relatedWave) => <Link href={relatedWave.href} key={relatedWave.href}>{relatedWave.label}</Link>)}
            <Link href={downloadHref}>Download {waveName} worksheet</Link>
          </nav>

          <section className="review-safety migration-wave-boundary" aria-labelledby="migration-wave-boundary-title">
            <div>
              <p className="eyebrow">Decision packet only</p>
              <h2 id="migration-wave-boundary-title">Source copy stays in the controlled archive.</h2>
            </div>
            <p>This workspace exposes public-safe labels, routes, review requirements and opaque source references. It contains no legacy source content, approval evidence, private path, approver identity or automatic publication action.</p>
          </section>

          <MigrationWaveMergeForm
            matrix={legacyContentMigrationMatrix}
            mergedDownloadName={`sskem-legacy-migration-master-wave-${waveNumber}-merged.csv`}
            prerequisiteRecordIds={wave.prerequisiteRecordIds}
            waveId={wave.manifest.waveId}
            waveName={waveName}
            waveRecordIds={wave.manifest.recordIds}
          />

          <section className="migration-wave-summary" aria-labelledby="migration-wave-summary-title">
            <div className="review-section-heading">
              <div>
                <p className="eyebrow">{cohortEyebrow}</p>
                <h2 id="migration-wave-summary-title">{cohortHeading}</h2>
              </div>
              <p>{cohortDescription}</p>
            </div>
            <dl className="migration-wave-summary__grid">
              <div><dt>Wave records</dt><dd><strong>{wave.summary.total}</strong><span>Public source records only.</span></dd></div>
              <div><dt>Routes already mapped</dt><dd><strong>{wave.summary.routeMapped}</strong><span>{wave.summary.routeMapped > 0 ? "Route continuity is already defined." : "No route treatment is preselected."}</span></dd></div>
              <div><dt>Route decisions required</dt><dd><strong>{wave.summary.routeDecisionRequired}</strong><span>{routeSummaryNote}</span></dd></div>
              <div><dt>Implementation verified</dt><dd><strong>{wave.summary.implementationVerified}</strong><span>Work starts only after decisions are recorded.</span></dd></div>
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

            <div className="migration-wave-table-wrap" tabIndex={0} role="region" aria-label={`Scrollable ${waveName} migration records`}>
              <table className="migration-wave-table">
                <thead>
                  <tr>
                    <th scope="col">Archived source</th>
                    <th scope="col">Legacy route</th>
                    <th scope="col">Current route treatment</th>
                    <th scope="col">Required reviews</th>
                    <th scope="col">Decision state</th>
                  </tr>
                </thead>
                <tbody>
                  {wave.records.map((record) => (
                    <tr key={record.id}>
                      <th scope="row" data-label="Archived source">
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
              <h2 id="migration-wave-next-title">One decision row for each archived source.</h2>
            </div>
            <ol>
              <li>Open each opaque source reference only inside the controlled archive and check accuracy and currency.</li>
              <li>Complete every required <code>proposed_*</code> cell without changing binding or current-state columns. Keep prefilled route cells unchanged for implemented routes; fill them only where the route status is decision-required.</li>
              <li>Use institutional role codes, not personal names, and keep evidence locations outside the worksheet.</li>
              <li>{sequenceInstruction}</li>
            </ol>
            <div className="migration-wave-next__actions">
              <Link className="button button--primary" href={downloadHref}>Download {waveName} worksheet</Link>
              <Link className="button button--quiet" href="/publication-review/migration-decision-intake">Open full worksheet validator</Link>
              {relatedWaves.map((relatedWave) => <Link className="button button--quiet" href={relatedWave.href} key={relatedWave.href}>{relatedWave.label}</Link>)}
            </div>
            <p className="migration-wave-next__boundary"><strong>Still blocked:</strong> this packet does not record decisions, implement content, satisfy reviews, authorize public release or change the existing WordPress site.</p>
          </section>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
