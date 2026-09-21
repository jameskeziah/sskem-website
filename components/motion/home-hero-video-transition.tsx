"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

import {
  motionDurationSeconds,
  motionEase,
  motionMedia,
  motionScale,
} from "@/lib/motion";

gsap.registerPlugin(useGSAP);

type MotionConditions = {
  reduce?: boolean;
  mobile?: boolean;
  tablet?: boolean;
  desktop?: boolean;
};

export type HomeHeroVideoAsset = Readonly<{
  title: string;
  poster: string;
  sources: readonly [
    Readonly<{
      src: string;
      type: "video/mp4" | "video/webm";
    }>,
    ...ReadonlyArray<
      Readonly<{
        src: string;
        type: "video/mp4" | "video/webm";
      }>
    >,
  ];
  captions: Readonly<{
    src: string;
    srcLang: string;
    label: string;
  }>;
}>;

export function HomeHeroVideoTransition({
  children,
  asset,
}: {
  children: ReactNode;
  asset: HomeHeroVideoAsset | null;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const element = root.current;
      if (!element || !asset) return;

      const media = gsap.matchMedia();
      media.add(motionMedia, (context) => {
        const conditions = context.conditions as MotionConditions;
        const frame = element.querySelector<HTMLElement>("[data-home-hero-video-frame]");
        const video = element.querySelector<HTMLVideoElement>("[data-home-hero-video-player]");
        const launch = element.querySelector<HTMLButtonElement>("[data-home-hero-video-launch]");
        const controls = element.querySelector<HTMLElement>("[data-home-hero-video-controls]");
        const playback = element.querySelector<HTMLButtonElement>("[data-home-hero-video-playback]");
        const sound = element.querySelector<HTMLButtonElement>("[data-home-hero-video-sound]");
        const close = element.querySelector<HTMLButtonElement>("[data-home-hero-video-close]");
        const status = element.querySelector<HTMLElement>("[data-home-hero-video-status]");
        const sources = Array.from(element.querySelectorAll<HTMLSourceElement>("[data-home-hero-video-source]"));
        const captions = element.querySelector<HTMLTrackElement>("[data-home-hero-video-captions]");

        if (!frame || !video || !launch || !controls || !playback || !sound || !close || !status || !captions) return;

        const previewClip = conditions.mobile
          ? "inset(52% 5% 5% 5% round 1rem)"
          : conditions.tablet
            ? "inset(52% 5% 6% 58% round 1rem)"
            : "inset(52% 4% 7% 70% round 1rem)";
        const expandedClip = "inset(0% 0% 0% 0% round 0rem)";
        let expanded = false;

        const announce = (message: string) => {
          status.textContent = message;
        };

        const syncPlayback = () => {
          const playing = !video.paused && !video.ended;
          playback.textContent = playing ? "Pause film" : video.ended ? "Replay film" : "Play film";
          playback.setAttribute("aria-pressed", String(playing));
          element.dataset.homeHeroVideoPlayback = playing ? "playing" : "paused";
        };

        const syncSound = () => {
          sound.textContent = video.muted ? "Sound off" : "Sound on";
          sound.setAttribute("aria-pressed", String(!video.muted));
        };

        const attachMedia = () => {
          let changed = false;
          for (const source of sources) {
            if (!source.hasAttribute("src") && source.dataset.src) {
              source.src = source.dataset.src;
              changed = true;
            }
          }
          if (!captions.hasAttribute("src") && captions.dataset.src) {
            captions.src = captions.dataset.src;
            changed = true;
          }
          if (changed) video.load();
        };

        const detachMedia = () => {
          for (const source of sources) source.removeAttribute("src");
          captions.removeAttribute("src");
          video.load();
        };

        const play = async () => {
          attachMedia();
          try {
            await video.play();
            announce(`${asset.title} is playing.`);
          } catch {
            announce(`${asset.title} is ready. Use Play film to begin.`);
          }
          syncPlayback();
        };

        const expand = () => {
          if (expanded) return;
          expanded = true;
          element.dataset.homeHeroVideoState = "expanded";
          launch.hidden = true;
          launch.setAttribute("aria-expanded", "true");
          controls.hidden = false;
          playback.focus();

          if (conditions.reduce) {
            gsap.set(frame, { clipPath: expandedClip });
            gsap.set(video, { clearProps: "transform" });
            announce(`${asset.title} is open and paused.`);
            syncPlayback();
            return;
          }

          gsap.fromTo(
            frame,
            { clipPath: previewClip },
            {
              clipPath: expandedClip,
              duration: motionDurationSeconds.ceremonial,
              ease: motionEase.move,
            },
          );
          gsap.fromTo(
            video,
            { scale: motionScale.imageMaskMaximum, transformOrigin: "50% 50%" },
            {
              scale: 1,
              duration: motionDurationSeconds.ceremonial,
              ease: motionEase.emphasised,
              clearProps: "transform",
            },
          );
          void play();
        };

        const collapse = () => {
          if (!expanded) return;
          expanded = false;
          video.pause();
          if (video.currentTime) video.currentTime = 0;
          detachMedia();
          controls.hidden = true;
          launch.hidden = false;
          launch.setAttribute("aria-expanded", "false");
          element.dataset.homeHeroVideoState = "preview";

          if (conditions.reduce) {
            gsap.set(frame, { clipPath: previewClip });
          } else {
            gsap.fromTo(
              frame,
              { clipPath: expandedClip },
              {
                clipPath: previewClip,
                duration: motionDurationSeconds.slow,
                ease: motionEase.move,
              },
            );
          }

          announce(`${asset.title} closed. The campus poster is visible.`);
          syncPlayback();
          launch.focus();
        };

        const togglePlayback = () => {
          if (video.paused || video.ended) void play();
          else {
            video.pause();
            announce(`${asset.title} is paused.`);
          }
        };

        const toggleSound = () => {
          video.muted = !video.muted;
          syncSound();
          announce(video.muted ? "Film sound is off." : "Film sound is on.");
        };

        const onKeyDown = (event: KeyboardEvent) => {
          if (event.key === "Escape" && expanded) collapse();
        };

        const onError = () => {
          if (expanded) collapse();
          announce(`${asset.title} could not be played. The campus poster remains available.`);
        };

        video.muted = true;
        gsap.set(frame, { clipPath: previewClip });
        syncPlayback();
        syncSound();
        element.dataset.homeHeroVideoEnhanced = "true";

        launch.addEventListener("click", expand);
        playback.addEventListener("click", togglePlayback);
        sound.addEventListener("click", toggleSound);
        close.addEventListener("click", collapse);
        video.addEventListener("play", syncPlayback);
        video.addEventListener("pause", syncPlayback);
        video.addEventListener("ended", syncPlayback);
        video.addEventListener("volumechange", syncSound);
        video.addEventListener("error", onError);
        document.addEventListener("keydown", onKeyDown);

        return () => {
          video.pause();
          if (video.currentTime) video.currentTime = 0;
          detachMedia();
          gsap.killTweensOf([frame, video]);
          gsap.set([frame, video], { clearProps: "all" });
          launch.hidden = false;
          launch.setAttribute("aria-expanded", "false");
          controls.hidden = true;
          element.dataset.homeHeroVideoState = "preview";
          delete element.dataset.homeHeroVideoPlayback;
          delete element.dataset.homeHeroVideoEnhanced;
          status.textContent = "";
          launch.removeEventListener("click", expand);
          playback.removeEventListener("click", togglePlayback);
          sound.removeEventListener("click", toggleSound);
          close.removeEventListener("click", collapse);
          video.removeEventListener("play", syncPlayback);
          video.removeEventListener("pause", syncPlayback);
          video.removeEventListener("ended", syncPlayback);
          video.removeEventListener("volumechange", syncSound);
          video.removeEventListener("error", onError);
          document.removeEventListener("keydown", onKeyDown);
        };
      });

      return () => media.revert();
    },
    { scope: root, dependencies: [asset] },
  );

  return (
    <div
      ref={root}
      className="home-hero-video"
      data-motion-component="home-hero-video-transition"
      data-motion-level="4"
      data-home-hero-video-state={asset ? "preview" : "poster-only"}
    >
      <div className="home-hero-video__poster">{children}</div>

      {asset ? (
        <>
          <div className="home-hero-video__frame" data-home-hero-video-frame>
            <video
              id="home-hero-campus-film"
              aria-label={asset.title}
              className="home-hero-video__player"
              data-home-hero-video-player
              playsInline
              poster={asset.poster}
              preload="none"
            >
              {asset.sources.map((source) => (
                <source
                  key={`${source.type}:${source.src}`}
                  data-home-hero-video-source
                  data-src={source.src}
                  type={source.type}
                />
              ))}
              <track
                default
                data-home-hero-video-captions
                data-src={asset.captions.src}
                kind="captions"
                label={asset.captions.label}
                srcLang={asset.captions.srcLang}
              />
            </video>
          </div>

          <button
            type="button"
            className="home-hero-video__launch"
            data-home-hero-video-launch
            aria-controls="home-hero-campus-film"
            aria-expanded="false"
          >
            <span>Campus film</span>
            <strong>Watch the story</strong>
          </button>

          <div
            className="home-hero-video__controls"
            data-home-hero-video-controls
            role="group"
            aria-label="Campus film controls"
            hidden
          >
            <button type="button" data-home-hero-video-playback aria-pressed="false">Play film</button>
            <button type="button" data-home-hero-video-sound aria-pressed="false">Sound off</button>
            <button type="button" data-home-hero-video-close>Return to poster</button>
          </div>

          <p className="visually-hidden" data-home-hero-video-status aria-live="polite" />
        </>
      ) : null}
    </div>
  );
}
