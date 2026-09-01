"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

import {
  motionDistancePixels,
  motionDurationSeconds,
  motionEase,
  motionMedia,
} from "@/lib/motion";

gsap.registerPlugin(useGSAP);

type MotionConditions = {
  reduce?: boolean;
  mobile?: boolean;
  tablet?: boolean;
  desktop?: boolean;
};

export function ProgrammesHeroMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;

      const media = gsap.matchMedia();
      media.add(motionMedia, (context) => {
        const conditions = context.conditions as MotionConditions;
        const content = element.querySelector<HTMLElement>("[data-motion-programmes-hero-content]");
        const eyebrow = element.querySelector<HTMLElement>("[data-motion-programmes-hero-eyebrow]");
        const heading = element.querySelector<HTMLElement>("[data-motion-programmes-hero-heading]");
        const copy = element.querySelector<HTMLElement>("[data-motion-programmes-hero-copy]");
        const actions = element.querySelector<HTMLElement>("[data-motion-programmes-hero-actions]");
        const mediaFrame = element.querySelector<HTMLElement>("[data-motion-programmes-hero-media]");
        const targets = [content, eyebrow, heading, copy, actions, mediaFrame].filter(Boolean) as HTMLElement[];

        if (conditions.reduce) {
          gsap.set(targets, { clearProps: "all" });
          return;
        }

        if (conditions.mobile) {
          const mobileTargets = [content, mediaFrame].filter(Boolean) as HTMLElement[];
          gsap.fromTo(
            mobileTargets,
            {
              opacity: 0,
              y: motionDistancePixels.revealMobile,
              willChange: "transform, opacity",
            },
            {
              opacity: 1,
              y: 0,
              duration: motionDurationSeconds.deliberate,
              ease: motionEase.enter,
              clearProps: "all",
            },
          );
          return;
        }

        const distance = conditions.tablet
          ? motionDistancePixels.revealTablet
          : motionDistancePixels.revealDesktop;
        const timeline = gsap.timeline();

        if (mediaFrame) {
          timeline.fromTo(
            mediaFrame,
            {
              clipPath: "inset(0 0 100% 0)",
              willChange: "clip-path",
            },
            {
              clipPath: "inset(0 0 0% 0)",
              duration: motionDurationSeconds.slow,
              ease: motionEase.emphasised,
              clearProps: "all",
            },
            0,
          );
        }

        for (const [index, target] of [eyebrow, heading, copy, actions].entries()) {
          if (!target) continue;
          timeline.fromTo(
            target,
            {
              opacity: 0,
              y: distance,
              willChange: "transform, opacity",
            },
            {
              opacity: 1,
              y: 0,
              duration: motionDurationSeconds.deliberate,
              ease: motionEase.enter,
              clearProps: "all",
            },
            index * (motionDurationSeconds.micro / 2),
          );
        }
      });

      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="programmes-preview-hero"
      aria-labelledby="programmes-preview-title"
      data-motion-component="programmes-hero"
      data-motion-level="4"
    >
      {children}
    </section>
  );
}
