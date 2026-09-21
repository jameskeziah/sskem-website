import type { Metadata } from "next";
import { SiteImage } from "@/components/media/SiteImage";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CampusPicture } from "@/components/campus-picture";
import { HomepageAdmissionsFeature } from "@/components/home/homepage-admissions-feature";
import { HomepageIdentityStrip } from "@/components/home/homepage-identity-strip";
import { HomepageInstitutionPathways } from "@/components/home/homepage-institution-pathways";
import { HomeAchievementsMotion } from "@/components/motion/home-achievements-motion";
import { HomeCampusMotion } from "@/components/motion/home-campus-motion";
import { HomeHeroMotion } from "@/components/motion/home-hero-motion";
import { siteFacts } from "@/app/data/site";
import { getHomepageEditorialContent } from "@/lib/cms/homepage-editorial.server";
import { selectHomepageAchievementArtwork } from "@/lib/homepage-achievement-publication";

import "./homepage.css";

export const metadata: Metadata = {
  title: "Shree Samarth Krupa English Medium School, Veral",
  description:
    "Explore SSKEMS in Veral, including the CBSE school, admissions guidance, campus, student life and Mandatory Public Disclosure.",
};

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

const eventDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export default async function Home() {
  const editorial = await getHomepageEditorialContent();
  const privateHomepageReview = process.env.HOMEPAGE_REVIEW_MODE === "private";
  const privateAchievementReview = privateHomepageReview;
  const achievementArtwork = selectHomepageAchievementArtwork({
    mode: privateAchievementReview ? "private-review" : "public",
  });
  const eventsChapter = achievementArtwork.length ? "07" : "06";
  const invitationChapter = String(
    6 + Number(achievementArtwork.length > 0) + Number(editorial.events.length > 0),
  ).padStart(2, "0");

  return (
    <>
      <SiteHeader
        showBreadcrumb={false}
        editorial={{
          notice: editorial.notice ? {
            message: editorial.notice.message,
            href: editorial.notice.href,
            linkLabel: editorial.notice.title,
          } : null,
          contact: {
            phone: editorial.contact.phone,
            email: editorial.contact.email,
          },
        }}
      />
      <main id="main-content" tabIndex={-1} className="home-page">
        <HomeHeroMotion reviewMode={privateHomepageReview ? "private-review" : "public"}>
          {privateHomepageReview ? (
            <div className="home-preloader" data-motion-home-preloader aria-hidden="true">
              <div className="home-preloader__inner">
                <span className="home-preloader__mark" data-motion-home-preloader-item>
                  <SiteImage
                    src="/sskem-logo.png"
                    alt=""
                    width={120}
                    height={120}
                    sizes="120px"
                    priority
                  />
                </span>
                <p className="home-preloader__identity" data-motion-home-preloader-item>
                  <strong>SSKEMS</strong>
                  <span>Veral · Khed · Ratnagiri</span>
                </p>
                <span className="home-preloader__rule" data-motion-home-preloader-rule />
              </div>
            </div>
          ) : null}

          <div className="home-hero__desktop-poster" data-home-hero-art aria-hidden="true" />

          <div className="home-hero__live-copy">
            {privateHomepageReview ? (
              <p className="home-hero__review-note">Private homepage prototype</p>
            ) : null}
            <p className="home-kicker" data-motion-home-hero-intro>
              <strong>SSKEMS</strong> · Veral
            </p>
            <h1 id="home-title" className="home-hero__title" aria-label="Here, possibility begins.">
              <span className="home-hero__line">
                <span data-motion-home-hero-heading>
                  Here<span className="home-hero__punctuation" aria-hidden="true">,</span>
                </span>
              </span>
              <span className="home-hero__line">
                <span data-motion-home-hero-heading>possibility</span>
              </span>
              <span className="home-hero__line">
                <span data-motion-home-hero-heading>
                  begins<span className="home-hero__punctuation" aria-hidden="true">.</span>
                </span>
              </span>
            </h1>
          </div>

          <div className="home-hero__mobile-media" data-motion-home-hero-media>
            <CampusPicture
              recordId="media-campus-main"
              fallbackSrc="/media/home/campus-main.jpeg"
              alt="The pink and white SSKEMS school building in Veral."
              sizes="(max-width: 63.999rem) 100vw, 1px"
              priority
            />
          </div>

          <div className="home-hero__dock">
            <div className="home-shell home-hero__dock-inner">
              <p className="home-hero__school-name">
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
                  {privateHomepageReview ? "Explore SSKEMS" : "Explore the school"} <span aria-hidden="true">→</span>
                </Link>
                <Link className="home-button home-button--outline-light" href="/admissions/enquire">
                  {privateHomepageReview ? `Admissions ${editorial.admissionsCycle.academicYear}` : "Admissions enquiry"}
                </Link>
              </div>
            </div>
          </div>
        </HomeHeroMotion>

        <HomepageIdentityStrip />

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
                <CampusPicture
                  recordId="media-campus-grounds"
                  fallbackSrc="/media/home/campus-grounds.jpeg"
                  alt="SSKEMS school building seen across the open grounds."
                  sizes="(max-width: 768px) 100vw, 68vw"
                />
                <figcaption>Across the grounds</figcaption>
              </figure>
              <figure className="home-campus__frame home-campus__frame--entrance" data-motion-home-campus-frame>
                <CampusPicture
                  recordId="media-campus-entrance"
                  fallbackSrc="/media/home/campus-entrance.jpeg"
                  alt="The front entrance of the SSKEMS school building."
                  sizes="(max-width: 768px) 100vw, 35vw"
                />
                <figcaption>At the entrance</figcaption>
              </figure>
              <figure className="home-campus__frame home-campus__frame--courtyard" data-motion-home-campus-frame>
                <CampusPicture
                  recordId="media-campus-courtyard"
                  fallbackSrc="/media/home/campus-courtyard.jpeg"
                  alt="A shaded view of the SSKEMS campus from the grounds."
                  sizes="(max-width: 768px) 100vw, 42vw"
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

        <HomepageInstitutionPathways privateReview={privateHomepageReview} />

        <HomepageAdmissionsFeature cycle={editorial.admissionsCycle} />

        <section className="home-services" aria-labelledby="services-title">
          <div className="home-shell home-services__grid">
            <div className="home-services__intro">
              <p className="home-chapter-label home-chapter-label--light"><span>05</span> Essential access</p>
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

        {achievementArtwork.length ? (
          <HomeAchievementsMotion publicationMode={privateAchievementReview ? "private-review" : "public"}>
            <div className="home-shell">
              <div className="home-section-heading home-section-heading--split">
                <div>
                  <p className="home-chapter-label"><span>06</span> {privateAchievementReview ? "Publication review" : "Verified achievements"}</p>
                  <h2 id="achievements-title">Effort deserves a thoughtful stage.</h2>
                </div>
                <div className={`home-achievements__review${privateAchievementReview ? "" : " home-achievements__review--approved"}`} id="achievement-review-note">
                  <strong>{privateAchievementReview ? "Approval gate" : "Publication status"}</strong>
                  <p>{privateAchievementReview
                    ? "Supplied creatives remain visible only in private review. Names, photographs, marks, award wording and institutional status require approval before public publication."
                    : "Each displayed creative has current approval for both its media and its published claims."}</p>
                </div>
              </div>

              <div className="home-achievements__grid" aria-describedby="achievement-review-note">
                {achievementArtwork.map((artwork, index) => (
                  <article className="home-achievement-card" data-motion-home-achievement key={artwork.src}>
                    <a href={artwork.src} target="_blank" rel="noreferrer" aria-label={`Open full-size ${artwork.title} artwork in a new tab`}>
                      <span className="home-achievement-card__media">
                        <SiteImage
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
        ) : null}

        {editorial.events.length ? (
          <section className="home-events" aria-labelledby="events-title">
            <div className="home-shell">
              <div className="home-section-heading home-section-heading--split">
                <div>
                  <p className="home-chapter-label"><span>{eventsChapter}</span> Coming up</p>
                  <h2 id="events-title">Dates worth keeping close.</h2>
                </div>
                <p>Only current, approved public events appear here.</p>
              </div>
              <div className="home-events__grid">
                {editorial.events.map((event) => (
                  <article className="home-event-card" key={`${event.startAt}-${event.title}`}>
                    <time dateTime={event.startAt}>{eventDateFormatter.format(new Date(event.startAt))}</time>
                    <h3>{event.title}</h3>
                    {event.summary ? <p>{event.summary}</p> : null}
                    {event.location ? <p className="home-event-card__location">{event.location}</p> : null}
                    {event.href ? <Link href={event.href}>Event details <span aria-hidden="true">→</span></Link> : null}
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="home-invitation" aria-labelledby="invitation-title">
          <div className="home-shell home-invitation__grid">
            <div>
              <p className="home-chapter-label"><span>{invitationChapter}</span> Begin a conversation</p>
              <h2 id="invitation-title">Your next chapter starts with one clear step.</h2>
            </div>
            <div className="home-invitation__action">
              <p>{editorial.admissionsCycle.publicMessage}</p>
              <div className="home-actions">
                <Link className="home-button home-button--dark" href="/admissions/enquire">Make an enquiry <span aria-hidden="true">→</span></Link>
                <Link className="home-button home-button--outline-dark" href="/contact">Contact the school</Link>
              </div>
              <p className="home-invitation__contact">
                <a href={`tel:${editorial.contact.mobile.replace(/\s/g, "")}`}>{editorial.contact.mobile}</a>
                <a href={`mailto:${editorial.contact.email}`}>{editorial.contact.email}</a>
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter contact={{
        phone: editorial.contact.phone,
        email: editorial.contact.email,
        location: editorial.contact.location,
        weekdays: editorial.contact.workingHours.weekdays,
        saturday: editorial.contact.workingHours.saturday,
      }} />
    </>
  );
}
