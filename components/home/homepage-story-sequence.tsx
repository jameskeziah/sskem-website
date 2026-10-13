import Link from "next/link";
import type { CSSProperties } from "react";

import { SiteImage } from "@/components/media/SiteImage";
import { HomepageStoryMotion } from "@/components/home/homepage-story-motion";
import type { HomeZentrySlide } from "@/lib/home-zentry-slides";

const chapters = [
  {
    id: "science",
    number: "01",
    label: "Curiosity",
    title: "It starts with a question.",
    description:
      "A closer look, a new idea, a moment of discovery. Learning starts when curiosity has room to grow.",
    caption: "Science and discovery",
  },
  {
    id: "digital",
    number: "02",
    label: "Discovery",
    title: "Ideas become possibilities.",
    description:
      "In classrooms and digital spaces, students discover new ways to think, make and solve.",
    caption: "Learning through technology",
  },
  {
    id: "skating",
    number: "03",
    label: "Confidence",
    title: "Beyond the classroom.",
    description:
      "Learning isn't only about what happens at a desk. It's also movement, courage, teamwork and trying again.",
    caption: "Movement and outdoor learning",
  },
  {
    id: "culture",
    number: "04",
    label: "Belonging",
    title: "Every story has a place.",
    description:
      "Culture, creativity and sport make school more than a timetable. They make memories and build a community.",
    caption: "Culture and creative expression",
  },
] as const;

/**
 * Approved full-resolution photographs, never private draft imagery.
 * The four chapters deliberately alternate visual languages:
 * cinematic opening, magazine spread, kinetic full bleed, layered finale.
 */
export function HomepageStorySequence({
  slides,
}: {
  slides: readonly HomeZentrySlide[];
}) {
  const byId = new Map(slides.map((slide) => [slide.id, slide]));
  const scenes = chapters.flatMap((chapter) => {
    const slide = byId.get(chapter.id);
    return slide ? [{ ...chapter, slide }] : [];
  });

  if (scenes.length !== chapters.length) return null;
  const sport = byId.get("sports");

  return (
    <HomepageStoryMotion>
      <div className="home-shell home-story__intro">
        <p className="home-story__eyebrow" data-home-story-intro>
          Beyond the first hello <span aria-hidden="true">↓</span>
        </p>
        <h2 id="home-story-title" data-home-story-intro>
          A school is made <em>of moments.</em>
        </h2>
        <p className="home-story__lead" data-home-story-intro>
          Follow a day of learning, discovery and expression. Each chapter
          reveals another part of what makes SSKEMS a place to grow.
        </p>
        <span className="home-story__scroll-cue" aria-hidden="true">
          Scroll to explore <span>↓</span>
        </span>
      </div>

      <div className="home-story__scenes">
        {scenes.map(({ id, number, label, title, description, caption, slide }) => {
          const focalStyle = {
            "--story-focal-desktop": slide.imageCrop.desktop,
            "--story-focal-mobile": slide.focalMobile,
          } as CSSProperties;
          const immersive = id === "science" || id === "skating";

          return (
            <article
              key={id}
              className={`home-story__scene home-story__scene--${id}`}
              data-home-story-scene
              data-home-story-chapter={id}
            >
              <figure className="home-story__figure" style={focalStyle}>
                <div className="home-story__frame" data-home-story-frame>
                  <SiteImage
                    className="home-story__photo"
                    src={slide.image}
                    alt={slide.alt}
                    width={1600}
                    height={1000}
                    sizes={immersive ? "100vw" : "(max-width: 48rem) 100vw, 56vw"}
                    loading="lazy"
                    unoptimized
                    data-home-story-photo
                  />
                </div>
                {id === "culture" && sport ? (
                  <div className="home-story__support-photo" data-home-story-secondary>
                    <SiteImage
                      src={sport.image}
                      alt={sport.alt}
                      width={960}
                      height={720}
                      sizes="(max-width: 48rem) 46vw, 24vw"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                ) : null}
                <figcaption>{caption} · SSKEMS</figcaption>
              </figure>

              <div className="home-story__content">
                <p className="home-story__scene-label" data-home-story-copy>
                  <span>{number}</span> / {label}
                </p>
                <h3 data-home-story-copy>{title}</h3>
                <p className="home-story__description" data-home-story-copy>
                  {description}
                </p>
                <div className="home-story__rule" aria-hidden="true">
                  <span data-home-story-progress />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="home-shell home-story__outro">
        <p>And every day brings another opportunity to begin.</p>
        <Link href="/school/facilities">
          Explore our campus <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </HomepageStoryMotion>
  );
}
