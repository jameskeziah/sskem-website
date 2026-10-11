import Link from "next/link";
import type { CSSProperties } from "react";

import { SiteImage } from "@/components/media/SiteImage";
import { HomepageStoryMotion } from "@/components/home/homepage-story-motion";
import type { HomeZentrySlide } from "@/lib/home-zentry-slides";

const chapters = [
  {
    id: "science",
    number: "01",
    label: "Wonder",
    title: "Every question opens a door.",
    description:
      "Curiosity becomes discovery when learners can observe, experiment and explore ideas together.",
    caption: "Exploring science together",
  },
  {
    id: "digital",
    number: "02",
    label: "Possibility",
    title: "New skills. New horizons.",
    description:
      "From the classroom to the computer lab, learning connects today's questions with tomorrow's possibilities.",
    caption: "Learning through technology",
  },
  {
    id: "skating",
    number: "03",
    label: "Confidence",
    title: "Growth happens in motion.",
    description:
      "Trying something new, building coordination and supporting one another are all part of the experience.",
    caption: "Movement and outdoor learning",
  },
  {
    id: "culture",
    number: "04",
    label: "Expression",
    title: "Every voice has a place.",
    description:
      "Celebrating creativity and cultural expression gives school life its energy and shared memories.",
    caption: "Culture and creativity",
  },
] as const;

/**
 * This is a photographic homepage chapter, not a new media publication path.
 * Render only with the exact public hero projection already verified against
 * the school approval manifest; never fall back to private hero-drafts media.
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

  return (
    <HomepageStoryMotion>
      <div className="home-shell home-story__intro">
        <p className="home-story__eyebrow" data-home-story-intro>
          Step inside the story <span aria-hidden="true">↘</span>
        </p>
        <h2 id="home-story-title" data-home-story-intro>
          A school is made <em>of moments.</em>
        </h2>
        <p className="home-story__lead" data-home-story-intro>
          Beyond the first hello is a world of questions, discovery, expression
          and growing confidence. Explore the moments that shape a school day.
        </p>
      </div>

      <div className="home-story__scenes">
        {scenes.map(({ id, number, label, title, description, caption, slide }) => {
          const focalStyle = {
            "--story-focal-desktop": slide.imageCrop.desktop,
            "--story-focal-mobile": slide.focalMobile,
          } as CSSProperties;

          return (
            <article
              key={id}
              className="home-story__scene"
              data-home-story-scene
              data-home-story-chapter={id}
            >
              <figure
                className="home-story__figure"
                style={focalStyle}
              >
                <div className="home-story__frame" data-home-story-frame>
                  <SiteImage
                    className="home-story__photo"
                    src={slide.image}
                    alt={slide.alt}
                    width={1600}
                    height={1000}
                    sizes="(max-width: 48rem) 100vw, (max-width: 70rem) 56vw, 59vw"
                    loading="lazy"
                    unoptimized
                    data-home-story-photo
                  />
                </div>
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
          Discover our campus <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </HomepageStoryMotion>
  );
}
