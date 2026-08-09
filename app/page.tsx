import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { HomeAchievementsMotion } from "@/components/motion/home-achievements-motion";
import { HomeCampusMotion } from "@/components/motion/home-campus-motion";
import { HomeHeroMotion } from "@/components/motion/home-hero-motion";
import { siteFacts } from "@/app/data/site";

import "./homepage.css";

export const metadata: Metadata = {
  title: "Shree Samarth Krupa English Medium School, Veral",
  description:
    "Explore SSKEMS in Veral, including the CBSE school, admissions guidance, campus, student life and Mandatory Public Disclosure.",
};

const pathways = [
  {
    number: "01",
    title: "School",
    description: "Begin with the school overview, academics, faculty and campus information.",
    href: "/school",
    link: "Explore the school",
  },
  {
    number: "02",
    title: "Admissions",
    description: "Review the process, current criteria status, document guidance and enquiry route.",
    href: "/admissions",
    link: "Plan your next step",
  },
  {
    number: "03",
    title: "Student life",
    description: "Find clubs, the calendar, uniform guidance and photographs from school life.",
    href: "/student-life",
    link: "Discover student life",
  },
] as const;

const serviceLinks = [
  {
    number: "01",
    label: "Admissions",
    description: "Clear guidance before you enquire",
    href: "/admissions",
  },
  {
    number: "02",
    label: "Mandatory Public Disclosure",
    description: "Open the Appendix IX disclosure",
    href: "/mandatory-public-disclosure",
  },
  {
    number: "03",
    label: "Documents",
    description: "Search the controlled archive",
    href: "/documents",
  },
] as const;

