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

export function HomePathwaysMotion({
  children,
  privateReview = false,
}: {
  children: ReactNode;
  privateReview?: boolean;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;

      const media = gsap.matchMedia();

      media.add(motionMedia, (context) => {
        const conditions = context.conditions as MotionConditions;

        const heading =
          element.querySelector<HTMLElement>(
            "[data-motion-home-pathway-heading]",
          );

        const cards = gsap.utils.toArray<HTMLElement>(
          "[data-motion-home-pathway-card]",
          element,
        );

        const supporting =
          element.querySelector<HTMLElement>(
            "[data-motion-home-pathway-supporting]",
          );

        const targets = [
          ...(heading ? [heading] : []),
          ...cards,
          ...(supporting ? [supporting] : []),
        ];

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
            start: "top 82%",
            once: true,
          },
        });

        if (heading) {
          timeline.fromTo(
            heading,
            {
              autoAlpha: 0,
              y: distance,
            },
            {
              autoAlpha: 1,
              y: 0,
              duration: motionDurationSeconds.deliberate,
              ease: motionEase.enter,
              clearProps: "opacity,visibility,transform",
            },
          );
        }

        if (cards.length) {
          timeline.fromTo(
            cards,
            {
              autoAlpha: 0,
              y: conditions.mobile ? 18 : distance,
              scale: conditions.mobile ? 1 : 0.985,
              clipPath: conditions.mobile
                ? "inset(0% 0% 0% 0%)"
                : "inset(8% 0% 0% 0% round 1.25rem)",
            },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              clipPath: "inset(0% 0% 0% 0% round 1.25rem)",
              duration: motionDurationSeconds.slow,
              stagger: conditions.mobile
                ? motionStaggerSeconds.mobile
                : motionStaggerSeconds.cards,
              ease: motionEase.emphasised,
              clearProps: "opacity,visibility,transform,clipPath",
            },
            "<+=0.08",
          );
        }

        if (supporting) {
          timeline.fromTo(
            supporting,
            {
              autoAlpha: 0,
              y: 14,
            },
            {
              autoAlpha: 1,
              y: 0,
              duration: motionDurationSeconds.deliberate,
              ease: motionEase.enter,
              clearProps: "opacity,visibility,transform",
            },
            "-=0.2",
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
      className="home-pathways home-pathways--cinematic"
      aria-labelledby="pathways-title"
      data-motion-component="home-pathways"
      data-private-review={privateReview ? "true" : "false"}
    >
      {children}
    </section>
  );
}
