import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/content";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Teaching Staff Register",
  description: "Public-safe SSKEMS teaching-staff register for Mandatory Public Disclosure.",
  alternates: { canonical: "/mandatory-public-disclosure/teaching-staff" },
  robots: { index: false, follow: true },
};

export default function TeachingStaffPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="compliance-page inner-compliance-page">
        <PageContainer>
          <header className="inner-page-heading">
            <p className="eyebrow">Mandatory Public Disclosure · Section D</p>
            <h1>Teaching staff</h1>
            <p className="lead">A structured, privacy-limited register will replace manually edited staff PDFs.</p>
          </header>
          <Alert title="Approved staff records required" kind="warning">
            No person is listed until their current name, designation, qualification and staff category are approved for public use.
          </Alert>
          <div className="compliance-table-wrap">
            <table className="compliance-table staff-register">
              <caption>Approved public teaching-staff records</caption>
              <thead><tr><th scope="col">Name</th><th scope="col">Designation</th><th scope="col">Qualification</th><th scope="col">Staff category</th></tr></thead>
              <tbody><tr><td colSpan={4} className="table-empty-state">Publication pending: the approved, current and privacy-reviewed staff register has not yet been supplied.</td></tr></tbody>
            </table>
          </div>
          <p className="privacy-boundary"><strong>Public-data boundary:</strong> this register will never include private contact details, residential addresses, identity numbers, birth dates, salary, bank details, signatures or personal email addresses.</p>
          <Link className="button button--secondary" href="/mandatory-public-disclosure#section-d">Return to Section D</Link>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
