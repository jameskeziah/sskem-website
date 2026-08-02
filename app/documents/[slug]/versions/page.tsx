import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { documentBySlug, publicDocuments } from "@/app/data/documents";
import { ComplianceStatus } from "@/components/compliance";
import { EmptyState } from "@/components/content";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

type RouteProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return publicDocuments.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const document = documentBySlug(slug);
  return document ? { title: `${document.title} Version History`, robots: { index: false, follow: true } } : {};
}

export default async function DocumentVersionsPage({ params }: RouteProps) {
  const { slug } = await params;
  const document = documentBySlug(slug);
  if (!document) notFound();
  return (
    <><SiteHeader /><main id="main-content" tabIndex={-1} className="documents-page inner-compliance-page"><PageContainer>
      <header className="inner-page-heading"><p className="eyebrow">Immutable public record</p><h1>{document.title}: version history</h1><p className="lead">Every approved replacement will preserve the previous public version and explain which record supersedes it.</p></header>
      {document.versions.length ? <ol className="version-timeline">{document.versions.map((version) => <li key={version.label}><div><strong>{version.label}</strong><span>{version.revisionDate}</span></div><ComplianceStatus status={version.status} />{version.publicUrl ? <a href={version.publicUrl}>Open {version.fileType}</a> : null}</li>)}</ol> : <EmptyState title="No approved version history yet" description="The first public version will appear only after the controlled review and approval workflow is complete." />}
      <Link className="button button--secondary" href={`/documents/${document.slug}`}>Return to document record</Link>
    </PageContainer></main><SiteFooter /></>
  );
}
