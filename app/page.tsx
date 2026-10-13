import type { Metadata } from "next";
import { SiteImage } from "@/components/media/SiteImage";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CampusPicture } from "@/components/campus-picture";
import { HomepageStoryImage } from "@/components/home/homepage-story-image";
import { HomepageCampusVideoTour } from "@/components/home/homepage-campus-video-tour";
import { HomepageAdmissionsFeature } from "@/components/home/homepage-admissions-feature";
import { HomepageIdentityStrip } from "@/components/home/homepage-identity-strip";
import { HomepageStorySequence } from "@/components/home/homepage-story-sequence";
import { HomepageInstitutionPathways } from "@/components/home/homepage-institution-pathways";
import { HomeAchievementsMotion } from "@/components/motion/home-achievements-motion";
import { HomeCampusMotion } from "@/components/motion/home-campus-motion";
import { HomeHeroMotion } from "@/components/motion/home-hero-motion";
import { HomeHeroVideoTransition } from "@/components/motion/home-hero-video-transition";
import { HomePreloaderMotion } from "@/components/motion/home-preloader-motion";
import { HomeZentryHero } from "@/components/motion/home-zentry-hero";
import { HomeSectionReveal } from "@/components/motion/home-section-reveal";
import { siteFacts } from "@/app/data/site";
import { getHomepageEditorialContent } from "@/lib/cms/homepage-editorial.server";
import { selectHomepageAchievementArtwork } from "@/lib/homepage-achievement-publication";
import { getPublicHeroPublication } from "@/lib/home-zentry-publication";


import "./homepage.css";
import "./homepage-story.css";
import "./homepage-lower.css";
import "./homepage-campus-clear.css";
import "./zentry-hero.css";
import { HomeFoundationMotion } from "@/components/home/home-foundation-motion";

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

const campusHeading = "A place to learn. A place to belong.";

