"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

import {
  homeArrivalSignal,
  motionDurationSeconds,
  motionEase,
  motionMedia,
  motionScale,
} from "@/lib/motion";

gsap.registerPlugin(useGSAP);

type MotionConditions = {
  reduce?: boolean;
};

const homeEntrySessionKey = "sskem:private-home-entry-seen";
// A minimum brand hold applies only to the opt-in private-review arrival.
const privateReviewMinimumVisibleMs = 1_500;

function hasSeenHomeEntry() {
  try {
    return window.sessionStorage.getItem(homeEntrySessionKey) === "true";
  } catch {
    return false;
  }
}

function rememberHomeEntry() {
  try {
    window.sessionStorage.setItem(homeEntrySessionKey, "true");
  } catch {
    // A denied storage API must never block the visible page.
  }
}

function announceHomeArrivalReady() {
  document.documentElement.dataset[homeArrivalSignal.datasetKey] = "true";
  window.dispatchEvent(new Event(homeArrivalSignal.event));
}

function waitForImage(image: HTMLImageElement | null) {
  if (!image) return { promise: Promise.resolve(), cancel: () => undefined };

  if (image.complete) {
    const promise = typeof image.decode === "function"
      ? image.decode().catch(() => undefined)
      : Promise.resolve();
    return { promise, cancel: () => undefined };
  }

  let settle = () => undefined;
  const promise = new Promise<void>((resolve) => {
    settle = () => {
      image.removeEventListener("load", settle);
      image.removeEventListener("error", settle);
      resolve();
    };
    image.addEventListener("load", settle, { once: true });
    image.addEventListener("error", settle, { once: true });
  });

  return {
    promise,
    cancel: () => {
      image.removeEventListener("load", settle);
      image.removeEventListener("error", settle);
    },
  };
}

export function HomePreloaderMotion() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const element = root.current;
      if (!element) return;

      delete document.documentElement.dataset[homeArrivalSignal.datasetKey];
      const media = gsap.matchMedia();

      media.add(motionMedia, (context) => {
        const conditions = context.conditions as MotionConditions;
        const replayRequested = new URLSearchParams(window.location.search).get("replayPreloader") === "1";
        if (document.documentElement.dataset[homeArrivalSignal.datasetKey] === "true"
          || (!replayRequested && hasSeenHomeEntry())) {
          element.hidden = true;
          element.dataset.state = "complete";
          announceHomeArrivalReady();
          return;
        }

        let active = true;
        let finished = false;
        let timeout = 0;
        let minimumHoldTimer = 0;
        let visibleAt = 0;
        let timeline: gsap.core.Timeline | null = null;
        const image = window.matchMedia("(min-width: 64rem)").matches
          ? Object.assign(new Image(), { src: "/og.png" })
          : document.querySelector<HTMLImageElement>("[data-motion-home-hero-media] img");
        const imageReadiness = waitForImage(image);
        const fontReadiness = document.fonts?.ready
          .then(() => undefined, () => undefined) ?? Promise.resolve();

        const releasePage = () => {
          if (document.body.dataset.homePreloader === "active") {
            delete document.body.dataset.homePreloader;
          }
        };

        const startExitReveal = () => {
          if (!active || finished) return;
          // Cached media may resolve before the first painted frame. Give the
          // private-review wordmark enough time to be perceived and leave the
          // production homepage and reduced-motion experience unaffected.
          if (!conditions.reduce) {
            const remaining = privateReviewMinimumVisibleMs - (performance.now() - visibleAt);
            if (remaining > 0) {
              if (!minimumHoldTimer) {
                minimumHoldTimer = window.setTimeout(() => {
                  minimumHoldTimer = 0;
                  startExitReveal();
                }, remaining);
              }
              return;
            }
          }

          finished = true;
          window.clearTimeout(minimumHoldTimer);
          window.clearTimeout(timeout);
          imageReadiness.cancel();

          if (conditions.reduce) {
            element.hidden = true;
            element.dataset.state = "complete";
            releasePage();
            rememberHomeEntry();
            announceHomeArrivalReady();
            return;
          }

          const wordmark = element.querySelector<HTMLElement>("[data-home-preloader-wordmark]");
          const details = element.querySelectorAll<HTMLElement>("[data-home-preloader-detail]");
          const rule = element.querySelector<HTMLElement>("[data-home-preloader-rule]");

          element.dataset.state = "exit-reveal";
          timeline = gsap.timeline({
            onComplete: () => {
              element.hidden = true;
              element.dataset.state = "complete";
              releasePage();
            },
          });
          timeline.to([wordmark, ...details].filter(Boolean), {
            yPercent: -110,
            opacity: 0,
            duration: motionDurationSeconds.standard,
            ease: motionEase.exit,
            stagger: motionDurationSeconds.micro / 2,
          });
          timeline.to(element, {
            scale: 1 / motionScale.imageMaskMaximum,
            duration: motionDurationSeconds.standard,
            ease: motionEase.move,
          }, 0);
          if (rule) {
            timeline.to(rule, {
              scaleX: 0,
              transformOrigin: "100% 50%",
              duration: motionDurationSeconds.deliberate,
              ease: motionEase.move,
            }, "<");
          }
          timeline.to(element, {
            clipPath: "inset(0 0 100% 0)",
            duration: motionDurationSeconds.ceremonial,
            ease: motionEase.emphasised,
            clearProps: "clip-path,transform",
            onStart: () => {
              rememberHomeEntry();
              announceHomeArrivalReady();
            },
          });
        };

        element.hidden = false;
        visibleAt = performance.now();
        element.dataset.state = "loading";
        document.body.dataset.homePreloader = "active";

        if (conditions.reduce) {
          startExitReveal();
          return () => releasePage();
        }

        void Promise.allSettled([fontReadiness, imageReadiness.promise]).then(startExitReveal);
        timeout = window.setTimeout(
          startExitReveal,
          motionDurationSeconds.ceremonial * 4 * 1_000,
        );

        return () => {
          active = false;
          window.clearTimeout(timeout);
          window.clearTimeout(minimumHoldTimer);
          imageReadiness.cancel();
          timeline?.kill();
          gsap.set(element, { clearProps: "clip-path,transform" });
          releasePage();
        };
      });

      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="home-preloader"
      data-motion-component="home-preloader"
      data-motion-level="4"
      data-state="idle"
      aria-hidden="true"
      hidden
    >
      <div className="home-preloader__inner">
        <p className="home-preloader__eyebrow" data-home-preloader-detail>
          Shree Samarth Krupa
        </p>
        <p className="home-preloader__wordmark" data-home-preloader-wordmark>
          <span>SS</span>KEMS
        </p>
        <span className="home-preloader__rule" data-home-preloader-rule />
        <p className="home-preloader__meta" data-home-preloader-detail>
          Veral <span aria-hidden="true">·</span> Private review
        </p>
      </div>
    </div>
  );
}
