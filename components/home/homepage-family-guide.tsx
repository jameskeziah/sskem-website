import Link from "next/link";

import { siteFacts } from "@/app/data/site";
import { HomeSectionReveal } from "@/components/motion/home-section-reveal";

const questions = [
  {
    question: "Where should we start with admissions?",
    answer:
      "Read the published admission process, then submit an enquiry for current guidance on eligibility, availability and next steps. An enquiry is not a confirmed admission.",
    href: "/admissions/process",
    action: "View the admission process",
  },
  {
    question: "How can we verify the school's affiliation?",
    answer:
      "The school publishes its CBSE affiliation number and provides a dedicated Mandatory Public Disclosure area. Individual certificates are made available only when their current versions have been verified.",
    href: "/mandatory-public-disclosure",
    action: "View public disclosure",
  },
  {
    question: "Are the school, Junior College and Institute the same programme?",
    answer:
      "They have separate published institutional profiles, with their own academic scope. Use the learning pathways above to compare current verified information before enquiring.",
    href: "/school/academics",
    action: "Explore the school profile",
  },
  {
    question: "Can we contact the school before visiting?",
    answer:
      "Yes. Get in touch using the school's published contact details to ask a question or confirm an appropriate time to visit.",
    href: "/contact",
    action: "Find contact details",
  },
] as const;

/**
 * An informational, no-JavaScript-required parent guide.
 * Copy is intentionally limited to published contact, affiliation and routing facts.
 * No fees, admissions offers, outcomes or unapproved pupil media are introduced here.
 */
export function HomepageFamilyGuide() {
  return (
    <HomeSectionReveal className="home-family-guide" ariaLabelledby="home-family-guide-title">
      <div className="home-shell home-family-guide__grid">
        <div className="home-family-guide__editorial" data-home-section-reveal>
          <p className="home-chapter-label home-chapter-label--light">
            <span>06</span> A guide for families
          </p>
          <h2 id="home-family-guide-title">
            The big questions <em>deserve clear answers.</em>
          </h2>
          <p className="home-family-guide__intro">
            Discover the essentials, verify the facts, and connect with the right
            people before taking your next step.
          </p>

          <div className="home-family-guide__facts" aria-label="Verified school information">
            <div>
              <span className="home-family-guide__fact-label">CBSE affiliation</span>
              <strong>{siteFacts.affiliationNumber}</strong>
            </div>
            <div>
              <span className="home-family-guide__fact-label">Our location</span>
              <strong>Veral, Khed</strong>
              <small>Ratnagiri, Maharashtra</small>
            </div>
          </div>

          <Link className="home-family-guide__primary" href="/admissions/enquire">
            Start an admission enquiry <span aria-hidden="true">↗</span>
          </Link>
          <p className="home-family-guide__editorial-note">
            Important details are verified before publication; ask the school for
            any current information not yet available online.
          </p>
        </div>

        <div className="home-family-guide__questions" data-home-section-reveal>
          <div className="home-family-guide__questions-heading">
            <div>
              <p>Good to know</p>
              <h3>Before you begin</h3>
            </div>
            <span>{String(questions.length).padStart(2, "0")} answers</span>
          </div>
          <div className="home-family-guide__accordion">
            {questions.map((item, index) => (
              <details className="home-family-guide__item" key={item.question}>
                <summary>
                  <span className="home-family-guide__question-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="home-family-guide__question-text">{item.question}</span>
                  <span className="home-family-guide__toggle" aria-hidden="true">+</span>
                </summary>
                <div className="home-family-guide__answer">
                  <p>{item.answer}</p>
                  <Link href={item.href}>
                    {item.action} <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </details>
            ))}
          </div>
          <p className="home-family-guide__support">
            Still need help?{" "}
            <Link href="/contact">Speak with the school <span aria-hidden="true">→</span></Link>
          </p>
        </div>
      </div>
    </HomeSectionReveal>
  );
}
