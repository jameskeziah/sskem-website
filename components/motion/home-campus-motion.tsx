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

export function HomeCampusMotion({
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

      let active = true;
      const media = gsap.matchMedia();
      media.add(motionMedia, (context) => {
        const conditions = context.conditions as MotionConditions;
        const copy = gsap.utils.toArray<HTMLElement>("[data-motion-home-campus-copy]", element);
        const frames = gsap.utils.toArray<HTMLElement>("[data-motion-home-campus-frame]", element);
        const words = gsap.utils.toArray<HTMLElement>("[data-motion-home-campus-word]", element);
        const feature = element.querySelector<HTMLElement>("[data-motion-home-campus-feature]");
        const featureMedia = element.querySelector<HTMLElement>("[data-motion-home-campus-feature-media]");
        const targets = [...copy, ...frames, ...words, ...(featureMedia ? [featureMedia] : [])];

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

        if (privateReview && conditions.desktop && words.length) {
          timeline.fromTo(
            words,
            {
              opacity: 0,
              y: motionDistancePixels.revealDesktop,
              rotationX: -30,
              transformOrigin: "50% 100%",
              willChange: "transform, opacity",
            },
            {
              opacity: 1,
              y: 0,
              rotationX: 0,
              duration: motionDurationSeconds.slow,
              ease: motionEase.emphasised,
              stagger: motionStaggerSeconds.heading,
              clearProps: "all",
            },
            0,
          );
        }

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

        if (privateReview && conditions.desktop && feature && featureMedia) {
          gsap.fromTo(
            featureMedia,
            {
              clipPath: "inset(17% 27% round 1.5rem)",
              scale: motionScale.imageMaskMaximum,
              transformOrigin: "50% 50%",
            },
            {
              clipPath: "inset(0% 0% round 0rem)",
              scale: 1,
              duration: motionDurationSeconds.ceremonial,
              ease: motionEase.emphasised,
              clearProps: "all",
              scrollTrigger: {
                trigger: feature,
                ...motionScrollTrigger,
                start: "top 82%",
              },
            },
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
      data-private-review={privateReview ? "true" : "false"}
    >
      {children}
    </section>
  );
}
