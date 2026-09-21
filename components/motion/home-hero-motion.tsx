"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

import {
  motionDistancePixels,
  motionDurationSeconds,
  motionEase,
  motionMedia,
  motionScale,
  motionStaggerSeconds,
} from "@/lib/motion";

gsap.registerPlugin(useGSAP);

type MotionConditions = {
  reduce?: boolean;
  mobile?: boolean;
  tablet?: boolean;
  desktop?: boolean;
};

export function HomeHeroMotion({
  children,
  reviewMode = "public",
}: {
  children: ReactNode;
  reviewMode?: "public" | "private-review";
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;

      const media = gsap.matchMedia();
      media.add(motionMedia, (context) => {
        const conditions = context.conditions as MotionConditions;
        const intro = element.querySelector<HTMLElement>("[data-motion-home-hero-intro]");
        const headings = gsap.utils.toArray<HTMLElement>("[data-motion-home-hero-heading]", element);
        const heroMedia = element.querySelector<HTMLImageElement>("[data-motion-home-hero-media] img");
        const preloader = element.querySelector<HTMLElement>("[data-motion-home-preloader]");
        const preloaderItems = gsap.utils.toArray<HTMLElement>("[data-motion-home-preloader-item]", element);
        const preloaderRule = element.querySelector<HTMLElement>("[data-motion-home-preloader-rule]");
        const targets = [intro, ...headings, heroMedia].filter(Boolean) as HTMLElement[];
        const privatePrototype = reviewMode === "private-review";
        const animateLiveHero = conditions.mobile || privatePrototype;
        const preloaderEnabled = privatePrototype && !conditions.mobile && Boolean(preloader);

        if (conditions.reduce || !animateLiveHero) {
          gsap.set(targets, { clearProps: "all" });
          if (preloader) gsap.set(preloader, { display: "none" });
          return;
        }

        const distance = conditions.mobile
          ? motionDistancePixels.revealMobile
          : conditions.tablet
            ? motionDistancePixels.revealTablet
            : motionDistancePixels.revealDesktop;

        if (preloader && !preloaderEnabled) {
          gsap.set(preloader, { display: "none" });
        }

        if (preloaderEnabled && preloader) {
          gsap.set(preloader, {
            display: "grid",
            visibility: "visible",
            clipPath: "inset(0% 0% 0% 0%)",
          });
        }

        let timeline: ReturnType<typeof gsap.timeline> | null = null;

        const playTimeline = () => {
          if (timeline) return;

          timeline = gsap.timeline();
          const heroStart = preloaderEnabled ? motionDurationSeconds.deliberate : 0;

          if (preloaderEnabled && preloader) {
            if (preloaderRule) {
              timeline.fromTo(
                preloaderRule,
                { scaleX: 0, transformOrigin: "0% 50%" },
                {
                  scaleX: 1,
                  duration: motionDurationSeconds.deliberate,
                  ease: motionEase.enter,
                },
                0,
              );
            }

            if (preloaderItems.length) {
              timeline.to(
                preloaderItems,
                {
                  opacity: 0,
                  y: -distance,
                  duration: motionDurationSeconds.fast,
                  ease: motionEase.exit,
                  stagger: motionStaggerSeconds.interface,
                },
                motionDurationSeconds.deliberate / 2,
              );
            }

            timeline.to(
              preloader,
              {
                clipPath: "inset(0% 0% 100% 0%)",
                duration: motionDurationSeconds.ceremonial,
                ease: motionEase.move,
              },
              motionDurationSeconds.deliberate,
            );
            timeline.set(preloader, {
              display: "none",
              clearProps: "clip-path,visibility",
            });
          }

          if (privatePrototype && heroMedia && !conditions.mobile) {
            timeline.fromTo(
              heroMedia,
              {
                scale: motionScale.imageMaskMaximum,
                clipPath: "inset(8% 7% 8% 7% round 2rem)",
                transformOrigin: "50% 50%",
                willChange: "transform, clip-path",
              },
              {
                scale: 1,
                clipPath: "inset(0% 0% 0% 0% round 0rem)",
                duration: motionDurationSeconds.ceremonial,
                ease: motionEase.emphasised,
                clearProps: "all",
              },
              heroStart,
            );
          }

          if (intro) {
            timeline.fromTo(
              intro,
              { opacity: 0, y: distance, willChange: "transform, opacity" },
              {
                opacity: 1,
                y: 0,
                duration: motionDurationSeconds.deliberate,
                ease: motionEase.enter,
                clearProps: "all",
              },
              heroStart,
            );
          }

          const cinematicHeadingReveal = privatePrototype && !conditions.mobile;

          timeline.fromTo(
            headings,
            cinematicHeadingReveal
              ? {
                  opacity: 0,
                  yPercent: 108,
                  rotateX: 8,
                  transformOrigin: "50% 100%",
                  transformPerspective: 800,
                  willChange: "transform, opacity",
                }
              : {
                  opacity: 0,
                  y: distance,
                  willChange: "transform, opacity",
                },
            cinematicHeadingReveal
              ? {
                  opacity: 1,
                  yPercent: 0,
                  rotateX: 0,
                  duration: motionDurationSeconds.ceremonial,
                  ease: motionEase.emphasised,
                  stagger: motionStaggerSeconds.heading,
                  clearProps: "all",
                }
              : {
                  opacity: 1,
                  y: 0,
                  duration: motionDurationSeconds.slow,
                  ease: motionEase.emphasised,
                  stagger: conditions.mobile ? motionStaggerSeconds.mobile : motionStaggerSeconds.heading,
                  clearProps: "all",
                },
            heroStart,
          );
        };

        if (preloaderEnabled && heroMedia && !heroMedia.complete) {
          heroMedia.addEventListener("load", playTimeline, { once: true });
          heroMedia.addEventListener("error", playTimeline, { once: true });

          return () => {
            heroMedia.removeEventListener("load", playTimeline);
            heroMedia.removeEventListener("error", playTimeline);
            timeline?.kill();
          };
        }

        playTimeline();

        return () => timeline?.kill();
      });

      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className={`home-hero${reviewMode === "private-review" ? " home-hero--private-review" : ""}`}
      aria-labelledby="home-title"
      data-motion-component="home-hero"
      data-motion-level="4"
      data-homepage-review-mode={reviewMode}
    >
      {children}
    </section>
  );
}
