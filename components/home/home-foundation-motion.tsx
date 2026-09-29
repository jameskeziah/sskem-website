
"use client";

import {
  useRef,
  type ReactNode,
} from "react";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
  motionDurationSeconds,
  motionEase,
  motionStaggerSeconds,
} from "@/lib/motion";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function HomeFoundationMotion({
  children,
}: {
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;

      const media = gsap.matchMedia();

      media.add(
        "(prefers-reduced-motion: no-preference)",
        () => {
          const identity = element.querySelector(
            ".home-identity-strip"
          );

          const facts = element.querySelectorAll(
            "[data-foundation-identity-reveal]"
          );

          // Animation 1:
          // Reveal the identity information.

          if (identity && facts.length) {
            gsap.fromTo(
              facts,
              {
                opacity: 0,
                y: 16,
              },
              {
                opacity: 1,
                y: 0,
                duration:
                  motionDurationSeconds.deliberate,
                stagger:
                  motionStaggerSeconds.interface,
                ease: motionEase.enter,
                clearProps: "transform,opacity",

                scrollTrigger: {
                  trigger: identity,
                  start: "top 90%",
                  once: true,
                },
              }
            );
          }

          const foundation = element.querySelector(
            ".home-manifesto"
          );

          if (!foundation) return;

          const label = foundation.querySelector(
            ".home-manifesto__rail .home-chapter-label"
          );

          const headings = foundation.querySelectorAll(
            "[data-foundation-title]"
          );

          const sunburst = foundation.querySelector(
            "[data-foundation-sunburst]"
          );

          const copy = foundation.querySelectorAll(
            "[data-foundation-copy]"
          );

          // Animation 2:
          // Coordinated editorial reveal.

          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: foundation,
              start: "top 80%",
              once: true,
            },
          });

          if (label) {
            timeline.fromTo(
              label,
              { opacity: 0, y: 20 },
              {
                opacity: 1,
                y: 0,
                duration:
                  motionDurationSeconds.deliberate,
                ease: motionEase.enter,
                clearProps: "transform,opacity",
              }
            );
          }

          if (headings.length) {
            timeline.fromTo(
              headings,
              {
                opacity: 0,
                y: 35,
                rotationX: -8,
              },
              {
                opacity: 1,
                y: 0,
                rotationX: 0,
                duration: motionDurationSeconds.slow,
                stagger: motionStaggerSeconds.heading,
                ease: motionEase.emphasised,
                clearProps: "transform,opacity",
              },
              "<+=0.1"
            );
          }

          if (sunburst) {
            timeline.fromTo(
              sunburst,
              {
                opacity: 0,
                rotation: -20,
                scale: 0.85,
              },
              {
                opacity: 1,
                rotation: 0,
                scale: 1,
                duration:
                  motionDurationSeconds.ceremonial,
                ease: motionEase.enter,
                clearProps: "transform,opacity",
              },
              "<"
            );
          }

          if (copy.length) {
            timeline.fromTo(
              copy,
              {
                opacity: 0,
                y: 16,
              },
              {
                opacity: 1,
                y: 0,
                duration:
                  motionDurationSeconds.deliberate,
                stagger:
                  motionStaggerSeconds.interface,
                ease: motionEase.enter,
                clearProps: "transform,opacity",
              },
              "-=0.15"
            );
          }
        }
      );

      return () => media.revert();
    },
    { scope: root }
  );

  return (
    <div ref={root} className="home-foundation-flow">
      {children}
    </div>
  );
}
