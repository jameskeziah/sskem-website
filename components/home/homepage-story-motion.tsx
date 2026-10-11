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
  motionScale,
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
 * Motion enhances a fully readable static narrative.
 * Never pins the page or hides the photographs when JavaScript is unavailable.
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
            { y: distance, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: motionDurationSeconds.slow,
              stagger: motionStaggerSeconds.heading,
              ease: motionEase.emphasised,
              clearProps: "opacity,transform",
              scrollTrigger: {
                trigger: element,
                start: "top 85%",
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

          if (frame) {
            gsap.fromTo(
              frame,
              {
                clipPath: conditions.mobile
                  ? "inset(5% 0% 5% 0% round 1.5rem)"
                  : "inset(8% 9% 8% 9% round 1.5rem)",
              },
              {
                clipPath: "inset(0% 0% 0% 0% round 1.5rem)",
                duration: motionDurationSeconds.ceremonial,
                ease: motionEase.emphasised,
                clearProps: "clipPath",
                scrollTrigger: {
                  trigger: scene,
                  start: "top 82%",
                  once: true,
                },
              },
            );
          }

          if (photo && !conditions.mobile) {
            gsap.fromTo(
              photo,
              { scale: motionScale.imageMaskMaximum },
              {
                scale: 1,
                ease: "none",
                clearProps: "transform",
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
              { opacity: 0, y: distance },
              {
                opacity: 1,
                y: 0,
                duration: motionDurationSeconds.slow,
                ease: motionEase.enter,
                stagger: motionStaggerSeconds.heading,
                clearProps: "opacity,transform",
                scrollTrigger: {
                  trigger: scene,
                  start: "top 78%",
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
                  start: "top 85%",
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
