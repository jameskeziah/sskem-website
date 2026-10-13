import Link from "next/link";
import { SiteImage } from "@/components/media/SiteImage";

import { HomeSectionReveal } from "@/components/motion/home-section-reveal";

import { admissionsProcess } from "@/app/data/admissions";

type HomepageAdmissionsCycle = {
  academicYear: string;
  institution: string;
  publicStatus: string;
  publicMessage: string;
};

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
          <h2 id="home-admissions-title">Your next step, made simple.</h2>
          <div className="home-admissions-feature__status">
            <span>Current position</span>
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

        <div className="home-admissions-feature__journey" data-home-section-reveal>
          <figure className="home-admissions-feature__photo">
            <SiteImage
              src="/media/home/story/environment.webp"
              alt="SSKEMS students and teachers working together on a tree-planting activity."
              width={1400}
              height={900}
              sizes="(max-width: 70rem) 100vw, 38vw"
              loading="lazy"
              unoptimized
            />
            <figcaption>Every school journey is built on shared experiences.</figcaption>
          </figure>
        <ol className="home-admissions-feature__steps" aria-label="Admission journey preview">
          {admissionsProcess.slice(0, 4).map((step, index) => (
            <li key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step.title}</strong>
            </li>
          ))}
        </ol>
        </div>
      </div>
    </HomeSectionReveal>
  );
}
