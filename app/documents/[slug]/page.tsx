import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { categoryBySlug, documentBySlug, documentCategories, publicDocuments } from "@/app/data/documents";
import { ComplianceStatus, DocumentArchiveCard } from "@/components/compliance";
import { Alert, EmptyState } from "@/components/content";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

type RouteProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return [...documentCategories.map(({ slug }) => ({ slug })), ...publicDocuments.map(({ slug }) => ({ slug }))];
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  const document = documentBySlug(slug);
  if (!category && !document) return {};
  const title = category?.name ?? document?.title ?? "Document record";
  return {
    title,
    description: category ? `SSKEMS ${category.name} document records.` : `Public metadata and version status for ${title}.`,
    alternates: { canonical: `/documents/${slug}` },
    robots: { index: false, follow: true },
  };
}

export default async function DocumentOrCategoryPage({ params }: RouteProps) {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  const document = documentBySlug(slug);
  if (!category && !document) notFound();

  if (category) {
    const records = publicDocuments.filter((item) => item.categorySlug === category.slug);
    return (
      <><SiteHeader /><main id="main-content" tabIndex={-1} className="documents-page inner-compliance-page"><PageContainer>
        <header className="inner-page-heading"><p className="eyebrow">Controlled document category</p><h1>{category.name}</h1><p className="lead">Records share one controlled category so filters, expiry checks and migration rules stay consistent.</p></header>
        {records.length ? <div className="archive-card-grid">{records.map((record) => <DocumentArchiveCard document={record} key={record.id} />)}</div> : <EmptyState title="No approved records in this category" description="The category is reserved, but no public-safe record has been approved." />}
        <Link className="button button--secondary" href="/documents">Return to all documents</Link>
      </PageContainer></main><SiteFooter /></>
    );
  }

  if (!document) notFound();
  return (
    <><SiteHeader /><main id="main-content" tabIndex={-1} className="documents-page inner-compliance-page"><PageContainer>
      <header className="inner-page-heading"><p className="eyebrow">Structured document record</p><h1>{document.title}</h1><p className="lead">Stable public metadata and replacement history for this compliance record.</p></header>
      <Alert title="Approved public copy required" kind="warning">The source inventory identifies a candidate legacy file, but this rebuild will not expose it until document-level authority, dates, self-attestation, privacy and accessibility reviews pass.</Alert>
      <div className="document-record-layout">
        <section aria-labelledby="record-metadata-title"><h2 id="record-metadata-title">Document metadata</h2><dl className="document-record-metadata">
          <div><dt>Category</dt><dd>{categoryBySlug(document.categorySlug)?.name ?? document.categorySlug}</dd></div>
          <div><dt>Institution</dt><dd>{document.institution}</dd></div>
          <div><dt>Academic year</dt><dd>{document.academicYear ?? "Approval required"}</dd></div>
          <div><dt>Issuing authority</dt><dd>{document.issuingAuthority ?? "Verification required"}</dd></div>
          <div><dt>Issue date</dt><dd>{document.issueDate ?? "Verification required"}</dd></div>
          <div><dt>Expiry date</dt><dd>{document.expiryDate ?? "Verification required"}</dd></div>
          <div><dt>Language</dt><dd>{document.language}</dd></div>
          <div><dt>Last reviewed</dt><dd>{document.lastReviewed}</dd></div>
          <div><dt>Status</dt><dd><ComplianceStatus status={document.status} /></dd></div>
          <div><dt>Accessibility</dt><dd>{document.currentVersion?.accessibilityStatus ?? "Assessment pending"}</dd></div>
        </dl></section>
        <aside className="record-file-state"><p className="eyebrow">Current public file</p><strong>{document.currentVersion?.fileName ?? "No approved PDF published"}</strong><p>{document.publicNote}</p><Link href={`/documents/${document.slug}/versions`}>Review version history →</Link></aside>
      </div>
      <div className="record-actions"><Link className="button button--secondary" href="/documents">Return to document archive</Link><a className="button button--quiet" href={`mailto:principal@sskemschool.com?subject=Document%20record%20query%20-%20${encodeURIComponent(document.title)}`}>Report a record problem</a></div>
    </PageContainer></main><SiteFooter /></>
  );
}
