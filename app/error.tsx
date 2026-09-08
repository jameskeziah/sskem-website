"use client";

import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <SiteHeader showBreadcrumb={false} />
      <main id="main-content" tabIndex={-1} className="site-state-page">
        <section className="site-state-card site-state-card--error" role="alert" aria-labelledby="page-error-title">
          <p className="eyebrow">Page unavailable</p>
          <h1 id="page-error-title">We could not open this page.</h1>
          <p>No information was submitted or changed. Try the page again, or return to a stable public section.</p>
          <div className="site-state-actions">
            <button className="button button--primary" type="button" onClick={reset}>Try again</button>
            <Link className="button button--secondary" href="/">Return home</Link>
            <Link className="text-link" href="/contact">Contact the school</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
