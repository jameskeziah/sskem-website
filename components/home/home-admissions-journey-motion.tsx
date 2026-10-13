"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { motionDurationSeconds, motionEase, motionStaggerSeconds } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

/** A subtle sequential reveal of real admission steps, not another photograph. */
export function HomeAdmissionsJourneyMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;

      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const steps = gsap.utils.toArray<HTMLElement>("[data-admissions-journey-step]", element);
        if (!steps.length) return;
        gsap.fromTo(
          steps,
          { opacity: 0.35, x: 20 },
          {
            opacity: 1,
            x: 0,
            stagger: motionStaggerSeconds.cards,
            duration: motionDurationSeconds.deliberate,
            ease: motionEase.emphasised,
            clearProps: "opacity,transform",
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

  return <div ref={root} className="home-admissions-feature__motion">{children}</div>;
}
