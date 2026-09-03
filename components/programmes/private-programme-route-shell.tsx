import Link from "next/link";

import type { PrivateProgrammeRouteShellSpec } from "@/app/data/programme-route-shells";
import { privateProgrammeRouteShells } from "@/app/data/programme-route-shells";
import { PageContainer } from "@/components/layout";
import { ProgrammeMediaSlot } from "@/components/programmes/programme-media";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PROGRAMMES_PUBLICATION_ROUTES } from "@/lib/programmes-publication-routes";

const routeLabels = {
  "/school/academics": "School academics",
  "/junior-college": "Junior College",
  "/programmes/jee-neet": "JEE and NEET",
} as const;

export function PrivateProgrammeRouteShell({ spec }: { spec: PrivateProgrammeRouteShellSpec }) {
  return (
    <>
      <SiteHeader />
      <main
        className="private-programme-shell"
        data-private-programme-shell
        data-publication-state="blocked"
        id="main-content"
        tabIndex={-1}
      >
        <header className="private-programme-shell__hero">
          <PageContainer>
            <nav aria-label="Private Programme route shells" className="private-programme-shell__routes">
              <span>Route shells</span>
              <ul>
                {PROGRAMMES_PUBLICATION_ROUTES.map((route) => (
                  <li key={route}>
                    <Link aria-current={route === spec.route ? "page" : undefined} href={route}>
                      {routeLabels[route]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="private-programme-shell__hero-grid">
              <div className="private-programme-shell__hero-copy">
                <p className="private-programme-shell__kicker">
                  {spec.eyebrow}
                  <span>Private review only</span>
                </p>
                <h1>{spec.title}</h1>
                <p className="lead">{spec.summary}</p>
                <dl className="private-programme-shell__state">
                  <div><dt>Route</dt><dd><code>{spec.route}</code></dd></div>
                  <div><dt>Public state</dt><dd><strong>Blocked</strong></dd></div>
                  <div><dt>Approved package</dt><dd>Not bound</dd></div>
                </dl>
              </div>

              <ProgrammeMediaSlot className="private-programme-shell__media" media={spec.media} />
            </div>
          </PageContainer>
        </header>

        <section className="private-programme-shell__blueprint" aria-labelledby="programme-shell-blueprint-title">
          <PageContainer>
            <header className="private-programme-shell__section-heading">
              <div>
                <p className="eyebrow">Approval-aware page structure</p>
                <h2 id="programme-shell-blueprint-title">Ten component slots, no invented content.</h2>
              </div>
              <p>{spec.reviewQuestion}</p>
            </header>

            <ol className="private-programme-shell__slots">
              {spec.slots.map((slot, index) => (
                <li data-requirement={slot.status} key={slot.component}>
                  <span className="private-programme-shell__slot-number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p>{slot.status === "required" ? "Required before publication" : "Conditional approved section"}</p>
                    <h3>{slot.component}</h3>
                    <p>{slot.requirement}</p>
                  </div>
                  <strong>Awaiting approved source</strong>
                </li>
              ))}
            </ol>
          </PageContainer>
        </section>

        <section className="private-programme-shell__gate" aria-labelledby="programme-shell-gate-title">
          <PageContainer className="private-programme-shell__gate-grid">
            <div>
              <p className="eyebrow">Current route gate</p>
              <h2 id="programme-shell-gate-title">The shell is ready. Publication is not.</h2>
              <p>These blockers are intentionally visible in private review and produce no public fallback content.</p>
            </div>
            <ol>
              {spec.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
            </ol>
          </PageContainer>
        </section>

        <section className="private-programme-shell__actions" aria-labelledby="programme-shell-actions-title">
          <PageContainer className="private-programme-shell__actions-grid">
            <div>
              <p className="eyebrow">Continue private review</p>
              <h2 id="programme-shell-actions-title">Review structure or complete the controlled intake.</h2>
              <p>Neither action approves content, activates these routes, changes public navigation or adds them to the sitemap.</p>
            </div>
            <div>
              <Link className="button button--primary" href="/publication-review/programmes-content-package">Open content package</Link>
              <Link className="button button--secondary" href="/publication-review/programmes-preview">Back to art direction</Link>
            </div>
          </PageContainer>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

export function privateProgrammeRouteShellSpec(route: PrivateProgrammeRouteShellSpec["route"]) {
  return privateProgrammeRouteShells[route];
}
