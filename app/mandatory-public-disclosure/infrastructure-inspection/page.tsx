import type { Metadata } from "next";
import Link from "next/link";

import { infrastructureFacts } from "@/app/data/disclosure";
import { saras7InspectionVideoUrl } from "@/app/data/saras7-disclosure";
import { VerificationState } from "@/components/compliance";
import { Alert } from "@/components/content";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Infrastructure Inspection",
  description: "Stable SSKEMS infrastructure-inspection disclosure route.",
  alternates: { canonical: "/mandatory-public-disclosure/infrastructure-inspection" },
  robots: { index: false, follow: true },
};

export default function InfrastructureInspectionPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="compliance-page inner-compliance-page">
        <PageContainer>
          <header className="inner-page-heading">
            <p className="eyebrow">Mandatory Public Disclosure · Section E</p>
            <h1>Infrastructure inspection</h1>
            <p className="lead">The school-supplied SARAS 7.0 file reports a YouTube inspection URL and infrastructure figures, pending independent validation.</p>
          </header>
          <Alert title="Inspection evidence pending" kind="warning">
            The submitted inspection video URL is retained as source evidence only. School management must verify the channel/video, recording context, permanent availability, inspection date and facility figures.
          </Alert>
          <div className="inspection-video-placeholder" role="status">
            <span aria-hidden="true">▶</span>
            <div><strong>Inspection video URL supplied in SARAS 7.0</strong><p><a href={saras7InspectionVideoUrl} target="_blank" rel="noreferrer">Review the source-reported inspection video <span className="visually-hidden">(opens in a new tab)</span></a>. This is not an approval of its authenticity or inspection date.</p></div>
          </div>
          <div className="compliance-summary-grid">
            {infrastructureFacts.map((fact) => <div className="compliance-summary-item" key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong><VerificationState state="approval-required" /></div>)}
          </div>
          <Link className="button button--secondary" href="/mandatory-public-disclosure#section-e">Return to Section E</Link>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
