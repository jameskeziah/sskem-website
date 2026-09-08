import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import {
  filterLegacyContentMigrationRecords,
  legacyContentMigrationDashboard,
  legacyContentMigrationMatrix,
  type LegacyContentMigrationFilters,
} from "@/app/data/legacy-content-migration";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  migrationAreas,
  migrationSourceKinds,
  type MigrationArea,
  type MigrationSourceKind,
} from "@/lib/legacy-content-migration";

import "../review.css";
import "./workspace.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy Content Migration Matrix",
  description: "Private SSKEMS workspace accounting for every archived WordPress content record.",
  robots: { index: false, follow: false, nocache: true },
};

type SearchParams = Record<string, string | string[] | undefined>;

function value(params: SearchParams, key: string) {
  const result = params[key];
  return Array.isArray(result) ? result[0] ?? "" : result ?? "";
}

function validKind(candidate: string): candidate is MigrationSourceKind {
  return migrationSourceKinds.includes(candidate as MigrationSourceKind);
}

function validArea(candidate: string): candidate is MigrationArea {
  return migrationAreas.includes(candidate as MigrationArea);
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function pageHref(params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  if (page <= 1) next.delete("page");
  else next.set("page", String(page));
  const query = next.toString();
  return `/publication-review/migration-matrix${query ? `?${query}` : ""}`;
}

export default async function MigrationMatrixPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/migration-matrix");

  const params = await searchParams;
  const query = value(params, "q").trim();
  const kindValue = value(params, "kind");
  const areaValue = value(params, "area");
  const visibilityValue = value(params, "visibility");
  const routeValue = value(params, "route");
  const filters: LegacyContentMigrationFilters = {
    query,
    kind: validKind(kindValue) ? kindValue : "",
    area: validArea(areaValue) ? areaValue : "",
    visibility: visibilityValue === "public" || visibilityValue === "private-review" ? visibilityValue : "",
    route: routeValue === "implemented" || routeValue === "decision-required" ? routeValue : "",
  };
  const filtered = filterLegacyContentMigrationRecords(filters);
  const pageSize = 25;
  const requestedPage = Number.parseInt(value(params, "page"), 10);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Number.isInteger(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  const visibleRecords = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const preservedParams = new URLSearchParams();
  for (const [key, candidate] of Object.entries({ q: query, kind: filters.kind, area: filters.area, visibility: filters.visibility, route: filters.route })) {
    if (candidate) preservedParams.set(key, candidate);
  }

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="publication-review-page migration-matrix-page">
        <header className="review-hero migration-matrix-hero">
          <PageContainer className="review-hero__grid">
            <div>
              <p className="eyebrow">Authenticated migration control</p>
              <h1>Every archived record, accounted for.</h1>
              <p className="lead">This matrix separates old-route continuity from actual content migration. Nothing becomes current, approved or public merely because it appears here.</p>
            </div>
            <aside className="review-hero__status" aria-label="Migration completion status">
              <span>Implemented and verified</span>
              <strong>{legacyContentMigrationDashboard.verified} of {legacyContentMigrationDashboard.total}</strong>
              <p>All records remain decision-required.</p>
            </aside>
          </PageContainer>
        </header>

        <PageContainer>
          <nav className="migration-matrix-toolbar" aria-label="Migration matrix navigation">
            <Link href="/publication-review">← Back to publication review</Link>
            <span><Link href="/publication-review/migration-matrix-export">Download safe CSV worksheet</Link> · <Link href="/publication-review/migration-decision-intake">Validate completed worksheet</Link></span>
          </nav>

          <section className="review-safety" aria-labelledby="migration-matrix-boundary-title">
            <div>
              <p className="eyebrow">Controlled-source boundary</p>
              <h2 id="migration-matrix-boundary-title">Review the archive; keep evidence and identities outside the repository.</h2>
            </div>
            <p>The matrix stores opaque archive references, exact digests and public-safe labels only. Identity-bearing paths, draft titles, WordPress content, local paths, evidence, pupil data and approver identities remain in the controlled archive.</p>
          </section>

          <section className="migration-matrix-summary" aria-labelledby="migration-matrix-summary-title">
            <div className="review-section-heading">
              <div><p className="eyebrow">Archive reconciliation</p><h2 id="migration-matrix-summary-title">One register for all 115 records.</h2></div>
              <p>Captured {legacyContentMigrationMatrix.archive.capturedOn}; each source is digest-bound to the migration archive.</p>
            </div>
            <dl className="migration-matrix-summary__grid">
              <div><dt>Public records</dt><dd><strong>{legacyContentMigrationDashboard.publicRecords}</strong><span>Pages, posts and public archive views.</span></dd></div>
              <div><dt>Private records</dt><dd><strong>{legacyContentMigrationDashboard.privateRecords}</strong><span>Draft details remain redacted.</span></dd></div>
              <div><dt>Existing route treatments</dt><dd><strong>{legacyContentMigrationDashboard.routeImplemented}</strong><span>Route continuity only—not migrated copy.</span></dd></div>
              <div><dt>Public route decisions</dt><dd><strong>{legacyContentMigrationDashboard.publicRouteDecisionRequired}</strong><span>Keep, redirect, archive or retire.</span></dd></div>
              <div><dt>Content decisions</dt><dd><strong>{legacyContentMigrationDashboard.contentDecided} of {legacyContentMigrationDashboard.total}</strong><span>Migrate, rewrite, merge, archive or retire.</span></dd></div>
              <div><dt>Release gate</dt><dd><strong>{legacyContentMigrationDashboard.completionReady ? "Ready" : "Blocked"}</strong><span>Requires verified implementation for every row.</span></dd></div>
            </dl>
          </section>

          <section className="migration-matrix-register" aria-labelledby="migration-matrix-register-title">
            <div className="review-section-heading">
              <div><p className="eyebrow">Decision register</p><h2 id="migration-matrix-register-title">Trace every source without republishing it.</h2></div>
              <p>Complete decisions in the controlled worksheet, then use the digest-bound intake to validate a read-only change plan.</p>
            </div>

            <form className="migration-matrix-filters" method="get" action="/publication-review/migration-matrix">
              <label><span>Search safe fields</span><input type="search" name="q" defaultValue={query} placeholder="Label, reference or route" /></label>
              <label><span>Source type</span><select name="kind" defaultValue={filters.kind}><option value="">All types</option>{migrationSourceKinds.map((kind) => <option value={kind} key={kind}>{titleCase(kind)}</option>)}</select></label>
              <label><span>Content area</span><select name="area" defaultValue={filters.area}><option value="">All areas</option>{migrationAreas.map((area) => <option value={area} key={area}>{titleCase(area)}</option>)}</select></label>
              <label><span>Visibility</span><select name="visibility" defaultValue={filters.visibility}><option value="">All visibility</option><option value="public">Public source</option><option value="private-review">Private review</option></select></label>
              <label><span>Route status</span><select name="route" defaultValue={filters.route}><option value="">All route states</option><option value="implemented">Treatment implemented</option><option value="decision-required">Decision required</option></select></label>
              <div className="migration-matrix-filters__actions"><button className="button button--primary" type="submit">Apply filters</button><Link className="button button--quiet" href="/publication-review/migration-matrix">Clear</Link></div>
            </form>

            <p className="migration-matrix-count" aria-live="polite">Showing {visibleRecords.length} of {filtered.length} matching records; {legacyContentMigrationDashboard.total} total.</p>
            <div className="migration-matrix-table-wrap" tabIndex={0} role="region" aria-label="Scrollable migration record table">
              <table className="migration-matrix-table">
                <thead><tr><th scope="col">Archived source</th><th scope="col">Area</th><th scope="col">Legacy route</th><th scope="col">Route treatment</th><th scope="col">Content decision</th><th scope="col">Implementation</th></tr></thead>
                <tbody>
                  {visibleRecords.map((record) => (
                    <tr key={record.id}>
                      <th scope="row" data-label="Archived source"><strong>{record.label}</strong><code>{record.sourceRef}</code><span>{titleCase(record.sourceKind)} · {record.sourceVisibility === "public" ? "Public" : "Private review"}</span></th>
                      <td data-label="Area"><span className="migration-pill">{titleCase(record.area)}</span></td>
                      <td data-label="Legacy route"><code>{record.legacyPath ?? "Redacted in controlled archive"}</code></td>
                      <td data-label="Route treatment"><span className="migration-status" data-state={record.routeContinuity.status}>{titleCase(record.routeContinuity.status)}</span><small>{titleCase(record.routeContinuity.action)}{record.routeContinuity.targetPath ? ` → ${record.routeContinuity.targetPath}` : ""}</small></td>
                      <td data-label="Content decision"><span className="migration-status" data-state={record.contentDecision.decision}>{titleCase(record.contentDecision.decision)}</span><details><summary>Required reviews</summary><ul>{record.requiredReviews.map((review) => <li key={review}>{titleCase(review)}</li>)}</ul></details></td>
                      <td data-label="Implementation"><span className="migration-status" data-state={record.implementationStatus}>{titleCase(record.implementationStatus)}</span><small>{record.publicationEligible ? "Eligible for separate publication gates" : "Publication blocked"}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 ? <p className="migration-matrix-empty">No safe matrix records match these filters.</p> : null}
            {totalPages > 1 ? (
              <nav className="migration-matrix-pagination" aria-label="Migration matrix pages">
                {currentPage > 1 ? <Link className="button button--quiet" href={pageHref(preservedParams, currentPage - 1)}>Previous</Link> : <span />}
                <span>Page {currentPage} of {totalPages}</span>
                {currentPage < totalPages ? <Link className="button button--quiet" href={pageHref(preservedParams, currentPage + 1)}>Next</Link> : <span />}
              </nav>
            ) : null}
          </section>

          <section className="migration-matrix-next" aria-labelledby="migration-matrix-next-title">
            <div><p className="eyebrow">Operating sequence</p><h2 id="migration-matrix-next-title">Decide → verify → implement → approve → release.</h2></div>
            <ol>
              <li>Download the safe worksheet and consult the exact source only inside the controlled archive.</li>
              <li>Choose a route treatment and content decision for every record; record roles, never person identities.</li>
              <li>Implement the approved destination, redirect, archive or retirement and verify it independently.</li>
              <li>Run the separate claims, media, document and Programme publication gates before public release.</li>
            </ol>
          </section>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
