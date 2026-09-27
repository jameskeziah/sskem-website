"use client";

import Image from "next/image";
import Link from "next/link";
import { flushSync } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { homeArrivalSignal } from "@/lib/motion";
import { ZentryMotif } from "@/components/hero/zentry-motifs";
import {
  homeZentryFallbackPhoto,
  homeZentrySlides,
} from "@/lib/home-zentry-slides";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const slideCount = homeZentrySlides.length;
const nextIndex = (index: number) => (index + 1) % slideCount;
const previousIndex = (index: number) => (index + slideCount - 1) % slideCount;

export function HomeZentryHero() {
  const rootRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLButtonElement>(null);
  const activeIndexRef = useRef(0);
  const busyRef = useRef(false);
  const visibleRef = useRef(false);
  const mountedRef = useRef(false);
  const transitionRef = useRef<gsap.core.Timeline | null>(null);
  const transitionLayerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [failedAssets, setFailedAssets] = useState<Record<string, boolean>>({});

  const slide = homeZentrySlides[activeIndex];
  const next = homeZentrySlides[nextIndex(activeIndex)];
  const picture = (path: string) =>
    failedAssets[path] ? homeZentryFallbackPhoto : path;
  const assetFailed = (path: string) => {
    if (path !== homeZentryFallbackPhoto) {
      setFailedAssets((current) => current[path] ? current : { ...current, [path]: true });
    }
  };

  const revealCopy = (element: HTMLElement) => {
    const targets = element.querySelectorAll<HTMLElement>("[data-zhero-intro]");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(targets, { clearProps: "all" });
      return;
    }
    const profile = homeZentrySlides[activeIndexRef.current]?.entrance;
    gsap.fromTo(
      targets,
      { y: profile === "energetic" ? 36 : 26, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: profile === "energetic" ? 0.55 : profile === "graceful" ? 0.84 : 0.72,
        stagger: profile === "graceful" ? 0.13 : profile === "energetic" ? 0.06 : 0.085,
        ease: profile === "energetic" ? "power4.out" : "power3.out",
        clearProps: "all",
      },
    );
  };

  const goTo = useCallback(async (index: number, origin?: HTMLElement | null) => {
    const root = rootRef.current;
    const viewport = viewportRef.current;
    if (!mountedRef.current || !root || !viewport || busyRef.current || index === activeIndexRef.current) {
      return;
    }
    const target = homeZentrySlides[index];
    if (!target) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      activeIndexRef.current = index;
      setActiveIndex(index);
      return;
    }

    busyRef.current = true;
    setIsBusy(true);
    const requestedImage = failedAssets[target.image]
      ? homeZentryFallbackPhoto
      : target.image;
    // The miniature is loaded first; wait briefly for the larger image rather
    // than revealing an empty full-screen frame on a slow connection.
    const ready = await new Promise<boolean>((resolve) => {
      const image = new window.Image();
      let settled = false;
      const finish = (success: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve(success);
      };
      const timeout = window.setTimeout(() => finish(false), 1_800);
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      image.src = requestedImage;
      if (image.complete && image.naturalWidth) finish(true);
    });
    if (!mountedRef.current || !viewportRef.current) {
      busyRef.current = false;
      return;
    }

    const actualImage = ready ? requestedImage : homeZentryFallbackPhoto;
    if (!ready && requestedImage !== homeZentryFallbackPhoto) {
      setFailedAssets((current) => ({ ...current, [target.image]: true }));
    }

    const frame = viewport.getBoundingClientRect();
    const start = origin?.getBoundingClientRect() ?? frame;
    const layer = document.createElement("div");
    layer.className = "zhero__transition-layer";
    layer.setAttribute("aria-hidden", "true");
    const image = document.createElement("img");
    image.alt = "";
    image.src = actualImage;
    image.style.objectPosition = target.focal;
    layer.appendChild(image);
    viewport.appendChild(layer);
    transitionLayerRef.current = layer;

    // FLIP-like geometry: expand the full-size overlay using composited
    // transforms rather than animating left/width/height on every frame.
    gsap.set(layer, {
      x: origin ? start.left - frame.left : 0,
      y: origin ? start.top - frame.top : 0,
      scaleX: origin ? start.width / frame.width : 1,
      scaleY: origin ? start.height / frame.height : 1,
      transformOrigin: "top left",
      borderRadius: origin ? 18 : 0,
      opacity: origin ? 1 : 0,
    });

    const text = root.querySelector<HTMLElement>(".zhero__editorial");
    const timeline = gsap.timeline({
      onComplete: () => {
        if (!mountedRef.current) return;
        // Commit the underlying React image before disposing of the expanding
        // layer, otherwise the old photograph flashes for one painted frame.
        flushSync(() => {
          activeIndexRef.current = index;
          setActiveIndex(index);
        });
        layer.remove();
        transitionLayerRef.current = null;
        transitionRef.current = null;
        busyRef.current = false;
        setIsBusy(false);
        const updated = rootRef.current?.querySelector<HTMLElement>(".zhero__editorial");
        if (updated) {
          gsap.set(updated, { clearProps: "transform,opacity,visibility" });
          revealCopy(updated);
        }
      },
    });
    transitionRef.current = timeline;
    if (text) timeline.to(text, { y: -15, opacity: 0, duration: 0.22, ease: "power2.in" }, 0);
    timeline.to(layer, {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      borderRadius: 0,
      duration: target.entrance === "energetic" ? 0.76 : target.entrance === "graceful" ? 0.98 : 0.92,
      ease: target.entrance === "energetic" ? "power4.inOut" : "power3.inOut",
    }, 0);
  }, [failedAssets]);

  useEffect(() => {
    mountedRef.current = true;
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
      visibleRef.current = Boolean(entries[0]?.isIntersecting);
    }, { threshold: 0.25 });
    observer.observe(root);
    return () => {
      mountedRef.current = false;
      observer.disconnect();
      transitionRef.current?.kill();
      transitionLayerRef.current?.remove();
      transitionRef.current = null;
      transitionLayerRef.current = null;
    };
  }, []);

  useGSAP(() => {
    const element = rootRef.current;
    if (!element) return;
    const target = element.querySelector<HTMLElement>(".zhero__editorial");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const playArrival = () => { if (target) revealCopy(target); };

    if (!reduced) {
      if (document.documentElement.dataset[homeArrivalSignal.datasetKey] === "true") {
        playArrival();
      } else {
        window.addEventListener(homeArrivalSignal.event, playArrival, { once: true });
      }
      if (window.matchMedia("(min-width: 64rem)").matches && viewportRef.current) {
        gsap.to(viewportRef.current, {
          clipPath: "inset(0% 2.5% 7% 2.5% round 1.25rem)",
          ease: "none",
          scrollTrigger: {
            trigger: element,
            start: "top top",
            end: "bottom top",
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
      }
    }

    return () => window.removeEventListener(homeArrivalSignal.event, playArrival);
  }, { scope: rootRef });

  useEffect(() => {
    // Autoplay only when the desktop hero is visible and nobody is actively
    // interacting. Mobile and reduced-motion users get manual controls.
    if (paused || typeof window === "undefined") return;
    const allowed = window.matchMedia(
      "(min-width: 64rem) and (prefers-reduced-motion: no-preference)",
    );
    if (!allowed.matches) return;
    const timer = window.setInterval(() => {
      const root = rootRef.current;
      if (document.hidden || !visibleRef.current || busyRef.current ||
          root?.matches(":hover, :focus-within")) return;
      void goTo(nextIndex(activeIndexRef.current), previewRef.current);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [activeIndex, paused, goTo]);

  return (
    <section
      ref={rootRef}
      className="zhero"
      data-motion-component="home-zentry-hero"
      data-active-slide={slide.id}
      data-visual-layout={slide.layout}
      data-entrance={slide.entrance}
      aria-roledescription="carousel"
      aria-label="SSKEMS school highlights"
    >
      <div ref={viewportRef} className="zhero__viewport">
        <div className="zhero__media" data-motion-home-hero-media aria-hidden="true">
          <Image
            key={slide.image}
            src={picture(slide.image)}
            fill
            unoptimized
            priority={activeIndex === 0}
            sizes="100vw"
            alt=""
            className="zhero__photograph"
            style={{ objectPosition: slide.focal }}
            onError={() => assetFailed(slide.image)}
          />
        </div>
        <div className="zhero__shade" aria-hidden="true" />
        <div className="zhero__brand-accent" aria-hidden="true" />
        <div className="zhero__scene-art" aria-hidden="true">
          <ZentryMotif kind={slide.motif} />
        </div>
        <div className="zhero__editorial">
          <p className="zhero__kicker" data-zhero-intro>
            <span className="zhero__rule" /> {slide.eyebrow}
          </p>
          <h1 id="home-title" aria-label={slide.headline} className="zhero__heading">
            {slide.lines.map((line, index) => (
              <span className="zhero__heading-line" key={line} aria-hidden="true" data-zhero-intro
                data-accent={index === slide.accentLine ? "true" : "false"}>
                {line}
              </span>
            ))}
          </h1>
          <p className="zhero__summary" data-zhero-intro>{slide.description}</p>
          <div className="zhero__actions" data-zhero-intro>
            <Link className="zhero__apply" href="/admissions/enquire">
              Apply for Admission <span aria-hidden="true">↗</span>
            </Link>
            <Link className="zhero__explore" href="/school">Explore our school</Link>
          </div>
        </div>

        <div className="zhero__preview-wrap">
          <p className="zhero__preview-label">UP NEXT <span>{next.chapter} / {String(slideCount).padStart(2, "0")}</span></p>
          <button
            ref={previewRef}
            type="button"
            className="zhero__preview"
            data-next-slide={next.id}
            disabled={isBusy}
            aria-label={`Expand next slide: ${next.headline}`}
            onClick={() => void goTo(nextIndex(activeIndexRef.current), previewRef.current)}
          >
            <Image
              src={picture(next.preview)}
              alt=""
              width={360}
              height={230}
              unoptimized
              sizes="(max-width: 640px) 116px, 200px"
              onError={() => assetFailed(next.preview)}
            />
            <span className="zhero__preview-symbol" aria-hidden="true">↗</span>
          </button>
        </div>

        <div className="zhero__controls">
          <span className="zhero__count" aria-hidden="true">
            {slide.chapter} <span>—</span> {String(slideCount).padStart(2, "0")}
          </span>
          <div className="zhero__progress" aria-label="Select a hero slide">
            {homeZentrySlides.map((item, index) => (
              <button
                type="button"
                key={item.id}
                aria-label={`Show slide ${item.chapter}: ${item.headline}`}
                aria-current={index === activeIndex ? "true" : undefined}
                disabled={isBusy}
                className="zhero__progress-item"
                data-current={index === activeIndex ? "true" : "false"}
                onClick={() => void goTo(index)}
              />
            ))}
          </div>
          <div className="zhero__navigation">
            <button type="button" disabled={isBusy}
              aria-label="Previous slide"
              onClick={() => void goTo(previousIndex(activeIndexRef.current))}>←</button>
            <button type="button" disabled={isBusy}
              aria-label="Next slide"
              onClick={() => void goTo(nextIndex(activeIndexRef.current), previewRef.current)}>→</button>
            <button type="button" className="zhero__autoplay"
              aria-label={paused ? "Resume automatic slides" : "Pause automatic slides"}
              aria-pressed={paused}
              onClick={() => setPaused((value) => !value)}>
              {paused ? "Play" : "Pause"}
            </button>
          </div>
        </div>
      </div>
      <p className="zhero__status" aria-live={paused ? "polite" : "off"} aria-atomic="true">
        {slide.headline}
      </p>
    </section>
  );
}