const achievementArtwork = [
  {
    src: "/media/home/class-x-results-2025-26.jpeg",
    title: "Class X results",
    meta: "School-supplied creative · 2025–26",
    alt: "SSKEMS Class X results artwork showing six student achievers and their published percentages.",
  },
  {
    src: "/media/home/xii-science-2025-26.jpeg",
    title: "XII Science batch",
    meta: "School-supplied creative · 2025–26",
    alt: "SSKEMS XII Science batch results artwork showing seven student achievers and their published percentages.",
  },
  {
    src: "/media/home/rangotsav-2025-26.jpeg",
    title: "Rangotsav recognition",
    meta: "School-supplied creative · 2025–26",
    alt: "SSKEMS Rangotsav celebration artwork showing five pupils named as Art Maestro award recipients.",
  },
  {
    src: "/media/home/result-and-admissions-2025-26.jpg",
    title: "Results and admissions update",
    meta: "School-supplied creative · 2025–26",
    alt: "Combined SSKEMS Class X first-rank and engineering and medical admissions guidance artwork.",
  },
] as const;

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="home-page">
        <HomeHeroMotion>
          <div className="home-hero__inner">
            <div className="home-hero__copy">
              <p className="home-kicker" data-motion-home-hero-intro>
                <strong>SSKEMS</strong> · Veral
              </p>
              <h1 id="home-title" className="home-hero__title" aria-label="Here, possibility begins.">
                <span data-motion-home-hero-heading>
                  Here<span className="home-hero__punctuation" aria-hidden="true">,</span>
                </span>
                <span data-motion-home-hero-heading>possibility</span>
                <span data-motion-home-hero-heading>
                  begins<span className="home-hero__punctuation" aria-hidden="true">.</span>
                </span>
              </h1>
              <p className="home-hero__school-name" data-motion-home-hero-support>
                Shree Samarth Krupa English Medium School
              </p>

              <dl className="home-hero__facts">
                <div>
                  <dt>CBSE affiliation</dt>
                  <dd>{siteFacts.affiliationNumber}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>Veral, Khed · Ratnagiri</dd>
                </div>
              </dl>

              <div className="home-actions">
                <Link className="home-button home-button--light" href="/school">
                  Explore the school <span aria-hidden="true">→</span>
                </Link>
                <Link className="home-button home-button--outline-light" href="/admissions/enquire">
                  Admissions enquiry
                </Link>
              </div>
            </div>

            <div className="home-hero__accent" aria-hidden="true" data-motion-home-hero-accent />

            <div className="home-hero__media">
              <Image
                src="/media/home/campus-main.jpeg"
                alt="The pink and white SSKEMS school building in Veral."
                width={1400}
                height={500}
                sizes="(max-width: 70rem) 100vw, 62vw"
                priority
                unoptimized
              />
              <div className="home-hero__media-shade" aria-hidden="true" />
              <p className="home-hero__caption">Campus · Veral</p>
            </div>
          </div>
        </HomeHeroMotion>

        <section className="home-manifesto" aria-labelledby="manifesto-title">
          <div className="home-shell home-manifesto__grid">
            <p className="home-chapter-label"><span>01</span> Our foundation</p>
            <div>
              <h2 id="manifesto-title">
                Knowledge for today.
                <span>Character for every tomorrow.</span>
              </h2>
              <p className="home-manifesto__lead">
                Education should help every learner understand the world, find their voice and move through life with confidence.
              </p>
              <div className="home-language-lines" aria-label="Our educational direction in Marathi and Hindi">
                <p lang="mr">शिक्षण, संस्कार आणि आत्मविश्वास यांचा समतोल विकास.</p>
                <p lang="hi">शिक्षा, संस्कार और आत्मविश्वास का संतुलित विकास।</p>
              </div>
            </div>
          </div>
        </section>

        <HomeCampusMotion>
          <div className="home-shell">
            <div className="home-campus__heading" data-motion-home-campus-copy>
              <p className="home-chapter-label home-chapter-label--light"><span>02</span> The campus</p>
              <h2 id="campus-title">A closer look at where the day begins.</h2>
              <p>Three views of the SSKEMS campus and grounds in Veral.</p>
            </div>

            <div className="home-campus__gallery">
              <figure className="home-campus__frame home-campus__frame--grounds" data-motion-home-campus-frame>
                <Image
                  src="/media/home/campus-grounds.jpeg"
                  alt="SSKEMS school building seen across the open grounds."
                  width={1400}
                  height={500}
                  sizes="(max-width: 768px) 100vw, 68vw"
                  unoptimized
                />
                <figcaption>Across the grounds</figcaption>
              </figure>
              <figure className="home-campus__frame home-campus__frame--entrance" data-motion-home-campus-frame>
                <Image
                  src="/media/home/campus-entrance.jpeg"
                  alt="The front entrance of the SSKEMS school building."
                  width={1400}
                  height={500}
                  sizes="(max-width: 768px) 100vw, 35vw"
                  unoptimized
                />
                <figcaption>At the entrance</figcaption>
              </figure>
              <figure className="home-campus__frame home-campus__frame--courtyard" data-motion-home-campus-frame>
                <Image
                  src="/media/home/campus-courtyard.jpeg"
                  alt="A shaded view of the SSKEMS campus from the grounds."
                  width={1400}
                  height={500}
                  sizes="(max-width: 768px) 100vw, 42vw"
                  unoptimized
                />
                <figcaption>Campus perspective</figcaption>
              </figure>
            </div>

            <div className="home-campus__closing" data-motion-home-campus-copy>
              <p>One campus. Many beginnings.</p>
              <Link href="/school/facilities">Explore the campus <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </HomeCampusMotion>

        <section className="home-pathways" aria-labelledby="pathways-title">
          <div className="home-shell">
            <div className="home-section-heading home-section-heading--split">
              <div>
                <p className="home-chapter-label"><span>03</span> Find your way</p>
                <h2 id="pathways-title">The right information, without the search.</h2>
              </div>
              <p>Start with the part of school life that matters to you today.</p>
            </div>
            <div className="home-pathways__grid">
              {pathways.map((pathway) => (
                <article className="home-pathway-card" key={pathway.href}>
                  <span className="home-pathway-card__number">{pathway.number}</span>
                  <div>
                    <h3>{pathway.title}</h3>
                    <p>{pathway.description}</p>
                  </div>
                  <Link href={pathway.href}>
                    {pathway.link} <span aria-hidden="true">→</span>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="home-services" aria-labelledby="services-title">
          <div className="home-shell home-services__grid">
            <div className="home-services__intro">
              <p className="home-chapter-label home-chapter-label--light"><span>04</span> Essential access</p>
              <h2 id="services-title">Trust is built by making important information easy to reach.</h2>
              <p>Admissions guidance, public disclosure and document records remain readable and usable before any animation loads.</p>
            </div>
            <nav className="home-services__links" aria-label="Essential school information">
              {serviceLinks.map((item) => (
                <Link href={item.href} key={item.href}>
                  <span>{item.number}</span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                  <i aria-hidden="true">→</i>
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <HomeAchievementsMotion>
          <div className="home-shell">
            <div className="home-section-heading home-section-heading--split">
              <div>
                <p className="home-chapter-label"><span>05</span> Publication review</p>
                <h2 id="achievements-title">Effort deserves a thoughtful stage.</h2>
              </div>
              <div className="home-achievements__review" id="achievement-review-note">
                <strong>Approval gate</strong>
                <p>These supplied creatives are staged for private review. Names, photographs, marks, award wording and institutional status require approval before public publication.</p>
              </div>
            </div>

            <div className="home-achievements__grid" aria-describedby="achievement-review-note">
              {achievementArtwork.map((artwork, index) => (
                <article className="home-achievement-card" data-motion-home-achievement key={artwork.src}>
                  <a href={artwork.src} target="_blank" rel="noreferrer" aria-label={`Open full-size ${artwork.title} artwork in a new tab`}>
                    <span className="home-achievement-card__media">
                      <Image
                        src={artwork.src}
                        alt={artwork.alt}
                        width={1400}
                        height={500}
                        sizes="(max-width: 768px) 100vw, 48vw"
                        unoptimized
                      />
                    </span>
                    <span className="home-achievement-card__body">
                      <span><i>{String(index + 1).padStart(2, "0")}</i>{artwork.meta}</span>
                      <strong>{artwork.title}</strong>
                      <small>Open full artwork <span aria-hidden="true">→</span></small>
                    </span>
                  </a>
                </article>
              ))}
            </div>
          </div>
        </HomeAchievementsMotion>

        <section className="home-invitation" aria-labelledby="invitation-title">
          <div className="home-shell home-invitation__grid">
            <div>
              <p className="home-chapter-label"><span>06</span> Begin a conversation</p>
              <h2 id="invitation-title">Your next chapter starts with one clear step.</h2>
            </div>
            <div className="home-invitation__action">
              <p>Current dates, availability, criteria and fees are being verified. The school office can guide you with the latest information.</p>
              <div className="home-actions">
                <Link className="home-button home-button--dark" href="/admissions/enquire">Make an enquiry <span aria-hidden="true">→</span></Link>
                <Link className="home-button home-button--outline-dark" href="/contact">Contact the school</Link>
              </div>
              <p className="home-invitation__contact">
                <a href={`tel:${siteFacts.mobile}`}>{siteFacts.mobile}</a>
                <a href={`mailto:${siteFacts.email}`}>{siteFacts.email}</a>
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
