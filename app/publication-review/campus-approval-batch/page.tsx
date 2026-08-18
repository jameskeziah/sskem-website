import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { approvalManifest, decisionLabels } from "@/app/data/publication-approval";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { createApprovalRequestDownload } from "@/lib/approval-request-download";
import { campusApprovalWorkspaceRecordIds } from "@/lib/campus-approval-batch-workspace";

import { CampusApprovalBatchForm } from "./campus-approval-batch-form";

import "../review.css";
import "./workspace.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Campus Approval Batch",
  description: "Private, no-persistence worksheet for the four SSKEMS campus-media approval records.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function CampusApprovalBatchPage() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/campus-approval-batch");

  const records = campusApprovalWorkspaceRecordIds.map((recordId) => {
    const record = approvalManifest.records.find((candidate) => candidate.id === recordId);
    if (!record) notFound();
    return {
      recordId: record.id,
      title: record.title,
      notes: record.notes,
      imagePath: record.sourcePointer.startsWith("public/") ? `/${record.sourcePointer.slice("public/".length)}` : "",
      decision: decisionLabels[record.decision],
      checkNames: Object.keys(record.checks),
      template: createApprovalRequestDownload(record.id).request,
    };
  });
  const approved = records.filter((record) => record.decision === "Approved").length;

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="publication-review-page campus-batch-page">
        <header className="review-hero">
          <PageContainer className="review-hero__grid">
            <div>
              <p className="eyebrow">Authenticated first-batch workspace</p>
              <h1>Campus approval batch</h1>
              <p className="lead">Complete four separate media decisions, then download one controlled bundle for an all-or-nothing local plan.</p>
            </div>
            <aside className="review-hero__status" aria-label="Campus approval batch status">
              <span>Manifest approvals</span>
              <strong>{approved} of {records.length}</strong>
              <p>Exact derivative activation remains a separate gate.</p>
            </aside>
          </PageContainer>
        </header>

        <PageContainer>
          <nav className="campus-batch-toolbar" aria-label="Campus batch navigation">
            <Link href="/publication-review">← Back to approval queue</Link>
            <Link href="/publication-review/campus-media-packet">Download capture packet</Link>
          </nav>

          <section className="review-safety" aria-labelledby="campus-batch-boundary-title">
            <div>
              <p className="eyebrow">Batch boundary</p>
              <h2 id="campus-batch-boundary-title">Four independent decisions; one guarded handoff.</h2>
            </div>
            <p>Nothing is preselected or shared between records. The browser downloads one JSON bundle and sends no decision data to the server. A local plan validates all four current digests; one failure blocks the entire write.</p>
          </section>

          <section className="campus-batch-sequence" aria-labelledby="campus-batch-sequence-title">
            <div>
              <p className="eyebrow">Correct operating order</p>
              <h2 id="campus-batch-sequence-title">Capture → inspect → verify → approve → prepare → activate.</h2>
            </div>
            <p>The images below are uncropped prototype references. They are not proof that a controlled production master passed inspection, and completing this worksheet does not activate them.</p>
          </section>

          <CampusApprovalBatchForm records={records} />
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
