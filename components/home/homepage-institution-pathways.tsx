import Link from "next/link";

import { getPublicProgrammeProfile } from "@/app/data/programmes-public-profiles";
import {
  PROGRAMMES_PUBLICATION_ROUTES,
  type ProgrammesPublicationRoute,
} from "@/lib/programmes-publication-routes";

const pathwayFallbacks: Record<ProgrammesPublicationRoute, { label: string; title: string }> = {
  "/school/academics": { label: "CBSE School", title: "School academics" },
  "/junior-college": { label: "Junior College", title: "Higher Secondary education" },
  "/programmes/jee-neet": { label: "Institute", title: "Entrance-examination preparation" },
};

const supportingRoutes = [
  { label: "Admissions", href: "/admissions" },
  { label: "Campus", href: "/school/facilities" },
  { label: "Student life", href: "/student-life" },
] as const;

export function HomepageInstitutionPathways({
  privateReview = false,
  now = new Date(),
}: {
  privateReview?: boolean;
  now?: Date;
}) {
  const pathways = PROGRAMMES_PUBLICATION_ROUTES.flatMap((route) => {
    const profile = getPublicProgrammeProfile(route, now);
    if (profile) {
      return [{
        route,
        state: "approved-public-subset" as const,
        label: profile.navigationLabel,
        title: profile.title,
        summary: profile.summary,
      }];
    }

    if (!privateReview) return [];

    return [{
      route,
      state: "private-pending" as const,
      label: pathwayFallbacks[route].label,
      title: pathwayFallbacks[route].title,
      summary: "This pathway remains in private review until its approved public profile is current.",
    }];
  });

  return (
    <section
      className="home-pathways"
      aria-labelledby="pathways-title"
      data-homepage-p0="institution-pathways"
      data-private-review={privateReview ? "true" : "false"}
    >
      <div className="home-shell">
        <div className="home-section-heading home-section-heading--split">
          <div>
            <p className="home-chapter-label"><span>03</span> Learning pathways</p>
            <h2 id="pathways-title">Distinct paths. One place to begin.</h2>
          </div>
          <p>Explore the school, Junior College and Institute through their current published profiles.</p>
        </div>

        <div className="home-pathways__grid">
          {pathways.map((pathway, index) => (
            <article
              className={`home-pathway-card home-pathway-card--${pathway.state}`}
              data-publication-state={pathway.state}
              key={pathway.route}
            >
              <div className="home-pathway-card__meta">
                <span className="home-pathway-card__number">{String(index + 1).padStart(2, "0")}</span>
                <span className="home-pathway-card__status">
                  {pathway.state === "approved-public-subset" ? "Published profile" : "Private review"}
                </span>
              </div>
              <div>
                <p className="home-pathway-card__label">{pathway.label}</p>
                <h3>{pathway.title}</h3>
                <p>{pathway.summary}</p>
              </div>
              {pathway.state === "approved-public-subset" ? (
                <Link href={pathway.route}>
                  View programme <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <span className="home-pathway-card__withheld">Not available on the public website</span>
              )}
            </article>
          ))}
        </div>

        <nav className="home-pathways__supporting" aria-label="More ways to explore SSKEMS">
          <span>Also explore</span>
          {supportingRoutes.map((route) => (
            <Link href={route.href} key={route.href}>{route.label} <span aria-hidden="true">↗</span></Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
