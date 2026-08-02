import type { Metadata } from "next";
import Link from "next/link";

import {
  documentCategories,
  documentStatusLabels,
  publicDocuments,
  type PublicDocument,
} from "@/app/data/documents";
import { DocumentArchiveCard } from "@/components/compliance";
import { EmptyState } from "@/components/content";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Document Archive",
  description: "Search the structured SSKEMS public document archive and review document status and metadata.",
  alternates: { canonical: "/documents" },
  robots: { index: false, follow: true },
};

type SearchParams = Record<string, string | string[] | undefined>;

function value(params: SearchParams, key: string) {
  const result = params[key];
  return Array.isArray(result) ? result[0] ?? "" : result ?? "";
}

function filterDocuments(params: SearchParams) {
  const keyword = value(params, "keyword").trim().toLowerCase();
  const category = value(params, "category");
  const academicYear = value(params, "academic-year");
  const publicationYear = value(params, "publication-year");
  const status = value(params, "status");
  const institution = value(params, "institution");
  const language = value(params, "language");
  const authority = value(params, "issuing-authority").trim().toLowerCase();
  const sort = value(params, "sort") || "recently-updated";

  const filtered = publicDocuments.filter((document) => {
    const haystack = `${document.title} ${document.publicNote} ${document.issuingAuthority ?? ""}`.toLowerCase();
    return (!keyword || haystack.includes(keyword))
      && (!category || document.categorySlug === category)
      && (!academicYear || document.academicYear === academicYear)
      && (!publicationYear || document.publicationYear === publicationYear)
      && (!status || document.status === status)
      && (!institution || document.institution === institution)
      && (!language || document.language === language)
      && (!authority || (document.issuingAuthority ?? "").toLowerCase().includes(authority));
  });

  const compareDate = (left: PublicDocument, right: PublicDocument, field: "issueDate" | "expiryDate" | "lastReviewed") =>
    (left[field] ?? "").localeCompare(right[field] ?? "");

  return filtered.sort((left, right) => {
    if (sort === "oldest") return compareDate(left, right, "issueDate");
    if (sort === "title") return left.title.localeCompare(right.title);
    if (sort === "expiry") return compareDate(left, right, "expiryDate");
    if (sort === "newest") return compareDate(right, left, "issueDate");
    return compareDate(right, left, "lastReviewed");
  });
}

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const documents = filterDocuments(params);

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="documents-page">
        <header className="documents-hero">
          <PageContainer>
            <p className="eyebrow">Compliance and public records</p>
            <h1>Document archive</h1>
            <p className="lead">Search controlled categories, review metadata and distinguish approved public files from records that still require compliance action.</p>
            <div className="documents-hero__links"><Link href="/mandatory-public-disclosure">Mandatory Public Disclosure</Link><Link href="/documents/archive">Historical archive</Link></div>
          </PageContainer>
        </header>

        <PageContainer>
          <section className="archive-filter-panel" aria-labelledby="archive-filter-title">
            <div className="archive-filter-panel__heading"><div><p className="eyebrow">Find a record</p><h2 id="archive-filter-title">Search and filter</h2></div><p>Filters use a standard GET form and continue to work without client JavaScript.</p></div>
            <form className="archive-filter-form" method="get" action="/documents">
              <label><span>Keyword</span><input type="search" name="keyword" defaultValue={value(params, "keyword")} placeholder="Title, authority or subject" /></label>
              <label><span>Document category</span><select name="category" defaultValue={value(params, "category")}><option value="">All categories</option>{documentCategories.map((category) => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select></label>
              <label><span>Academic year</span><select name="academic-year" defaultValue={value(params, "academic-year")}><option value="">All academic years</option><option>2026–27</option><option>2025–26</option><option>2024–25</option><option>2023–24</option></select></label>
              <label><span>Publication year</span><select name="publication-year" defaultValue={value(params, "publication-year")}><option value="">All publication years</option><option>2026</option><option>2025</option><option>2024</option></select></label>
              <label><span>Status</span><select name="status" defaultValue={value(params, "status")}><option value="">All statuses</option>{Object.entries(documentStatusLabels).map(([status, label]) => <option value={status} key={status}>{label}</option>)}</select></label>
              <label><span>Institution</span><select name="institution" defaultValue={value(params, "institution")}><option value="">All institutions</option><option>SSKEMS CBSE School</option></select></label>
              <label><span>Language</span><select name="language" defaultValue={value(params, "language")}><option value="">All languages</option><option>English</option><option>Marathi</option><option>English and Marathi</option></select></label>
              <label><span>Issuing authority</span><input name="issuing-authority" defaultValue={value(params, "issuing-authority")} placeholder="Authority name" /></label>
              <label><span>Sort results</span><select name="sort" defaultValue={value(params, "sort") || "recently-updated"}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option><option value="expiry">Expiry date</option><option value="recently-updated">Recently updated</option></select></label>
              <div className="archive-filter-form__actions"><button className="button button--primary" type="submit">Apply filters</button><Link className="button button--quiet" href="/documents">Clear filters</Link></div>
            </form>
          </section>

          <section className="archive-results" aria-labelledby="archive-results-title">
            <div className="archive-results__heading"><div><p className="eyebrow">Public register</p><h2 id="archive-results-title">{documents.length} document {documents.length === 1 ? "record" : "records"}</h2></div><p>Only an approved version will expose View or Download actions.</p></div>
            {documents.length ? <div className="archive-card-grid">{documents.map((document) => <DocumentArchiveCard document={document} key={document.id} />)}</div> : <EmptyState title="No matching document records" description="Clear one or more filters, or contact the compliance owner if a mandatory record appears to be missing." />}
          </section>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
