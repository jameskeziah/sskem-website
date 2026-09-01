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

export function ProgrammesGridMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;

      let active = true;
      const media = gsap.matchMedia();
      media.add(motionMedia, (context) => {
        const conditions = context.conditions as MotionConditions;
        const cards = gsap.utils.toArray<HTMLElement>("[data-motion-programme-card]", element);

        if (conditions.reduce) {
          gsap.set(cards, { clearProps: "all" });
          return;
        }

        const distance = conditions.mobile
          ? motionDistancePixels.revealMobile
          : conditions.tablet
            ? motionDistancePixels.revealTablet
            : motionDistancePixels.revealDesktop;

        for (let index = 0; index < cards.length; index += 4) {
          const group = cards.slice(index, index + 4);
          gsap.fromTo(
            group,
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
              stagger: conditions.mobile ? motionStaggerSeconds.mobile : motionStaggerSeconds.cards,
              clearProps: "all",
              scrollTrigger: {
                trigger: group[0],
                ...motionScrollTrigger,
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
      className="programmes-preview-grid-section"
      aria-labelledby="programmes-grid-title"
      data-motion-component="programmes-grid"
      data-motion-level="4"
    >
      {children}
    </section>
  );
}
