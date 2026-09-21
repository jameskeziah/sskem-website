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
        const heroMedia = element.querySelector<HTMLElement>("[data-motion-home-hero-media] img");
        const targets = [intro, ...headings, heroMedia].filter(Boolean) as HTMLElement[];
        const privatePrototype = reviewMode === "private-review";
        const animateLiveHero = conditions.mobile || privatePrototype;

        if (conditions.reduce || !animateLiveHero) {
          gsap.set(targets, { clearProps: "all" });
          return;
        }

        const distance = conditions.mobile
          ? motionDistancePixels.revealMobile
          : conditions.tablet
            ? motionDistancePixels.revealTablet
            : motionDistancePixels.revealDesktop;
        const timeline = gsap.timeline();

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
            0,
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
            0,
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
          0,
        );
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
