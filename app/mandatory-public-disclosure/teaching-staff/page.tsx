import type { Metadata } from "next";
import Link from "next/link";

import { saras7Staff } from "@/app/data/saras7-disclosure";
import { Alert } from "@/components/content";
import { PageContainer } from "@/components/layout";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Teaching Staff Register",
  description: "SSKEMS SARAS 7.0 Appendix IX staff register, pending school verification and approval.",
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
            <p className="eyebrow">Mandatory Public Disclosure · Section F</p>
            <h1>Teaching staff</h1>
            <p className="lead">The {saras7Staff.length} personnel entries below are transcribed from Section F of the school-supplied SARAS 7.0 PDF. This includes non-teaching staff, not only the Section D teaching count.</p>
          </header>
          <Alert title="School sign-off required" kind="warning">
            This source register is prepared for review, not an independently verified current employee roster. Management must confirm names, qualifications, designations and privacy clearance before publishing. Section D and F counts do not fully reconcile.
          </Alert>
          <div className="compliance-table-wrap">
            <table className="compliance-table staff-register">
              <caption>Section F — 58 source-reported personnel, approval pending</caption>
              <thead><tr><th scope="col">Name</th><th scope="col">Designation</th><th scope="col">Qualification</th><th scope="col">Staff category</th></tr></thead>
              <tbody>
                {saras7Staff.map((person) => (
                  <tr key={person.number}>
                    <th scope="row">{person.name}</th>
                    <td data-label="Designation">{person.designation}</td>
                    <td data-label="Qualification">{person.qualification}</td>
                    <td data-label="Staff category">{person.designation === "OTHER" ? "Other personnel" : "As recorded in SARAS"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="privacy-boundary"><strong>Public-data boundary:</strong> this register will never include private contact details, residential addresses, identity numbers, birth dates, salary, bank details, signatures or personal email addresses.</p>
          <Link className="button button--secondary" href="/mandatory-public-disclosure#section-f">Return to Section F</Link>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
