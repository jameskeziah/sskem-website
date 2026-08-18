import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { approvalManifest } from "@/app/data/publication-approval";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import campusMediaPipeline from "@/content/campus-media-pipeline.json";
import { campusMasterPreflightRecordIds } from "@/lib/campus-master-preflight";

import { CampusMasterPreflightForm } from "./campus-master-preflight-form";

import "../review.css";
import "./workspace.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Campus Master Preflight",
  description: "Private, browser-only technical preflight for the four SSKEMS campus masters.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function CampusMasterPreflightPage() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/campus-master-preflight");

  const records = campusMasterPreflightRecordIds.map((recordId) => {
    const record = approvalManifest.records.find((candidate) => candidate.id === recordId);
    if (!record) notFound();
    return { recordId, title: record.title, notes: record.notes };
  });
  const pipeline = {
    schemaVersion: campusMediaPipeline.schemaVersion,
    pipelineId: campusMediaPipeline.pipelineId,
    allowedInputFormats: [...campusMediaPipeline.allowedInputFormats],
    minimumMaster: { ...campusMediaPipeline.minimumMaster },
  };

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="publication-review-page campus-preflight-page">
        <header className="review-hero">
          <PageContainer className="review-hero__grid">
            <div>
              <p className="eyebrow">Authenticated master intake</p>
              <h1>Campus master preflight</h1>
              <p className="lead">Check four local files before the controlled, authoritative media inspection begins.</p>
            </div>
            <aside className="review-hero__status" aria-label="Campus master preflight boundary">
              <span>Browser operation</span>
              <strong>Local only</strong>
              <p>No file bytes, filenames or decisions are sent to the server.</p>
            </aside>
          </PageContainer>
        </header>

        <PageContainer>
          <nav className="campus-preflight-toolbar" aria-label="Campus master preflight navigation">
            <Link href="/publication-review">← Back to approval queue</Link>
            <Link href="/publication-review/campus-media-packet">Download capture packet</Link>
          </nav>

          <section className="review-safety" aria-labelledby="campus-preflight-boundary-title">
            <div>
              <p className="eyebrow">Privacy boundary</p>
              <h2 id="campus-preflight-boundary-title">The browser checks; the controlled system retains.</h2>
            </div>
            <p>Selections stay in this browser tab and are never uploaded or saved by the website. The downloaded JSON contains only record IDs, dimensions, byte counts and SHA-256 digests—never filenames, paths, EXIF, people or approval evidence.</p>
          </section>

          <section className="campus-preflight-sequence" aria-labelledby="campus-preflight-sequence-title">
            <div>
              <p className="eyebrow">Preflight scope</p>
              <h2 id="campus-preflight-sequence-title">Four distinct masters. One technical readiness report.</h2>
            </div>
            <p>JPEG, PNG and TIFF are accepted by the production pipeline. Browsers may not decode TIFF dimensions, so a TIFF can require the authoritative local inspector even when its bytes hash successfully. This page does not inspect colour space or metadata and cannot grant approval.</p>
          </section>

          <CampusMasterPreflightForm records={records} pipeline={pipeline} />

          <section className="campus-preflight-next" aria-labelledby="campus-preflight-next-title">
            <div>
              <p className="eyebrow">Required next gate</p>
              <h2 id="campus-preflight-next-title">Run the authoritative local inspection.</h2>
            </div>
            <p>A ready browser report is advisory, not an intake receipt. Run <code>npm run media:inspect-batch</code>, then <code>npm run media:stage-batch</code> with the same report and four inputs. After private review and all four approvals, <code>npm run media:publish-batch-plan</code> verifies the complete staged bytes, empty public targets and exact four-binding projection without accepting any write flag.</p>
          </section>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
