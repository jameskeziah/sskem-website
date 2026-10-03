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

export function HomeSectionReveal({
  children,
  className,
  ariaLabelledby,
}: {
  children: ReactNode;
  className: string;
  ariaLabelledby: string;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;

      const media = gsap.matchMedia();

      media.add(motionMedia, (context) => {
        const conditions = context.conditions as MotionConditions;

        const targets = gsap.utils.toArray<HTMLElement>(
          "[data-home-section-reveal]",
          element,
        );

        if (!targets.length) return;

        if (conditions.reduce) {
          gsap.set(targets, { clearProps: "all" });
          return;
        }

        const distance = conditions.mobile
          ? motionDistancePixels.revealMobile
          : conditions.tablet
            ? motionDistancePixels.revealTablet
            : motionDistancePixels.revealDesktop;

        gsap.fromTo(
          targets,
          {
            autoAlpha: 0,
            y: conditions.mobile ? Math.min(distance, 18) : distance,
          },
          {
            autoAlpha: 1,
            y: 0,
            duration: motionDurationSeconds.deliberate,
            stagger: conditions.mobile
              ? motionStaggerSeconds.mobile
              : motionStaggerSeconds.interface,
            ease: motionEase.enter,
            clearProps: "opacity,visibility,transform",
            scrollTrigger: {
              trigger: element,
              start: "top 84%",
              once: true,
            },
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
      className={className}
      aria-labelledby={ariaLabelledby}
    >
      {children}
    </section>
  );
}
