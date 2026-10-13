"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
  motionDistancePixels,
  motionDurationSeconds,
  motionEase,
  motionMedia,
  motionStaggerSeconds,
} from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

type MotionConditions = {
  reduce?: boolean;
  mobile?: boolean;
  tablet?: boolean;
  desktop?: boolean;
};

/**
 * An animated enhancement of an entirely readable static story.
 * Scroll motion belongs only to the new chapter — no global pinning or
 * interference with the seven-scene hero and its interaction timeline.
 */
export function HomepageStoryMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;

      const media = gsap.matchMedia();
      media.add(motionMedia, (context) => {
        const conditions = context.conditions as MotionConditions;
        if (conditions.reduce) return;

        const distance = conditions.mobile
          ? motionDistancePixels.revealMobile
          : conditions.tablet
            ? motionDistancePixels.revealTablet
            : motionDistancePixels.revealDesktop;

        const opening = gsap.utils.toArray<HTMLElement>(
          "[data-home-story-intro]",
          element,
        );

        if (opening.length) {
          gsap.fromTo(
            opening,
            { y: conditions.mobile ? distance * 2 : distance * 4, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: motionDurationSeconds.ceremonial,
              stagger: motionStaggerSeconds.heading,
              ease: motionEase.emphasised,
              clearProps: "opacity,transform",
              scrollTrigger: {
                trigger: element,
                start: "top 88%",
                once: true,
              },
            },
          );
        }

        const scenes = gsap.utils.toArray<HTMLElement>(
          "[data-home-story-scene]",
          element,
        );
        scenes.forEach((scene) => {
          const frame = scene.querySelector<HTMLElement>("[data-home-story-frame]");
          const photo = scene.querySelector<HTMLElement>("[data-home-story-photo]");
          const copy = gsap.utils.toArray<HTMLElement>(
            "[data-home-story-copy]",
            scene,
          );
          const progress = scene.querySelector<HTMLElement>("[data-home-story-progress]");
          const secondary = scene.querySelector<HTMLElement>("[data-home-story-secondary]");
          const immersive = scene.classList.contains("home-story__scene--science")
            || scene.classList.contains("home-story__scene--skating");

          // Large opening shutter instead of the previous barely visible 3% zoom.
          if (frame) {
            gsap.fromTo(
              frame,
              {
                clipPath: conditions.mobile
                  ? "inset(8% 5% 8% 5% round 1.25rem)"
                  : immersive
                    ? "inset(12% 20% 12% 20% round 1.5rem)"
                    : "inset(10% 12% 10% 12% round 1.5rem)",
              },
              {
                clipPath: "inset(0% 0% 0% 0% round 0rem)",
                duration: motionDurationSeconds.ceremonial + motionDurationSeconds.standard,
                ease: motionEase.emphasised,
                clearProps: "clipPath",
                scrollTrigger: {
                  trigger: scene,
                  start: "top 80%",
                  once: true,
                },
              },
            );
          }

          // Noticeable image depth tied to the scroll position, composited only.
          if (photo && !conditions.mobile) {
            gsap.fromTo(
              photo,
              { scale: 1.28, yPercent: -7, transformOrigin: "50% 50%" },
              {
                scale: 1.18,
                yPercent: 7,
                ease: "none",
                scrollTrigger: {
                  trigger: scene,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              },
            );
          }

          if (copy.length) {
            gsap.fromTo(
              copy,
              {
                opacity: 0,
                y: conditions.mobile ? distance * 2 : distance * 4,
              },
              {
                opacity: 1,
                y: 0,
                duration: motionDurationSeconds.ceremonial,
                ease: motionEase.emphasised,
                stagger: motionStaggerSeconds.heading,
                clearProps: "opacity,transform",
                scrollTrigger: {
                  trigger: scene,
                  start: "top 76%",
                  once: true,
                },
              },
            );
          }

          if (secondary) {
            gsap.fromTo(
              secondary,
              { opacity: 0, rotation: conditions.mobile ? 3 : 10, y: distance * 5 },
              {
                opacity: 1,
                rotation: 0,
                y: 0,
                duration: motionDurationSeconds.ceremonial + motionDurationSeconds.standard,
                ease: motionEase.emphasised,
                clearProps: "opacity,transform",
                scrollTrigger: {
                  trigger: scene,
                  start: "top 70%",
                  once: true,
                },
              },
            );
          }

          if (progress) {
            gsap.fromTo(
              progress,
              { scaleX: 0, transformOrigin: "left center" },
              {
                scaleX: 1,
                ease: "none",
                scrollTrigger: {
                  trigger: scene,
                  start: "top 80%",
                  end: "bottom 25%",
                  scrub: true,
                },
              },
            );
          }
        });
      });

      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="home-story"
      aria-labelledby="home-story-title"
      data-motion-component="home-story"
    >
      {children}
    </section>
  );
}
