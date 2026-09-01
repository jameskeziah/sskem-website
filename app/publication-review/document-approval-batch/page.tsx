import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { approvalManifest, decisionLabels } from "@/app/data/publication-approval";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { createApprovalRequestDownload } from "@/lib/approval-request-download";
import { documentApprovalBatchRecordIds } from "@/lib/document-approval-batch-contract";

import { DocumentApprovalBatchForm } from "./document-approval-batch-form";

import "../review.css";
import "./workspace.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Appendix IX Document Approval Batch",
  description: "Private, no-persistence worksheet for twelve independent SSKEMS Appendix IX document approvals.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function DocumentApprovalBatchPage() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/document-approval-batch");

  const records = documentApprovalBatchRecordIds.map((recordId) => {
    const record = approvalManifest.records.find((candidate) => candidate.id === recordId);
    if (!record) notFound();
    const match = recordId.match(/document-mpd-([bc])-(\d+)/);
    return {
      recordId: record.id,
      title: record.title,
      notes: record.notes,
      decision: decisionLabels[record.decision],
      checkNames: Object.keys(record.checks),
      appendixSection: match?.[1].toUpperCase() ?? "",
      appendixRow: Number(match?.[2] ?? 0),
      template: createApprovalRequestDownload(record.id).request,
    };
  });
  const approved = records.filter((record) => record.decision === "Approved").length;

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="publication-review-page document-approval-page">
        <header className="review-hero">
          <PageContainer className="review-hero__grid">
            <div>
              <p className="eyebrow">Authenticated Appendix IX workspace</p>
              <h1>Document approval batch</h1>
              <p className="lead">Complete twelve separate controlled decisions, then download one digest-bound bundle for an all-or-nothing local plan.</p>
            </div>
            <aside className="review-hero__status" aria-label="Appendix IX document approval batch status">
              <span>Manifest approvals</span>
              <strong>{approved} of {records.length}</strong>
              <p>PDF publication and exact activation remain separate gates.</p>
            </aside>
          </PageContainer>
        </header>

        <PageContainer>
          <nav className="document-approval-toolbar" aria-label="Document approval batch navigation">
            <Link href="/publication-review">â† Back to approval queue</Link>
            <Link href="/publication-review/document-metadata-batch">Open metadata workspace</Link>
          </nav>

          <section className="review-safety" aria-labelledby="document-approval-boundary-title">
            <div>
              <p className="eyebrow">Decision boundary</p>
              <h2 id="document-approval-boundary-title">Twelve independent decisions; one guarded handoff.</h2>
            </div>
            <p>Nothing is preselected or shared between records. Enter opaque controlled-record references and a role identifier onlyâ€”never evidence contents, paths, URLs, signatures, pupil data or approver identities. The browser sends no decision data to the server.</p>
          </section>

          <section className="document-approval-sequence" aria-labelledby="document-approval-sequence-title">
            <div>
              <p className="eyebrow">Correct operating order</p>
              <h2 id="document-approval-sequence-title">Inspect â†’ scan externally â†’ verify â†’ decide â†’ record â†’ publish â†’ activate.</h2>
            </div>
            <p>Selecting “verified” records an already completed controlled decision; it does not perform that check. In particular, the local website never runs the required malware scan. Any stale record digest blocks the whole batch.</p>
          </section>

          <DocumentApprovalBatchForm records={records} />

          <section className="document-approval-next" aria-labelledby="document-approval-next-title">
            <div>
              <p className="eyebrow">Required next gate</p>
              <h2 id="document-approval-next-title">Review the bundle locally before any manifest write.</h2>
            </div>
            <p>Keep the download in the controlled system. Run <code>npm run approvals:document-batch</code> with the completed bundle. The default mode is read-only; the atomic manifest update requires the commandâ€™s exact acknowledgement and records rather than grants the supplied decisions.</p>
          </section>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
