import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { approvalManifest, decisionLabels, kindLabels } from "@/app/data/publication-approval";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { createApprovalRequestDownload } from "@/lib/approval-request-download";

import { ApprovalRequestWorkspaceForm } from "./workspace-form";

import "../../review.css";
import "./workspace.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Complete Approval Request",
  description: "Private, no-persistence worksheet for a controlled SSKEMS publication approval request.",
  robots: { index: false, follow: false, nocache: true },
};

type PageProps = { params: Promise<{ recordId: string }> };

export default async function ApprovalRequestWorkspacePage({ params }: PageProps) {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();

  const { recordId } = await params;
  const record = approvalManifest.records.find((candidate) => candidate.id === recordId);
  if (!record) notFound();

  await requireChatGPTUser(`/publication-review/approval-request-workspace/${record.id}`);
  const template = createApprovalRequestDownload(record.id).request;

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="publication-review-page approval-workspace-page">
        <header className="review-hero">
          <PageContainer className="review-hero__grid">
            <div>
              <p className="eyebrow">Authenticated approval workspace</p>
              <h1>Complete approval request</h1>
              <p className="lead">Record the controlled decision for one exact manifest revision, then download it for local planning.</p>
            </div>
            <aside className="review-hero__status" aria-label="Selected approval record">
              <span>{kindLabels[record.kind]}</span>
              <strong>{record.id}</strong>
              <p>Current state: {decisionLabels[record.decision]}</p>
            </aside>
          </PageContainer>
        </header>

        <PageContainer>
          <nav className="approval-workspace-toolbar" aria-label="Approval workspace navigation">
            <Link href="/publication-review">← Back to approval queue</Link>
            <Link href={`/publication-review/approval-request/${record.id}`}>Download unfilled request</Link>
          </nav>

          <section className="review-safety" aria-labelledby="approval-workspace-boundary-title">
            <div>
              <p className="eyebrow">Completion boundary</p>
              <h2 id="approval-workspace-boundary-title">The worksheet downloads a file; it stores nothing.</h2>
            </div>
            <p>No check, expiry or approval confirmation is preselected. Completion happens only in this browser and sends no decision data to the server. The downloaded request cannot change the manifest or publish content.</p>
          </section>

          <section className="approval-workspace-record" aria-labelledby="approval-workspace-record-title">
            <div>
              <p className="eyebrow">Digest-bound record</p>
              <h2 id="approval-workspace-record-title">{record.title}</h2>
              <p>{record.notes}</p>
            </div>
            <dl>
              <div><dt>Profile</dt><dd>{record.checkProfile.replaceAll("-", " ")}</dd></div>
              <div><dt>Required checks</dt><dd>{Object.keys(record.checks).length}</dd></div>
              <div><dt>Public targets</dt><dd>{record.publicTargets.length}</dd></div>
              <div><dt>Template digest</dt><dd><code>{template.expectedRecordDigest.slice(0, 12)}…</code></dd></div>
            </dl>
          </section>

          <ApprovalRequestWorkspaceForm
            recordTitle={record.title}
            checkNames={Object.keys(record.checks)}
            template={template}
          />
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
