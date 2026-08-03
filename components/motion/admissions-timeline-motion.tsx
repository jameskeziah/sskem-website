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

export function AdmissionsTimelineMotion({
  children,
  preview = false,
}: {
  children: ReactNode;
  preview?: boolean;
}) {
  const root = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;

      let active = true;
      const media = gsap.matchMedia();
      media.add(motionMedia, (context) => {
        const conditions = context.conditions as MotionConditions;
        const items = gsap.utils.toArray<HTMLElement>("[data-motion-step]", element);

        if (conditions.reduce) {
          gsap.set(items, { clearProps: "all" });
          return;
        }

        const distance = conditions.mobile
          ? motionDistancePixels.revealMobile
          : conditions.tablet
            ? motionDistancePixels.revealTablet
            : motionDistancePixels.revealDesktop;
        const groups = preview ? [items.slice(0, 4)] : [items.slice(0, 4), items.slice(4, 8)];

        groups.filter((group) => group.length > 0).forEach((group) => {
          gsap.fromTo(
            group,
            { opacity: 0, y: distance, willChange: "transform, opacity" },
            {
              opacity: 1,
              y: 0,
              duration: motionDurationSeconds.deliberate,
              ease: motionEase.enter,
              stagger: preview
                ? conditions.mobile
                  ? motionStaggerSeconds.mobile
                  : motionStaggerSeconds.cards
                : 0,
              clearProps: "all",
              scrollTrigger: {
                trigger: group[0],
                ...motionScrollTrigger,
              },
            },
          );
        });
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
    <ol
      ref={root}
      className="admissions-timeline"
      data-motion-component="admissions-steps"
      data-motion-group="admissions-steps"
      data-motion-level="4"
      data-motion-sequence={preview ? "preview-four" : "grouped-eight"}
    >
      {children}
    </ol>
  );
}
