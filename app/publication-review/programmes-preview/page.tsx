import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { CampusPicture } from "@/components/campus-picture";
import { PageContainer } from "@/components/layout";
import { ProgrammesGridMotion } from "@/components/motion/programmes-grid-motion";
import { ProgrammesHeroMotion } from "@/components/motion/programmes-hero-motion";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./programmes-preview.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Programmes Art-direction Preview",
  description: "Private SSKEMS prototype for reviewing programme hierarchy, wording and motion before approval.",
  robots: { index: false, follow: false, nocache: true },
};

type ProgrammeSource = "public-source-draft" | "internal-source-draft" | "hold";

const sourceLabels: Record<ProgrammeSource, string> = {
  "public-source-draft": "Public-source draft",
  "internal-source-draft": "Internal-source draft",
  hold: "Hold before publication",
};

const programmes = [
  {
    number: "01",
    title: "CBSE School Education",
    scope: "Classes I-XII",
    description: "A continuous school pathway from primary learning through Senior Secondary, presented here for structure review.",
    features: ["CBSE-aligned progression", "Assessment and academic support", "Co-curricular development"],
    source: "public-source-draft",
    href: "/admissions",
    action: "Explore admissions",
  },
  {
    number: "02",
    title: "Foundation",
    scope: "Classes VI-X",
    description: "Mathematics and Science foundations designed to strengthen concepts, problem solving and disciplined practice.",
    features: ["Concept teaching", "Topic-wise practice", "Testing and doubt support"],
    source: "internal-source-draft",
    href: "/admissions/enquire",
    action: "Enquire about Foundation",
  },
  {
    number: "03",
    title: "JEE Preparation",
    scope: "Classes XI-XII",
    description: "A proposed engineering-entrance pathway combining Physics, Chemistry and Mathematics preparation.",
    features: ["Concept development", "Problem-solving sessions", "Revision and performance review"],
    source: "internal-source-draft",
    href: "/admissions/enquire",
    action: "Enquire about JEE",
  },
  {
    number: "04",
    title: "NEET-UG Preparation",
    scope: "Classes XI-XII",
    description: "A proposed medical-entrance pathway combining Physics, Chemistry and Biology preparation.",
    features: ["Lecture and revision support", "Topic-wise practice", "Periodic testing and mentoring"],
    source: "internal-source-draft",
    href: "/admissions/enquire",
    action: "Enquire about NEET",
  },
  {
    number: "05",
    title: "Senior Secondary Science",
    scope: "Classes XI-XII",
    description: "Science education with subject learning, practical work, assessment and board-examination preparation.",
    features: ["Science subject pathway", "Laboratory-supported learning", "Academic progress monitoring"],
    source: "public-source-draft",
    href: "/admissions/senior-secondary",
    action: "Review admissions guidance",
  },
  {
    number: "06",
    title: "Future Skills Lab",
    scope: "School-age learners",
    description: "Exploratory exposure to computational thinking, programming and technology-led problem solving.",
    features: ["Robotics concepts", "AI and programming exposure", "Project-based exploration"],
    source: "internal-source-draft",
    href: "/admissions/enquire",
    action: "Enquire about Future Skills",
  },
  {
    number: "07",
    title: "Spoken English",
    scope: "Current level to be confirmed",
    description: "A communication-focused pathway intended to strengthen practical spoken-English confidence.",
    features: ["Spoken communication", "Vocabulary development", "Presentation confidence"],
    source: "internal-source-draft",
    href: "/admissions/enquire",
    action: "Enquire about Spoken English",
  },
  {
    number: "08",
    title: "Career Guidance & Counselling",
    scope: "Students and parents",
    description: "Guidance intended to support academic pathway awareness and informed educational planning.",
    features: ["Pathway guidance", "Career awareness", "Student-parent counselling"],
    source: "internal-source-draft",
    href: "/admissions/enquire",
    action: "Request a counselling enquiry",
  },
  {
    number: "09",
    title: "Additional Competitive Pathways",
    scope: "Availability must be confirmed",
    description: "Guidance and specialised preparation may be available for selected examinations; no permanent course is asserted here.",
    features: ["No individual course pages yet", "Current operation must be verified", "Confirm directly with admissions"],
    source: "hold",
    href: "/admissions/enquire",
    action: "Ask about current availability",
  },
] as const satisfies ReadonlyArray<{
  number: string;
  title: string;
  scope: string;
  description: string;
  features: readonly string[];
  source: ProgrammeSource;
  href: string;
  action: string;
}>;

