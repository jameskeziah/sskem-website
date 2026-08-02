import type { Metadata } from "next";
import Link from "next/link";

import {
  admissionsActions,
  admissionsCycle,
  ageRule,
} from "@/app/data/admissions";
import {
  AdmissionsActions,
  AdmissionsPageFrame,
  ProcessTimeline,
  VerificationValue,
} from "@/components/admissions";
import { PageContainer } from "@/components/layout";

export const metadata: Metadata = {
  title: "Admissions 2026–27",
  description:
    "SSKEMS admissions guidance for 2026–27, including process, age-rule status, documents, fees, enquiry, application and secure status planning.",
  alternates: { canonical: "/admissions" },
  robots: { index: false, follow: true },
};

const answerCards = [
  {
    label: "Applications and availability",
    value: admissionsCycle.publicStatus,
    detail: "Class-wise openings and seats require authorised school configuration.",
    href: "/admissions/contact",
    action: "Ask for current availability",
  },
  {
    label: "Age requirement",
    value: "Official order pending",
    detail: "The checker will not invent a cut-off date or date-of-birth range.",
    href: "/admissions/age-criteria",
    action: "Review age criteria",
  },
  {
    label: "Documents",
    value: "Conditional checklist",
    detail: "Requirements change by class, category and transfer context.",
    href: "/admissions/documents-required",
    action: "See document guidance",
  },
  {
    label: "Fees",
    value: "Approved schedule required",
    detail: "No amount is published without the academic year and approval source.",
    href: "/admissions/fees",
    action: "Review fee status",
  },
  {
    label: "School visit",
    value: "Arrange with the office",
    detail: "Visit slots and accessibility support require current confirmation.",
    href: "/admissions/visit",
    action: "Plan a visit",
  },
  {
    label: "Transport",
    value: "Route confirmation required",
    detail: "Ask about the child’s area; no unverified route is shown as available.",
    href: "/admissions/contact",
    action: "Ask about transport",
  },
] as const;

export default function AdmissionsLandingPage() {
  return (
    <AdmissionsPageFrame
      eyebrow="Admissions · Stage 3"
      title="Admissions, made clearer."
      summary="Understand the route before sharing personal information: check what is verified, ask a short question, then move to a formal application only when the secure service is ready."
      actions={false}
      heroAside={
        <aside className="admissions-cycle-card" aria-label="Current admissions cycle">
          <div><span>Academic year</span><strong>{admissionsCycle.academicYear}</strong></div>
          <p>{admissionsCycle.publicStatus}</p>
          <small>{admissionsCycle.publicMessage}</small>
          <Link href="/admissions/contact">Contact admissions <span aria-hidden="true">→</span></Link>
        </aside>
      }
    >
      <PageContainer className="admissions-landing-actions">
        <div className="admissions-section-heading admissions-section-heading--split">
          <div><p className="eyebrow">Choose the right starting point</p><h2>Three journeys, three distinct actions.</h2></div>
          <p>Enquiry, application and application tracking have different data needs and must never be collapsed into a single “Apply now” link.</p>
        </div>
        <AdmissionsActions />
      </PageContainer>

      <section className="admissions-band admissions-band--ink" aria-labelledby="admissions-answers-title">
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--light">
            <p className="eyebrow">What families need to know</p>
            <h2 id="admissions-answers-title">Answers without guesswork.</h2>
            <p>Each card states the current publication status and points to a useful next step.</p>
          </div>
          <div className="admissions-answer-grid">
            {answerCards.map((card, index) => (
              <article key={card.label}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{card.label}</h3>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>
                <Link href={card.href}>{card.action} <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="admissions-band" aria-labelledby="admissions-process-title">
        <PageContainer className="admissions-process-preview">
          <div className="admissions-section-heading">
            <p className="eyebrow">The parent journey</p>
            <h2 id="admissions-process-title">Know what comes next.</h2>
            <p>The full route contains eight clear stages, from the first eligibility check to an authorised admission-register entry.</p>
            <Link className="button button--secondary" href="/admissions/process">View all eight steps</Link>
          </div>
          <ProcessTimeline preview />
        </PageContainer>
      </section>

      <section className="admissions-band admissions-band--soft" aria-labelledby="admissions-config-title">
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--split">
            <div><p className="eyebrow">Source-led configuration</p><h2 id="admissions-config-title">Facts move only after approval.</h2></div>
            <p>Cycle status, class availability, age rules and fees belong in controlled records rather than manually typed promotional copy.</p>
          </div>
          <dl className="admissions-verification-grid">
            <VerificationValue label="Academic year" value={admissionsCycle.academicYear} />
            <VerificationValue label="Class availability" value="Awaiting school configuration" pending />
            <VerificationValue label="Maharashtra age cut-off" value={ageRule.cutoffDate ?? "Official order required"} pending />
            <VerificationValue label="Fee schedule" value="Approved public record required" pending />
          </dl>
        </PageContainer>
      </section>

      <section className="admissions-band" aria-labelledby="admissions-pathways-title">
        <PageContainer>
          <div className="admissions-section-heading">
            <p className="eyebrow">Special pathways</p>
            <h2 id="admissions-pathways-title">The right rule for the right class.</h2>
          </div>
          <div className="admissions-pathway-grid">
            <Link href="/admissions/school"><span>School</span><strong>Classes I–VIII</strong><p>Maharashtra rules and previous-class eligibility.</p></Link>
            <Link href="/admissions/class-9-and-11-transfers"><span>Transfers</span><strong>Classes IX and XI</strong><p>Prior-class and board-specific review.</p></Link>
            <Link href="/admissions/senior-secondary"><span>Restricted entry</span><strong>Classes X and XII</strong><p>Not ordinary open-admission years.</p></Link>
            <Link href="/admissions/rte"><span>Official process</span><strong>RTE 25%</strong><p>Separate from the regular school application.</p></Link>
          </div>
        </PageContainer>
      </section>

      <section className="admissions-closing" aria-labelledby="admissions-help-title">
        <PageContainer>
          <div><p className="eyebrow">Need help choosing?</p><h2 id="admissions-help-title">Start with the smallest safe step.</h2></div>
          <p>A short enquiry should ask only what the school needs to respond. Certificates and detailed student records belong later in the secure, conditional application process.</p>
          <Link className="button button--primary" href={admissionsActions[0].href}>Open the enquiry page</Link>
        </PageContainer>
      </section>
    </AdmissionsPageFrame>
  );
}
