import type { Metadata } from "next";
import Link from "next/link";

import {
  admissionsActions,
  admissionsCycle,
  ageRule,
} from "@/app/data/admissions";
import {
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
  const startingPoints = [
    {
      number: "01",
      eyebrow: "Start here",
      title: "Make an enquiry",
      description:
        "Ask about class availability, curriculum, fees, transport, accessibility or the right next step.",
      href: "/admissions/enquire",
      action: "Ask admissions",
      tone: "primary",
    },
    {
      number: "02",
      eyebrow: "Meet the school",
      title: "Plan a visit",
      description:
        "Speak with the school, understand daily routines and arrange any accessibility or communication support.",
      href: "/admissions/visit",
      action: "Plan your visit",
      tone: "soft",
    },
    {
      number: "03",
      eyebrow: "Formal stage",
      title: "Application guide",
      description:
        "See how the secure application journey will work. Real online submission remains off until the service is ready.",
      href: "/admissions/apply",
      action: "Review the journey",
      tone: "light",
    },
  ] as const;

  return (
    <AdmissionsPageFrame
      landing
      eyebrow={`Admissions ? ${admissionsCycle.academicYear}`}
      title="Your child's next chapter starts here."
      summary="Clear guidance before you share personal information. Understand the route, ask a short question, visit the school, and move to a formal application only when the secure service is ready."
      actions={false}
      heroActions={
        <>
          <Link
            className="button button--primary admissions-hero__primary-action"
            href="/admissions/enquire"
          >
            Make an enquiry <span aria-hidden="true">&rarr;</span>
          </Link>

          <Link
            className="admissions-hero__secondary-action"
            href="/admissions/process"
          >
            See how admission works
          </Link>
        </>
      }
      heroAside={
        <aside
          className="admissions-cycle-card admissions-cycle-card--landing"
          aria-label="Current admissions cycle"
        >
          <div>
            <span>Academic year</span>
            <strong>{admissionsCycle.academicYear}</strong>
          </div>

          <p>Current position</p>

          <small>
            {admissionsCycle.publicMessage}
          </small>

          <Link href="/admissions/contact">
            Speak with admissions <span aria-hidden="true">&rarr;</span>
          </Link>
        </aside>
      }
    >
      <section
        className="admissions-start"
        aria-labelledby="admissions-start-title"
      >
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--split">
            <div>
              <p className="eyebrow">
                Choose your starting point
              </p>

              <h2 id="admissions-start-title">
                Begin with what your family needs today.
              </h2>
            </div>

            <p>
              You do not need certificates or detailed student
              records to ask an initial admissions question.
            </p>
          </div>

          <div className="admissions-start-grid">
            {startingPoints.map((item) => (
              <article
                className={`admissions-start-card admissions-start-card--${item.tone}`}
                key={item.href}
              >
                <span className="admissions-start-card__number">
                  {item.number}
                </span>

                <p>{item.eyebrow}</p>
                <h3>{item.title}</h3>
                <small>{item.description}</small>

                <Link href={item.href}>
                  {item.action} <span aria-hidden="true">&rarr;</span>
                </Link>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>


      <section
        className="admissions-band admissions-route-band"
        aria-labelledby="admissions-pathways-title"
      >
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--split">
            <div>
              <p className="eyebrow">
                Find the right route
              </p>

              <h2 id="admissions-pathways-title">
                Which pathway fits your child?
              </h2>
            </div>

            <p>
              Different classes can follow different age,
              transfer and programme rules. Start with the
              correct route rather than a generic application.
            </p>
          </div>

          <div className="admissions-pathway-grid admissions-pathway-grid--landing">
            <Link href="/admissions/school">
              <span>Foundation + school</span>
              <strong>
                Balvatika &amp; Classes I-VIII
              </strong>
              <p>
                Maharashtra age guidance and previous-class
                eligibility.
              </p>
              <i aria-hidden="true">&rarr;</i>
            </Link>

            <Link href="/admissions/class-9-and-11-transfers">
              <span>Transfer review</span>
              <strong>Classes IX and XI</strong>
              <p>
                Prior class, board, subjects and timing
                require review.
              </p>
              <i aria-hidden="true">&rarr;</i>
            </Link>

            <Link href="/admissions/senior-secondary">
              <span>Restricted entry</span>
              <strong>Classes X and XII</strong>
              <p>
                These are not ordinary open-admission years.
              </p>
              <i aria-hidden="true">&rarr;</i>
            </Link>

            <Link href="/admissions/rte">
              <span>Official Maharashtra route</span>
              <strong>RTE 25%</strong>
              <p>
                The state process remains separate from
                regular school admission.
              </p>
              <i aria-hidden="true">&rarr;</i>
            </Link>
          </div>
        </PageContainer>
      </section>


      <section
        className="admissions-band admissions-process-band"
        aria-labelledby="admissions-process-title"
      >
        <PageContainer className="admissions-process-preview">
          <div className="admissions-section-heading">
            <p className="eyebrow">
              The parent journey
            </p>

            <h2 id="admissions-process-title">
              A clear route from question to confirmation.
            </h2>

            <p>
              The full process contains eight stages.
              The first four show what happens before
              formal review.
            </p>

            <Link
              className="button button--secondary"
              href="/admissions/process"
            >
              View all eight steps
            </Link>
          </div>

          <ProcessTimeline preview />
        </PageContainer>
      </section>


      <section
        className="admissions-band admissions-band--ink admissions-answers-band"
        aria-labelledby="admissions-answers-title"
      >
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--light">
            <p className="eyebrow">
              What families ask first
            </p>

            <h2 id="admissions-answers-title">
              Useful answers without guesswork.
            </h2>

            <p>
              Each answer shows the current publication
              position and points to the safest useful
              next step.
            </p>
          </div>

          <div className="admissions-answer-grid">
            {answerCards.map((card, index) => (
              <article key={card.label}>
                <span>
                  {String(index + 1).padStart(2, "0")}
                </span>

                <h3>{card.label}</h3>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>

                <Link href={card.href}>
                  {card.action}{" "}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>


      <section
        className="admissions-band admissions-band--soft admissions-status-band"
        aria-labelledby="admissions-config-title"
      >
        <PageContainer>
          <div className="admissions-section-heading admissions-section-heading--split">
            <div>
              <p className="eyebrow">
                What is confirmed today
              </p>

              <h2 id="admissions-config-title">
                We publish only what has been checked.
              </h2>
            </div>

            <p>
              Academic year, availability, age rules and
              fee information stay separate so an old or
              unapproved detail is never shown as current.
            </p>
          </div>

          <dl className="admissions-verification-grid">
            <VerificationValue
              label="Academic year"
              value={admissionsCycle.academicYear}
            />

            <VerificationValue
              label="Class availability"
              value="Awaiting school configuration"
              pending
            />

            <VerificationValue
              label="Maharashtra age cut-off"
              value={
                ageRule.cutoffDate ??
                "Official order required"
              }
              pending
            />

            <VerificationValue
              label="Fee schedule"
              value="Approved public record required"
              pending
            />
          </dl>
        </PageContainer>
      </section>


      <section
        className="admissions-closing admissions-closing--v2"
        aria-labelledby="admissions-help-title"
      >
        <PageContainer>
          <div>
            <p className="eyebrow">
              Ready to talk?
            </p>

            <h2 id="admissions-help-title">
              Start with one simple question.
            </h2>
          </div>

          <p>
            A short enquiry is enough to begin.
            Certificates, detailed records and formal
            declarations belong later in the process
            when they are actually required.
          </p>

          <Link
            className="button button--primary"
            href={admissionsActions[0].href}
          >
            Make an enquiry
          </Link>
        </PageContainer>
      </section>
    </AdmissionsPageFrame>
  );
}
