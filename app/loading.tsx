import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function Loading() {
  return (
    <>
      <SiteHeader showBreadcrumb={false} />
      <main id="main-content" tabIndex={-1} className="site-state-page" aria-busy="true">
        <section className="site-state-card" aria-labelledby="loading-title">
          <p className="eyebrow">Please wait</p>
          <h2 id="loading-title">Loading this page.</h2>
          <p role="status" aria-live="polite">The requested public information is being prepared.</p>
          <div className="site-loading-placeholder" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
