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

export function AdmissionsHeroMotion({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;

      const media = gsap.matchMedia();
      media.add(motionMedia, (context) => {
        const conditions = context.conditions as MotionConditions;
        const intro = element.querySelector<HTMLElement>("[data-motion-hero-intro]");
        const heading = element.querySelector<HTMLElement>("[data-motion-hero-heading]");
        const support = element.querySelector<HTMLElement>("[data-motion-hero-support]");
        const mask = element.querySelector<HTMLElement>("[data-motion-hero-mask]");
        const targets = [intro, heading, support, mask].filter(Boolean) as HTMLElement[];

        if (conditions.reduce) {
          gsap.set(targets, { clearProps: "all" });
          return;
        }

        if (conditions.mobile && intro) {
          gsap.fromTo(
            intro,
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

        if (mask) {
          timeline.fromTo(
            mask,
            { clipPath: "inset(0 0 100% 0)", willChange: "clip-path" },
            {
              clipPath: "inset(0 0 0% 0)",
              duration: motionDurationSeconds.slow,
              ease: motionEase.emphasised,
              clearProps: "all",
            },
            0,
          );
        }

        if (heading) {
          timeline.fromTo(
            heading,
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

        if (support) {
          timeline.fromTo(
            support,
            { opacity: 0, y: distance, willChange: "transform, opacity" },
            {
              opacity: 1,
              y: 0,
              duration: motionDurationSeconds.deliberate,
              ease: motionEase.enter,
              clearProps: "all",
            },
            motionDurationSeconds.micro / 2,
          );
        }
      });

      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className={className}
      data-motion-component="admissions-hero"
      data-motion-level="4"
    >
      <span
        className="admissions-hero__architectural-mask"
        data-motion-hero-mask
        data-motion-group="admissions-hero-mask"
        data-motion-item
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
