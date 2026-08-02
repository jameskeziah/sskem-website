import type { Metadata } from "next";
import Link from "next/link";

import { infrastructureFacts } from "@/app/data/disclosure";
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
            <p className="lead">This stable school-controlled page will hold the permanent inspection-video link and its verified context.</p>
          </header>
          <Alert title="Inspection evidence pending" kind="warning">
            An authorised permanent video URL, inspection date, responsible approver and verified infrastructure measurements are required before publication.
          </Alert>
          <div className="inspection-video-placeholder" role="status">
            <span aria-hidden="true">▶</span>
            <div><strong>Approved inspection video required</strong><p>No temporary embed or unverified channel link is exposed.</p></div>
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
