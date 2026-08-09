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
  motionScrollTrigger,
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

export function HomeCampusMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;

      let active = true;
      const media = gsap.matchMedia();
      media.add(motionMedia, (context) => {
        const conditions = context.conditions as MotionConditions;
        const copy = gsap.utils.toArray<HTMLElement>("[data-motion-home-campus-copy]", element);
        const frames = gsap.utils.toArray<HTMLElement>("[data-motion-home-campus-frame]", element);
        const targets = [...copy, ...frames];

        if (conditions.reduce) {
          gsap.set(targets, { clearProps: "all" });
          return;
        }

        const distance = conditions.mobile
          ? motionDistancePixels.revealMobile
          : conditions.tablet
            ? motionDistancePixels.revealTablet
            : motionDistancePixels.revealDesktop;
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: element,
            ...motionScrollTrigger,
          },
        });

        timeline.fromTo(
          copy,
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

        if (!conditions.mobile) {
          timeline.fromTo(
            frames,
            {
              clipPath: "inset(12% 0 0 0)",
              scale: motionScale.imageMaskMaximum,
              transformOrigin: "50% 50%",
              willChange: "transform, clip-path",
            },
            {
              clipPath: "inset(0% 0 0 0)",
              scale: 1,
              duration: motionDurationSeconds.slow,
              ease: motionEase.emphasised,
              stagger: motionStaggerSeconds.cards,
              clearProps: "all",
            },
            "<",
          );
        }
      });

      void document.fonts?.ready.then(() => {
        if (active) ScrollTrigger.refresh();
      });

      return () => {
        active = false;
        media.revert();
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="home-campus"
      aria-labelledby="campus-title"
      data-motion-component="home-campus"
      data-motion-level="4"
    >
      {children}
    </section>
  );
}
