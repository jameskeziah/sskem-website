import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { programmesWorkbookIntakeReceipt } from "@/app/data/programmes-workbook-intake";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { ProgrammesWorkbookIntakeForm } from "./programmes-workbook-intake-form";

import "../review.css";
import "./workspace.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Programmes Workbook Intake",
  description: "Private, browser-only preflight for the SSKEMS Programmes information workbook.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function ProgrammesWorkbookIntakePage() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/programmes-workbook-intake");

  const receipt = programmesWorkbookIntakeReceipt;

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="publication-review-page workbook-intake-page">
        <header className="review-hero">
          <PageContainer className="review-hero__grid">
            <div>
              <p className="eyebrow">Authenticated private preflight</p>
              <h1>Programmes workbook intake</h1>
              <p className="lead">Use the supplied workbook as a temporary, screened programme sketch while checking whether it is complete enough for controlled reconciliation.</p>
            </div>
            <aside className="review-hero__status" aria-label="Latest workbook status">
              <span>Approved programme forms</span>
              <strong>{receipt.totals.approvedForPublicationForms} / {receipt.totals.programmeForms}</strong>
              <p>The current recorded workbook is blocked.</p>
            </aside>
          </PageContainer>
        </header>

        <PageContainer>
          <nav className="workbook-intake-toolbar" aria-label="Programmes workbook navigation">
            <Link href="/publication-review">Back to approval queue</Link>
            <Link href="/publication-review/programmes-content-package">Open guarded content package</Link>
          </nav>

          <section className="review-safety workbook-intake-boundary" aria-labelledby="workbook-intake-boundary-title">
            <div>
              <p className="eyebrow">Privacy and approval boundary</p>
              <h2 id="workbook-intake-boundary-title">The workbook stays on this device.</h2>
            </div>
            <p>The browser reads the selected XLSX locally. It retains an aggregate receipt and may show a tightly allowlisted programme sketch in this tab only. It does not upload or persist the workbook, scan it for malware, create a content package, grant approval, update Sanity, activate routes or publish anything.</p>
          </section>

          <ProgrammesWorkbookIntakeForm initialReceipt={receipt} />

          <section className="workbook-intake-next" aria-labelledby="workbook-intake-next-title">
            <div>
              <p className="eyebrow">Required next action</p>
              <h2 id="workbook-intake-next-title">Return the workbook for management completion.</h2>
            </div>
            <ol>
              <li>Resolve every critical NOT CONFIRMED response against authoritative records.</li>
              <li>Record the institutional model for Senior Secondary, Junior College and exam preparation.</li>
              <li>Add current evidence references, validity dates and role-based management decisions.</li>
              <li>Remove or segregate people, contacts, internal fees and private evidence before creating a public-safe projection.</li>
              <li>Re-run this preflight, then manually reconcile the result in the guarded content-package workspace.</li>
            </ol>
          </section>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
