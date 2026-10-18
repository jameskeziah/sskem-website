import Link from "next/link";

import { HomeSectionReveal } from "@/components/motion/home-section-reveal";
import { HomeAdmissionsJourneyMotion } from "@/components/home/home-admissions-journey-motion";
import { admissionsProcess } from "@/app/data/admissions";

type HomepageAdmissionsCycle = {
  academicYear: string;
  institution: string;
  publicStatus: string;
  publicMessage: string;
};

/**
 * Separate the admissions decision from the photographic story.
 * We keep the live cycle status and the actual school process instead of
 * inventing any admission availability or unsupported marketing claims.
 */
export function HomepageAdmissionsFeature({ cycle }: { cycle: HomepageAdmissionsCycle }) {
  return (
    <HomeSectionReveal
      className="home-admissions-feature"
      ariaLabelledby="home-admissions-title"
    >
      <div className="home-shell home-admissions-feature__grid">
        <div className="home-admissions-feature__intro" data-home-section-reveal>
          <p className="home-chapter-label"><span>04</span> Admissions · {cycle.academicYear}</p>
          <p className="home-admissions-feature__institution">{cycle.institution}</p>
          <h2 id="home-admissions-title">
            The next chapter <em>begins here.</em>
          </h2>
          <p className="home-admissions-feature__lead">
            A clear route from your first question to the next step.
          </p>
          <div className="home-admissions-feature__status">
            <span>Current admissions position</span>
            <strong>{cycle.publicStatus}</strong>
          </div>
          <p className="home-admissions-feature__message">{cycle.publicMessage}</p>
          <div className="home-actions">
            <Link className="home-button home-button--dark" href="/admissions/enquire">
              Make an enquiry <span aria-hidden="true">→</span>
            </Link>
            <Link className="home-button home-button--outline-dark" href="/admissions/process">
              Understand the process
            </Link>
          </div>
        </div>

        <HomeAdmissionsJourneyMotion>
          <div className="home-admissions-feature__journey" data-home-section-reveal>
            <div className="home-admissions-feature__journey-head">
              <span>Explore the admission journey</span>
              <strong aria-hidden="true">01—04</strong>
            </div>
            <ol className="home-admissions-feature__steps" aria-label="Admission journey preview">
              {admissionsProcess.slice(0, 4).map((step, index) => (
                <li key={step.title} data-admissions-journey-step>
                  <span className="home-admissions-feature__step-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <strong>{step.title}</strong>
                  <span className="home-admissions-feature__step-mark" aria-hidden="true">
                    ↗
                  </span>
                </li>
              ))}
            </ol>
            <div className="home-admissions-feature__journey-foot">
              <span>Start with a conversation</span>
              <Link href="/admissions/enquire">
                Enquire now <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </HomeAdmissionsJourneyMotion>
      </div>
    </HomeSectionReveal>
  );
}