export default async function Home() {
  const editorial = await getHomepageEditorialContent();
  const privateHomepageReview = process.env.HOMEPAGE_REVIEW_MODE === "private" &&
    (process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development");
  // The public preloader is opt-in and must not activate private-review media
  // or publication-preview content on the live school homepage.
  const publicHomepagePreloader = process.env.HOMEPAGE_PUBLIC_PRELOADER === "true";
  // Public homepage media activates directly from seven individually approved,
  // exact-asset records. No manually configured Vercel flag is needed on each
  // deploy. Reverting an approval or failing its media audit disables it.
  const publishedHero = !privateHomepageReview ? getPublicHeroPublication() : null;
  const approvedHeroMedia = publishedHero ?? getPublicHeroPublication();
  const publicHeroRequested = Boolean(publishedHero?.ready);
  const showHomePreloader = privateHomepageReview || publicHomepagePreloader || publicHeroRequested;
  // Experimental/private components remain isolated from this public rollout.
  const zentryHeroPreview = privateHomepageReview && process.env.HOMEPAGE_ZENTRY_HERO === "preview";
  // Full public composition is unlocked separately from private review features.
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
        cinematic
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
      {showHomePreloader ? (
        <HomePreloaderMotion mode={privateHomepageReview ? "private-review" : "public"} />
      ) : null}
      <main id="main-content" tabIndex={-1} className="home-page">
        {zentryHeroPreview ? (
          <HomeZentryHero />
        ) : publishedHero?.ready ? (
          <HomeZentryHero slides={publishedHero.slides} fallbackPhoto={publishedHero.slides[0].image} />
        ) : privateHomepageReview && approvedHeroMedia.ready ? (
          // This preview uses the already-approved public photographs when no
          // private draft slider was explicitly requested. Do not fall back to
          // the static poster merely because HOMEPAGE_REVIEW_MODE is private.
          <HomeZentryHero
            slides={approvedHeroMedia.slides}
            fallbackPhoto={approvedHeroMedia.slides[0].image}
          />
        ) : (
        <HomeHeroMotion
          reviewMode={privateHomepageReview ? "private-review" : "public"}
          preloaderEnabled={showHomePreloader}
        >
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
            <HomeHeroVideoTransition asset={null}>
              <CampusPicture
                recordId="media-campus-main"
                fallbackSrc="/media/home/campus-main.jpeg"
                alt="The pink and white SSKEMS school building in Veral."
                sizes="(max-width: 63.999rem) 100vw, 1px"
                priority
              />
            </HomeHeroVideoTransition>
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
        )}

<HomeFoundationMotion>
        <HomepageIdentityStrip />
        <HomepageStorySequence slides={approvedHeroMedia.ready ? approvedHeroMedia.slides : []} />
       
        <section className="home-manifesto home-manifesto--hybrid">
          <div className="home-shell home-manifesto__grid">
            
<div className="home-manifesto__rail">
  <p className="home-chapter-label">
    <span>01</span> Our foundation
  </p>

  <div
    className="home-manifesto__sunburst"
    data-foundation-sunburst
    aria-hidden="true"
  >
    <svg viewBox="0 0 120 120" focusable="false">
      <circle
        cx="60"
        cy="60"
        r="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <circle
        cx="60"
        cy="60"
        r="38"
        fill="none"
        stroke="currentColor"
        strokeDasharray="3 7"
      />

      {Array.from({ length: 12 }, (_, index) => (
        <path
          key={index}
          d="M60 5 V16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${index * 30} 60 60)`}
        />
      ))}

      <path
        d="M52 60h16M60 52v16"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>

    <span>✦ A little wonder in every day.</span>
  </div>
</div>

            <div>
              
<h2 id="manifesto-title">
  <span
    className="home-manifesto__first-line"
    data-foundation-title
  >
    Knowledge for today.
  </span>

  <span
    className="home-manifesto__accent-line"
    data-foundation-title
  >
    Character for every tomorrow.
  </span>
</h2>

              <p className="home-manifesto__lead" data-foundation-copy>
                Education should help every learner understand the world, find their voice and move through life with confidence.
              </p>
              <div className="home-language-lines" aria-label="Our educational direction in Marathi and Hindi">
                <p lang="mr" data-foundation-copy>शिक्षण, संस्कार आणि आत्मविश्वास यांचा समतोल विकास.</p>
                <p lang="hi" data-foundation-copy>शिक्षा, संस्कार और आत्मविश्वास का संतुलित विकास।</p>
              </div>
            </div>
          </div>
        </section>
        </HomeFoundationMotion>

        <HomeCampusMotion privateReview={privateHomepageReview} publicEnhanced={Boolean(publishedHero?.ready)}>
          <div className="home-shell home-campus__clarity-layout">
            <div className="home-campus__clarity-heading" data-motion-home-campus-copy>
              <p className="home-chapter-label home-chapter-label--light">
                <span>02</span> The campus
              </p>
              <h2 id="campus-title">{campusHeading}</h2>
              <p>
                From the entrance to the school grounds, a clear look at
                the spaces where learning and everyday school life meet.
              </p>
            </div>

            <div className="home-campus__clarity-grid">
              <figure className="home-campus__feature home-campus__clarity-primary" data-motion-home-campus-feature>
                <div className="home-campus__feature-media" data-motion-home-campus-feature-media>
                  <HomepageStoryImage
                    newSrc="/media/home/campus-clear/entrance.webp"
                    src="/media/home/campus-main.jpeg"
                    alt="Front entrance and name board of Shree Samarth Krupa English Medium School in Veral."
                    width={1600}
                    height={900}
                    sizes="(max-width: 48rem) 100vw, (max-width: 70rem) 92vw, 62vw"
                  />
                </div>
                <figcaption>01 / Main school entrance</figcaption>
              </figure>

              <div className="home-campus__clarity-support">
                <figure className="home-campus__frame home-campus__clarity-secondary" data-motion-home-campus-frame>
                  <HomepageStoryImage
                    newSrc="/media/home/campus-clear/building.webp"
                    src="/media/home/campus-grounds.jpeg"
                    alt="Wide exterior view of the pink and white SSKEMS school building."
                    width={1138}
                    height={441}
                    sizes="(max-width: 48rem) 100vw, (max-width: 70rem) 92vw, 34vw"
                  />
                  <figcaption>02 / School building</figcaption>
                </figure>
                <figure className="home-campus__frame home-campus__clarity-secondary" data-motion-home-campus-frame>
                  <HomepageStoryImage
                    newSrc="/media/home/campus-clear/grounds.webp"
                    src="/media/home/campus-courtyard.jpeg"
                    alt="Open school ground with the SSKEMS building visible behind it."
                    width={1400}
                    height={500}
                    sizes="(max-width: 48rem) 100vw, (max-width: 70rem) 92vw, 34vw"
                  />
                  <figcaption>03 / School grounds</figcaption>
                </figure>
              </div>
            </div>

            <HomepageCampusVideoTour />

            <div className="home-campus__closing" data-motion-home-campus-copy>
              <p>One campus. Many beginnings.</p>
              <div className="home-campus__closing-actions">
                <Link href="/school/facilities">
                  Explore the campus <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </HomeCampusMotion>

        <HomepageInstitutionPathways privateReview={privateHomepageReview} />

        <HomepageAdmissionsFeature cycle={editorial.admissionsCycle} />

        <HomeSectionReveal className="home-services" ariaLabelledby="services-title">
          <div className="home-shell home-services__grid">
            <div className="home-services__intro" data-home-section-reveal>
              <p className="home-chapter-label home-chapter-label--light"><span>05</span> Essential access</p>
              <h2 id="services-title">Everything important, within reach.</h2>
              <p>Admissions information, school disclosures and document records in one clear place. Find what you need and keep moving forward.</p>
            </div>
            <nav className="home-services__links" data-home-section-reveal aria-label="Essential school information">
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
        </HomeSectionReveal>

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

        <HomeSectionReveal className="home-invitation" ariaLabelledby="invitation-title">
          <div className="home-shell home-invitation__grid">
            <div data-home-section-reveal>
              <p className="home-chapter-label"><span>{invitationChapter}</span> Begin a conversation</p>
              <h2 id="invitation-title">See what comes next.</h2>
            </div>
            <div className="home-invitation__action" data-home-section-reveal>
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
        </HomeSectionReveal>
      </main>
      <SiteFooter cinematic contact={{
        phone: editorial.contact.phone,
        email: editorial.contact.email,
        location: editorial.contact.location,
        weekdays: editorial.contact.workingHours.weekdays,
        saturday: editorial.contact.workingHours.saturday,
      }} />
    </>
  );
}
