import Link from "next/link";
import type { ReactNode } from "react";

import {
  admissionsActions,
  admissionsCycle,
  admissionsProcess,
  admissionsSectionLinks,
} from "@/app/data/admissions";
import { PageContainer } from "@/components/layout";
import { AdmissionsHeroMotion } from "@/components/motion/admissions-hero-motion";
import { AdmissionsTimelineMotion } from "@/components/motion/admissions-timeline-motion";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function AdmissionsActions({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`admissions-actions${compact ? " admissions-actions--compact" : ""}`}>
      {admissionsActions.map((action, index) => (
        <article className="admissions-action" key={action.href}>
          <span aria-hidden="true">0{index + 1}</span>
          <Link href={action.href}>{action.label}</Link>
          {!compact ? <small>{action.description}</small> : null}
          <b aria-hidden="true">↗</b>
        </article>
      ))}
    </div>
  );
}

export function AdmissionsReviewNotice({ children }: { children?: ReactNode }) {
  return (
    <aside className="admissions-review-notice" aria-labelledby="admissions-review-title">
      <span className="admissions-review-notice__mark" aria-hidden="true">!</span>
      <div>
        <strong id="admissions-review-title">Stage 3 review environment</strong>
        <p>
          {children ??
            "This page demonstrates the approved information structure. Real submissions, uploads, references and status lookups are not active, so please do not enter real applicant information."}
        </p>
      </div>
    </aside>
  );
}

export function AdmissionsSectionNav() {
  return (
    <nav className="admissions-section-nav" aria-label="Admissions pages">
      <PageContainer>
        <span>Admissions</span>
        <div>
          {admissionsSectionLinks.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
        </div>
      </PageContainer>
    </nav>
  );
}

export function AdmissionsPageFrame({
  eyebrow,
  title,
  summary,
  children,
  actions = true,
  reviewNotice = false,
  heroAside,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
  actions?: boolean;
  reviewNotice?: boolean;
  heroAside?: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <AdmissionsSectionNav />
      <main id="main-content" tabIndex={-1} className="admissions-page">
        <header className="admissions-hero">
          <AdmissionsHeroMotion className="page-container admissions-hero__grid">
            <div className="admissions-hero__copy">
              <div className="admissions-hero__intro" data-motion-hero-intro>
                <div className="admissions-hero__heading" data-motion-hero-heading data-motion-group="admissions-hero-heading" data-motion-item>
                  <p className="eyebrow">{eyebrow}</p>
                  <h1>{title}</h1>
                </div>
                <div className="admissions-hero__support" data-motion-hero-support data-motion-group="admissions-hero-support" data-motion-item>
                  <p className="admissions-hero__marathi" lang="mr">प्रवेश माहिती आणि पालक मार्गदर्शन</p>
                  <p className="lead">{summary}</p>
                </div>
              </div>
              <div className="admissions-cycle-line">
                <span>{admissionsCycle.academicYear}</span>
                <strong>{admissionsCycle.publicStatus}</strong>
              </div>
            </div>
            {heroAside ?? (
              <aside className="admissions-hero__aside" aria-label="Admissions publication status">
                <span>Review gate</span>
                <strong>Policy + privacy</strong>
                <p>Only verified dates, rules, fees and availability will move from configuration into public guidance.</p>
                <Link href="/admissions/contact">Ask the school <span aria-hidden="true">→</span></Link>
              </aside>
            )}
          </AdmissionsHeroMotion>
        </header>
        {reviewNotice ? <PageContainer><AdmissionsReviewNotice /></PageContainer> : null}
        {actions ? <PageContainer className="admissions-actions-wrap"><AdmissionsActions compact /></PageContainer> : null}
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

export function ProcessTimeline({ preview = false }: { preview?: boolean }) {
  const steps = preview ? admissionsProcess.slice(0, 4) : admissionsProcess;
  return (
    <AdmissionsTimelineMotion preview={preview}>
      {steps.map((step, index) => (
        <li data-motion-step data-motion-item key={step.title}>
          <span className="admissions-timeline__number">{String(index + 1).padStart(2, "0")}</span>
          <div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        </li>
      ))}
    </AdmissionsTimelineMotion>
  );
}

export function VerificationValue({
  label,
  value,
  pending = false,
}: {
  label: string;
  value: string;
  pending?: boolean;
}) {
  return (
    <div className="verification-value">
      <dt>{label}</dt>
      <dd>{value}</dd>
      <span className={pending ? "verification-value__pending" : "verification-value__verified"}>
        {pending ? "Approval required" : "Source checked"}
      </span>
    </div>
  );
}
