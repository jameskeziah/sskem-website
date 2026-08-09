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

export function HomeHeroMotion({ children }: { children: ReactNode }) {
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
        const support = gsap.utils.toArray<HTMLElement>("[data-motion-home-hero-support]", element);
        const frame = element.querySelector<HTMLElement>("[data-motion-home-hero-media]");
        const targets = [intro, ...headings, ...support, frame].filter(Boolean) as HTMLElement[];

        if (conditions.reduce) {
          gsap.set(targets, { clearProps: "all" });
          return;
        }

        const distance = conditions.mobile
          ? motionDistancePixels.revealMobile
          : conditions.tablet
            ? motionDistancePixels.revealTablet
            : motionDistancePixels.revealDesktop;

        if (intro) {
          gsap.fromTo(
            intro,
            { opacity: 0, y: distance, willChange: "transform, opacity" },
            {
              opacity: 1,
              y: 0,
              duration: motionDurationSeconds.deliberate,
              ease: motionEase.enter,
              clearProps: "all",
            },
          );
        }

        gsap.fromTo(
          headings,
          { opacity: 0, y: distance, willChange: "transform, opacity" },
          {
            opacity: 1,
            y: 0,
            duration: motionDurationSeconds.slow,
            ease: motionEase.emphasised,
            stagger: conditions.mobile ? motionStaggerSeconds.mobile : motionStaggerSeconds.heading,
            clearProps: "all",
          },
        );

        gsap.fromTo(
          support,
          { opacity: 0, y: distance, willChange: "transform, opacity" },
          {
            opacity: 1,
            y: 0,
            duration: motionDurationSeconds.deliberate,
            ease: motionEase.enter,
            stagger: conditions.mobile ? motionStaggerSeconds.mobile : motionStaggerSeconds.interface,
            clearProps: "all",
          },
        );

        if (!conditions.mobile && frame) {
          gsap.fromTo(
            frame,
            {
              clipPath: "inset(0 0 100% 0)",
              scale: motionScale.imageMaskMaximum,
              transformOrigin: "50% 50%",
              willChange: "transform, clip-path",
            },
            {
              clipPath: "inset(0 0 0% 0)",
              scale: 1,
              duration: motionDurationSeconds.ceremonial,
              ease: motionEase.emphasised,
              clearProps: "all",
            },
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
      className="home-hero"
      aria-labelledby="home-title"
      data-motion-component="home-hero"
      data-motion-level="4"
    >
      {children}
    </section>
  );
}
