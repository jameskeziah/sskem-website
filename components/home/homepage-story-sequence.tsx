import Link from "next/link";
import type { CSSProperties } from "react";

import { HomepageStoryImage } from "@/components/home/homepage-story-image";
import { HomepageStoryMotion } from "@/components/home/homepage-story-motion";
import type { HomeZentrySlide } from "@/lib/home-zentry-slides";

const chapters = [
  {
    id: "science",
    number: "01",
    label: "Early learning",
    title: "Every journey starts with curiosity.",
    description:
      "The earliest discoveries begin with colour, imagination and the confidence to ask one more question.",
    caption: "Learning through creativity",
    image: "/media/home/story/early-learning.webp",
    alt: "Young SSKEMS students drawing at colourful desks with a teacher in their classroom.",
  },
  {
    id: "digital",
    number: "02",
    label: "Learning by doing",
    title: "Where questions become discoveries.",
    description:
      "Experiments, observation and collaboration bring learning out of the textbook and into real life.",
    caption: "Science in action",
    image: "/media/home/story/science-practical.webp",
    alt: "SSKEMS students in white laboratory coats working with science equipment.",
  },
  {
    id: "skating",
    number: "03",
    label: "Beyond the classroom",
    title: "Growing together. Beyond four walls.",
    description:
      "School life also means teamwork, creative expression, responsibility and experiences that stay with us.",
    caption: "Learning and caring beyond the classroom",
    image: "/media/home/story/environment.webp",
    alt: "SSKEMS students and teachers planting a young tree together outdoors.",
  },
  {
    id: "culture",
    number: "04",
    label: "Spaces to explore",
    title: "Room to imagine what's next.",
    description:
      "From the computer laboratory to the library and practical workspaces, each environment creates new opportunities to learn.",
    caption: "Learning spaces at SSKEMS",
    image: "/media/home/story/computers.webp",
    alt: "Rows of computers and workstations in an SSKEMS computer laboratory.",
  },
] as const;

/**
 * The hero stays untouched. Photos below it are the user's real school images
 * and have independent fallbacks to already-published hero media until installed.
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

  const scienceFallback = byId.get("science");
  const cultureFallback = byId.get("culture");
  const digitalFallback = byId.get("digital");

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
          Step beyond the hero and discover real moments from classrooms,
          laboratories, activities and the spaces where students grow.
        </p>
        <span className="home-story__scroll-cue" aria-hidden="true">
          Scroll to explore <span>↓</span>
        </span>
      </div>

      <div className="home-story__scenes">
        {scenes.map(({ id, number, label, title, description, caption, image, alt, slide }) => {
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
                  <HomepageStoryImage
                    className="home-story__photo"
                    src={slide.image}
                    newSrc={image}
                    alt={alt}
                    width={1600}
                    height={1000}
                    sizes={immersive ? "100vw" : "(max-width: 48rem) 100vw, 56vw"}
                  />
                </div>

                {id === "digital" && scienceFallback ? (
                  <div className="home-story__support-photo home-story__support-photo--science" data-home-story-secondary>
                    <HomepageStoryImage
                      src={scienceFallback.image}
                      newSrc="/media/home/story/science-discovery.webp"
                      alt="SSKEMS students conducting another science practical in a laboratory."
                      width={1400}
                      height={933}
                      sizes="(max-width: 48rem) 42vw, 21vw"
                    />
                  </div>
                ) : null}

                {id === "skating" && cultureFallback ? (
                  <div className="home-story__support-photo home-story__support-photo--dance" data-home-story-secondary>
                    <HomepageStoryImage
                      src={cultureFallback.image}
                      newSrc="/media/home/story/dance.webp"
                      alt="SSKEMS students practising a dance activity together in a mirrored room."
                      width={1000}
                      height={662}
                      sizes="(max-width: 48rem) 40vw, 22vw"
                    />
                  </div>
                ) : null}

                {id === "culture" && digitalFallback ? (
                  <>
                    <div className="home-story__support-photo home-story__support-photo--library" data-home-story-secondary>
                      <HomepageStoryImage
                        src={digitalFallback.image}
                        newSrc="/media/home/story/library.webp"
                        alt="Book cabinets inside the SSKEMS library."
                        width={1500}
                        height={993}
                        sizes="(max-width: 48rem) 46vw, 24vw"
                      />
                    </div>
                    <div className="home-story__support-photo home-story__support-photo--chemistry">
                      <HomepageStoryImage
                        src={scienceFallback?.image ?? slide.image}
                        newSrc="/media/home/story/chemistry-room.webp"
                        alt="Science laboratory workbenches and equipment at SSKEMS."
                        width={1400}
                        height={731}
                        sizes="(max-width: 48rem) 35vw, 19vw"
                      />
                    </div>
                  </>
                ) : null}
                <figcaption>{caption} · SSKEMS</figcaption>
              </figure>

              <div className="home-story__content">
                <p className="home-story__scene-label" data-home-story-copy>
                  <span>{number}</span> / {label}
                </p>
                <h3 data-home-story-copy>{title}</h3>
                <p className="home-story__description" data-home-story-copy>{description}</p>
                <div className="home-story__rule" aria-hidden="true">
                  <span data-home-story-progress />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="home-shell home-story__outro">
        <p>Every experience adds another chapter.</p>
        <Link href="/school/facilities">
          Explore our campus <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </HomepageStoryMotion>
  );
}
