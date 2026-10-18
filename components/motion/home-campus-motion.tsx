"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
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
 * Campus clarity first: reveal the section, not zoom the photographs.
 * The original-resolution images, their crops and the hero slider are never
 * transformed by this component. Without JS, everything remains readable.
 */
export function HomeCampusMotion({
  children,
  privateReview = false,
  publicEnhanced = false,
}: {
  children: ReactNode;
  privateReview?: boolean;
  publicEnhanced?: boolean;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;

      const media = gsap.matchMedia();
      media.add(motionMedia, (context) => {
        const conditions = context.conditions as MotionConditions;
        const heading = element.querySelector<HTMLElement>(
          "[data-motion-home-campus-copy]",
        );
        const closing = element.querySelector<HTMLElement>(
          ".home-campus__closing",
        );
        const feature = element.querySelector<HTMLElement>(
          "[data-motion-home-campus-feature]",
        );
        const frames = gsap.utils.toArray<HTMLElement>(
          "[data-motion-home-campus-frame]",
          element,
        );

        if (conditions.reduce) return;

        if (heading) {
          gsap.fromTo(
            heading,
            { opacity: 0, y: conditions.mobile ? 12 : 20 },
            {
              opacity: 1,
              y: 0,
              duration: motionDurationSeconds.deliberate,
              ease: motionEase.enter,
              clearProps: "opacity,transform",
              scrollTrigger: {
                trigger: heading,
                start: "top 87%",
                once: true,
              },
            },
          );
        }

        if (feature) {
          gsap.fromTo(
            feature,
            { opacity: 0.65, y: conditions.mobile ? 8 : 16 },
            {
              opacity: 1,
              y: 0,
              duration: motionDurationSeconds.slow,
              ease: motionEase.emphasised,
              clearProps: "opacity,transform",
              scrollTrigger: {
                trigger: feature,
                start: "top 88%",
                once: true,
              },
            },
          );
        }

        frames.forEach((frame, index) => {
          gsap.fromTo(
            frame,
            { opacity: 0.65, y: conditions.mobile ? 8 : 14 },
            {
              opacity: 1,
              y: 0,
              duration: motionDurationSeconds.deliberate,
              delay: conditions.mobile ? 0 : index * motionStaggerSeconds.cards,
              ease: motionEase.enter,
              clearProps: "opacity,transform",
              scrollTrigger: {
                trigger: frame,
                start: "top 92%",
                once: true,
              },
            },
          );
        });

        if (closing) {
          gsap.fromTo(
            closing,
            { opacity: 0, y: 12 },
            {
              opacity: 1,
              y: 0,
              duration: motionDurationSeconds.deliberate,
              ease: motionEase.enter,
              clearProps: "opacity,transform",
              scrollTrigger: {
                trigger: closing,
                start: "top 94%",
                once: true,
              },
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
      className={`home-campus home-campus--clarity${privateReview || publicEnhanced ? " home-campus--hybrid" : ""}`}
      aria-labelledby="campus-title"
      data-motion-component="home-campus"
      data-motion-level="4"
      data-private-review={privateReview ? "true" : "false"}
    >
      {children}
    </section>
  );
}
