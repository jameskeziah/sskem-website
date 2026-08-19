import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { approvalManifest } from "@/app/data/publication-approval";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { publicDocumentActivationBatchRecordIds } from "@/lib/public-document-activation-batch-contract";
import { publicDocumentPublicationSummary } from "@/lib/public-document-publication";

import { DocumentMetadataBatchForm } from "./document-metadata-batch-form";

import "../review.css";
import "./workspace.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Appendix IX Metadata Batch",
  description: "Private, no-persistence workspace for the twelve SSKEMS Appendix IX public metadata records.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function DocumentMetadataBatchPage() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/document-metadata-batch");

  const records = publicDocumentActivationBatchRecordIds.map((recordId) => {
    const record = approvalManifest.records.find((candidate) => candidate.id === recordId);
    if (!record) notFound();
    const match = recordId.match(/document-mpd-([bc])-(\d+)/);
    return {
      recordId,
      title: record.title,
      notes: record.notes,
      appendixSection: match?.[1].toUpperCase() ?? "",
      appendixRow: Number(match?.[2] ?? 0),
    };
  });
  const publication = publicDocumentPublicationSummary();

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="publication-review-page document-metadata-page">
        <header className="review-hero">
          <PageContainer className="review-hero__grid">
            <div>
              <p className="eyebrow">Authenticated Appendix IX workspace</p>
              <h1>Document metadata batch</h1>
              <p className="lead">Complete twelve public-safe records and download one exact input bundle for the guarded local planner.</p>
            </div>
            <aside className="review-hero__status" aria-label="Appendix IX metadata batch status">
              <span>Exact activations</span>
              <strong>{publication.valid} of {publication.required}</strong>
              <p>Metadata completion does not approve or activate a PDF.</p>
            </aside>
          </PageContainer>
        </header>

        <PageContainer>
          <nav className="document-metadata-toolbar" aria-label="Document metadata batch navigation">
            <Link href="/publication-review">â† Back to approval queue</Link>
            <Link href="/mandatory-public-disclosure">View disclosure register</Link>
          </nav>

          <section className="review-safety" aria-labelledby="document-metadata-boundary-title">
            <div>
              <p className="eyebrow">Controlled-record boundary</p>
              <h2 id="document-metadata-boundary-title">Verify in the controlled system; enter only public metadata here.</h2>
            </div>
            <p>The browser sends nothing to the server and stores nothing. Do not enter PDF contents, evidence, signatures, personal addresses, approver identities, local paths or controlled-system URLs. Keep the downloaded JSON with the controlled review record.</p>
          </section>

          <section className="document-metadata-sequence" aria-labelledby="document-metadata-sequence-title">
            <div>
              <p className="eyebrow">Correct operating order</p>
              <h2 id="document-metadata-sequence-title">Inspect â†’ verify â†’ approve â†’ publish PDF â†’ complete metadata â†’ plan â†’ activate.</h2>
            </div>
            <p>Every field starts blank. Use the signed, reviewed public copy as the source. The workspace validates metadata structure only; external malware evidence, manifest approval, staged receipts and exact PDF bytes remain separate mandatory gates.</p>
          </section>

          <DocumentMetadataBatchForm records={records} />

          <section className="document-metadata-next" aria-labelledby="document-metadata-next-title">
            <div>
              <p className="eyebrow">Required next gate</p>
              <h2 id="document-metadata-next-title">Run the read-only twelve-document planner.</h2>
            </div>
            <p>Keep the downloaded bundle in the controlled system. Run <code>npm run documents:activate-batch-plan</code> with that file. Only a ready plan produces the exact ID accepted by the separate guarded <code>npm run documents:activate-batch</code> registry switch.</p>
          </section>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
