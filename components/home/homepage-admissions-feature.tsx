import Link from "next/link";

import { admissionsProcess } from "@/app/data/admissions";

type HomepageAdmissionsCycle = {
  academicYear: string;
  institution: string;
  publicStatus: string;
  publicMessage: string;
};

export function HomepageAdmissionsFeature({ cycle }: { cycle: HomepageAdmissionsCycle }) {
  return (
    <section
      className="home-admissions-feature"
      aria-labelledby="home-admissions-title"
      data-homepage-p0="admissions-feature"
    >
      <div className="home-shell home-admissions-feature__grid">
        <div className="home-admissions-feature__intro">
          <p className="home-chapter-label"><span>04</span> Admissions · {cycle.academicYear}</p>
          <p className="home-admissions-feature__institution">{cycle.institution}</p>
          <h2 id="home-admissions-title">Begin with the right information.</h2>
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

        <ol className="home-admissions-feature__steps" aria-label="Admission journey preview">
          {admissionsProcess.slice(0, 4).map((step, index) => (
            <li key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step.title}</strong>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
