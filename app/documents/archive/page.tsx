import type { Metadata } from "next";
import Link from "next/link";

import { publicDocuments } from "@/app/data/documents";
import { DocumentArchiveCard } from "@/components/compliance";
import { EmptyState } from "@/components/content";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Historical Document Archive",
  description: "Historical, expired and superseded SSKEMS public document records.",
  alternates: { canonical: "/documents/archive" },
  robots: { index: false, follow: true },
};

export default function HistoricalArchivePage() {
  const historical = publicDocuments.filter((document) => ["expired", "superseded"].includes(document.status));
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="documents-page inner-compliance-page">
        <PageContainer>
          <header className="inner-page-heading"><p className="eyebrow">Compliance and documents</p><h1>Historical document archive</h1><p className="lead">Expired and superseded records remain available here after an approved replacement is published. Historical bytes are never silently overwritten.</p></header>
          {historical.length ? <div className="archive-card-grid">{historical.map((document) => <DocumentArchiveCard document={document} key={document.id} />)}</div> : <EmptyState title="No approved historical records yet" description="Historical versions will appear after the first controlled replacement cycle is completed." />}
          <Link className="button button--secondary" href="/documents">Return to the document archive</Link>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