const publicationGates = [
  ["Institutional model", "Confirm CBSE Senior Secondary, separate Junior College, or both, plus the ProTrack relationship."],
  ["Programme operations", "Approve active classes, subjects, eligibility, duration, delivery mode, branch availability and admission procedure."],
  ["Commercial details", "Supply current fees, scholarships and offers from controlled management records."],
  ["People and facilities", "Approve current faculty assignments, laboratories, technology, transport and hostel statements."],
  ["Results and claims", "Bind every rank, selection, percentage, award and named result to evidence and approval."],
  ["Media and placement", "Approve photographs, consent, captions, crop treatment and final public navigation position."],
] as const;

export default async function ProgrammesPreviewPage() {
  if (process.env.HOMEPAGE_REVIEW_MODE !== "private") notFound();
  await requireChatGPTUser("/publication-review/programmes-preview");

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="programmes-preview-page">
        <ProgrammesHeroMotion>
          <PageContainer className="programmes-preview-hero__grid">
            <div className="programmes-preview-hero__content" data-motion-programmes-hero-content>
              <p className="programmes-preview-kicker" data-motion-programmes-hero-eyebrow>
                Private editorial prototype <span>Not approved for public use</span>
              </p>
              <h1 id="programmes-preview-title" data-motion-programmes-hero-heading>
                Every academic stage, <em>one clear journey.</em>
              </h1>
              <p className="programmes-preview-hero__lead" data-motion-programmes-hero-copy>
                Review how school education, Foundation, Senior Secondary, JEE, NEET, future skills and counselling could form one coherent programme story. All wording below remains a source draft until its governing approvals are complete.
              </p>
              <div className="programmes-preview-hero__actions" data-motion-programmes-hero-actions>
                <a className="button button--primary" href="#programmes-grid-title">Review the programme grid</a>
                <Link className="button button--quiet" href="/publication-review/programmes-content-package">Complete the approval package</Link>
              </div>
            </div>

            <figure className="programmes-preview-hero__media" data-motion-programmes-hero-media>
              <CampusPicture
                recordId="media-campus-main"
                fallbackSrc="/media/home/campus-main.jpeg"
                alt="The pink and white SSKEMS school building in Veral, shown as a private prototype reference."
                sizes="(max-width: 63.999rem) 100vw, 44vw"
                priority
              />
              <figcaption>
                <span>Prototype campus reference</span>
                <strong>Media approval remains independent</strong>
              </figcaption>
            </figure>
          </PageContainer>
        </ProgrammesHeroMotion>

        <ProgrammesGridMotion>
          <PageContainer>
            <header className="programmes-preview-section-heading">
              <div>
                <p className="eyebrow">Programme architecture</p>
                <h2 id="programmes-grid-title">Designed for every stage of the academic journey.</h2>
              </div>
              <p>Source labels describe where the draft came from. They are not publication approvals.</p>
            </header>

            <div className="programmes-preview-grid">
              {programmes.map((programme) => (
                <article
                  className="programmes-preview-card"
                  data-motion-programme-card
                  data-source-status={programme.source}
                  key={programme.number}
                >
                  <div className="programmes-preview-card__topline">
                    <span className="programmes-preview-card__number">{programme.number}</span>
                    <span className="programmes-preview-card__status">{sourceLabels[programme.source]}</span>
                  </div>
                  <div className="programmes-preview-card__body">
                    <p>{programme.scope}</p>
                    <h3>{programme.title}</h3>
                    <p>{programme.description}</p>
                    <ul>
                      {programme.features.map((feature) => <li key={feature}>{feature}</li>)}
                    </ul>
                  </div>
                  <Link href={programme.href}>{programme.action} <span aria-hidden="true">→</span></Link>
                </article>
              ))}
            </div>
          </PageContainer>
        </ProgrammesGridMotion>

        <section className="programmes-preview-boundary" aria-labelledby="programmes-boundary-title">
          <PageContainer>
            <header className="programmes-preview-section-heading programmes-preview-section-heading--light">
              <div>
                <p className="eyebrow">Publication boundary</p>
                <h2 id="programmes-boundary-title">What must be approved before this can become a public page.</h2>
              </div>
              <p>This operational information remains outside the motion sequence so it is immediately readable.</p>
            </header>
            <dl className="programmes-preview-gates">
              {publicationGates.map(([title, description], index) => (
                <div key={title}>
                  <dt><span>{String(index + 1).padStart(2, "0")}</span>{title}</dt>
                  <dd>{description}</dd>
                </div>
              ))}
            </dl>
            <div className="programmes-preview-boundary__action">
              <p><strong>Current result:</strong> art direction and motion can be reviewed now; no draft claim, image, route or navigation item is activated by this prototype.</p>
              <Link className="button button--primary" href="/publication-review/programmes-content-package">Open the Programmes content package</Link>
            </div>
          </PageContainer>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
