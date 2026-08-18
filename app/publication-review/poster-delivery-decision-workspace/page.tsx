import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { homepagePosterDeliveryDecisionBindingSummary } from "@/lib/homepage-poster-delivery-decision-binding";
import { createHomepagePosterDeliveryDecisionPacket } from "@/lib/homepage-poster-delivery-decision";

import { DecisionWorkspaceForm } from "./decision-workspace-form";

import "../review.css";
import "./workspace.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Poster Delivery Decision",
  description: "Private management worksheet for the SSKEMS homepage poster delivery decision.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PosterDeliveryDecisionWorkspacePage() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/poster-delivery-decision-workspace");

  const packet = createHomepagePosterDeliveryDecisionPacket();
  const binding = homepagePosterDeliveryDecisionBindingSummary();

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="publication-review-page poster-decision-page">
        <header className="review-hero">
          <PageContainer className="review-hero__grid">
            <div>
              <p className="eyebrow">Authenticated management workspace</p>
              <h1>Poster delivery decision</h1>
              <p className="lead">Choose one exact review scope and download a validated decision packet for the school-controlled record.</p>
            </div>
            <aside className="review-hero__status" aria-label="Current poster decision binding">
              <span>Decision binding</span>
              <strong>{binding.valid} of {binding.required}</strong>
              <p>{binding.ready ? "A private review scope is already bound." : "No review scope is recorded."}</p>
            </aside>
          </PageContainer>
        </header>

        <PageContainer>
          <nav className="poster-decision-toolbar" aria-label="Decision workspace navigation">
            <Link href="/publication-review">← Back to approval queue</Link>
            <Link href="/publication-review/poster-delivery-decision">Download blank JSON packet</Link>
          </nav>

          <section className="review-safety" aria-labelledby="poster-decision-boundary-title">
            <div>
              <p className="eyebrow">Completion boundary</p>
              <h2 id="poster-decision-boundary-title">The worksheet downloads a file; it stores nothing.</h2>
            </div>
            <p>No option is preselected. Completion and download happen only in this browser; the form sends no decision data to the server. It does not record a binding, generate an image, change the source or budget, or publish anything.</p>
          </section>

          <section className="poster-decision-baseline" aria-labelledby="poster-decision-baseline-title">
            <div>
              <p className="eyebrow">Verified baseline</p>
              <h2 id="poster-decision-baseline-title">Lossless PNG compression cannot meet the release ceiling.</h2>
            </div>
            <dl>
              <div><dt>Current PNG</dt><dd>{packet.currentAsset.bytes.toLocaleString("en-IN")} bytes</dd></div>
              <div><dt>Pixel-exact result</dt><dd>{packet.losslessBaseline.candidateBytes.toLocaleString("en-IN")} bytes</dd></div>
              <div><dt>Release ceiling</dt><dd>{packet.losslessBaseline.maximumBytes.toLocaleString("en-IN")} bytes</dd></div>
            </dl>
          </section>

          <DecisionWorkspaceForm options={packet.options} template={packet.requestTemplate} />
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
