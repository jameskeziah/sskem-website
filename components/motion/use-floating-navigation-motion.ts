"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

import {
  motionDistancePixels,
  motionDurationSeconds,
  motionEase,
  motionMedia,
} from "@/lib/motion";

gsap.registerPlugin(useGSAP);

type MotionConditions = {
  reduce?: boolean;
  mobile?: boolean;
  tablet?: boolean;
  desktop?: boolean;
};

type FloatingNavigationState = {
  isFloating: boolean;
  isVisible: boolean;
};

type FloatingNavigationOptions = {
  navigationRef: RefObject<HTMLDivElement | null>;
  slotRef: RefObject<HTMLDivElement | null>;
  interactionLocked: boolean;
};

const minimumDirectionDelta = 6;

export function useFloatingNavigationMotion({
  navigationRef,
  slotRef,
  interactionLocked,
}: FloatingNavigationOptions): FloatingNavigationState {
  const [state, setState] = useState<FloatingNavigationState>({
    isFloating: false,
    isVisible: true,
  });
  const stateRef = useRef(state);
  const animateRef = useRef<((next: FloatingNavigationState) => void) | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const navigation = navigationRef.current;
    const slot = slotRef.current;
    if (!navigation || !slot) return;

    let frame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const commit = (next: FloatingNavigationState) => {
      setState((current) => (
        current.isFloating === next.isFloating && current.isVisible === next.isVisible
          ? current
          : next
      ));
    };

    const update = () => {
      frame = 0;
      const currentY = Math.max(window.scrollY, 0);
      const slotTop = slot.getBoundingClientRect().top + currentY;
      const threshold = slotTop + slot.offsetHeight;
      const focusWithin = navigation.contains(document.activeElement);
      const delta = currentY - lastScrollY.current;

      if (currentY <= threshold) {
        commit({ isFloating: false, isVisible: true });
        lastScrollY.current = currentY;
        return;
      }

      if (reducedMotion.matches || interactionLocked || focusWithin) {
        commit({ isFloating: true, isVisible: true });
        lastScrollY.current = currentY;
        return;
      }

      if (Math.abs(delta) < minimumDirectionDelta) {
        commit({ isFloating: true, isVisible: stateRef.current.isVisible });
        return;
      }

      commit({ isFloating: true, isVisible: delta < 0 });
      lastScrollY.current = currentY;
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    const revealForFocus = () => {
      if (stateRef.current.isFloating) {
        commit({ isFloating: true, isVisible: true });
      }
    };

    lastScrollY.current = Math.max(window.scrollY, 0);
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    reducedMotion.addEventListener("change", requestUpdate);
    navigation.addEventListener("focusin", revealForFocus);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      reducedMotion.removeEventListener("change", requestUpdate);
      navigation.removeEventListener("focusin", revealForFocus);
    };
  }, [interactionLocked, navigationRef, slotRef]);

  useEffect(() => {
    stateRef.current = state;
    animateRef.current?.(state);
  }, [state]);

  useGSAP(
    () => {
      const element = navigationRef.current;
      if (!element) return;

      const media = gsap.matchMedia();
      media.add(motionMedia, (context) => {
        const conditions = context.conditions as MotionConditions;
        const distance = conditions.mobile
          ? motionDistancePixels.revealMobile
          : conditions.tablet
            ? motionDistancePixels.revealTablet
            : motionDistancePixels.revealDesktop;

        animateRef.current = (next) => {
          gsap.killTweensOf(element);

          if (conditions.reduce || !next.isFloating) {
            gsap.set(element, { clearProps: "transform,opacity" });
            return;
          }

          gsap.to(element, {
            y: next.isVisible ? 0 : -(element.offsetHeight + distance),
            opacity: next.isVisible ? 1 : 0,
            duration: motionDurationSeconds.standard,
            ease: motionEase.move,
            overwrite: "auto",
          });
        };

        animateRef.current(stateRef.current);
      });

      return () => {
        animateRef.current = null;
        media.revert();
      };
    },
    { scope: navigationRef },
  );

  return state;
}
