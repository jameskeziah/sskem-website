"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

import {
  motionDistancePixels,
  motionDurationSeconds,
  motionEase,
  motionMedia,
  motionStaggerSeconds,
} from "@/lib/motion";

gsap.registerPlugin(useGSAP);

type MotionConditions = {
  reduce?: boolean;
  mobile?: boolean;
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
        const targets = [intro, ...headings].filter(Boolean) as HTMLElement[];

        if (conditions.reduce || !conditions.mobile) {
          gsap.set(targets, { clearProps: "all" });
          return;
        }

        const distance = motionDistancePixels.revealMobile;

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
            stagger: motionStaggerSeconds.mobile,
            clearProps: "all",
          },
        );
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
