import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The requested SSKEMS page could not be found.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <SiteHeader showBreadcrumb={false} />
      <main id="main-content" tabIndex={-1} className="site-state-page">
        <section className="site-state-card" aria-labelledby="not-found-title">
          <p className="eyebrow">Error 404</p>
          <h1 id="not-found-title">This page could not be found.</h1>
          <p>The address may be incomplete or the page may have moved. Use one of the verified public sections below to continue.</p>
          <div className="site-state-actions">
            <Link className="button button--primary" href="/">Return home</Link>
            <Link className="button button--secondary" href="/documents">View public documents</Link>
            <Link className="text-link" href="/contact">Contact the school</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
