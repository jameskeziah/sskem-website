"use client";

import { useEffect, useRef, useState } from "react";

const TOUR_VIDEO = "/media/home/video/sskem-campus-showcase.mp4";
const TOUR_POSTER = "/media/home/campus-clear/entrance.webp";

/**
 * A Zentry-inspired cinematic chapter below the existing hero.
 * Only plays silently in the viewport; loading waits until the chapter nears
 * view, and reduced motion / Save-Data prevent automatic playback.
 */
export function HomepageCampusVideoTour() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const ambientRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fullVideoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saveData =
      (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData === true;
    const autoAllowed = !reducedMotion.matches && !saveData;

    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting);
        setIsInView(visible);
        if (visible && autoAllowed) setVideoLoaded(true);
      },
      { rootMargin: "80px 0px", threshold: 0.3 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = ambientRef.current;
    if (!video) return;

    if (!videoLoaded || !isInView || manuallyPaused || dialogOpen || document.hidden) {
      video.pause();
      return;
    }

    video.muted = true;
    const attempt = video.play();
    if (attempt) {
      void attempt.then(() => setPlaybackBlocked(false)).catch(() => {
        setPlaybackBlocked(true);
      });
    }
  }, [videoLoaded, isInView, manuallyPaused, dialogOpen]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) ambientRef.current?.pause();
      else if (isInView && videoLoaded && !manuallyPaused && !dialogOpen) {
        void ambientRef.current?.play().catch(() => setPlaybackBlocked(true));
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [isInView, videoLoaded, manuallyPaused, dialogOpen]);

  const toggleAmbient = () => {
    if (isPlaying) {
      ambientRef.current?.pause();
      setManuallyPaused(true);
      return;
    }

    setManuallyPaused(false);
    setPlaybackBlocked(false);
    if (!videoLoaded) {
      setVideoLoaded(true);
    } else if (isInView && !dialogOpen) {
      if (ambientRef.current) ambientRef.current.muted = true;
      void ambientRef.current?.play().catch(() => setPlaybackBlocked(true));
    }
  };

  const openTour = () => {
    if (!dialogRef.current || dialogRef.current.open) return;
    ambientRef.current?.pause();
    dialogRef.current.showModal();
    setDialogOpen(true);
  };

  const closeTour = () => {
    dialogRef.current?.close();
  };

  const resetTour = () => {
    fullVideoRef.current?.pause();
    if (fullVideoRef.current) fullVideoRef.current.currentTime = 0;
    setDialogOpen(false);
  };

  const isPlaying = videoLoaded && isInView && !manuallyPaused && !dialogOpen && !playbackBlocked;

  return (
    <>
      <div ref={sectionRef} className="home-campus__video-showcase" data-home-campus-video>
        <video
          ref={ambientRef}
          className="home-campus__ambient-video"
          src={videoLoaded ? TOUR_VIDEO : undefined}
          poster={TOUR_POSTER}
          muted
          loop
          playsInline
          preload="none"
          aria-label="Silent SSKEMS campus showcase featuring classrooms, laboratories and school grounds"
          onError={() => setPlaybackBlocked(true)}
        />
        <div className="home-campus__video-shade" aria-hidden="true" />
        <div className="home-campus__video-content">
          <p className="home-campus__video-eyebrow">The SSKEMS experience · 00:31</p>
          <h3>A glimpse inside school life.</h3>
          <p>Real moments. Real spaces. A place where every day brings something new.</p>
          <div className="home-campus__video-actions">
            <button
              className="home-campus__tour-button"
              type="button"
              onClick={openTour}
              aria-haspopup="dialog"
            >
              <span className="home-campus__tour-play" aria-hidden="true">▶</span>
              <span>Watch with sound</span>
              <span className="home-campus__tour-duration">31 sec</span>
            </button>
            <button
              className="home-campus__video-toggle"
              type="button"
              onClick={toggleAmbient}
              aria-label={isPlaying ? "Pause background campus video" : "Play background campus video"}
              aria-pressed={isPlaying}
            >
              {isPlaying ? "Ⅱ Pause" : "▶ Play"}
            </button>
          </div>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="home-campus__tour-dialog"
        aria-label="SSKEMS campus video tour"
        onClose={resetTour}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeTour();
        }}
      >
        <div className="home-campus__tour-panel">
          <div className="home-campus__tour-header">
            <div>
              <p className="home-campus__tour-kicker">Explore SSKEMS</p>
              <h2>Our campus in motion</h2>
            </div>
            <button type="button" className="home-campus__tour-close" onClick={closeTour} aria-label="Close campus video">
              <span aria-hidden="true">×</span>
            </button>
          </div>
          {dialogOpen ? (
            <video
              ref={fullVideoRef}
              className="home-campus__tour-player"
              controls
              autoPlay
              playsInline
              preload="metadata"
              poster={TOUR_POSTER}
              aria-label="SSKEMS school campus showcase video with audio controls"
            >
              <source src={TOUR_VIDEO} type="video/mp4" />
              Your browser cannot play this video.
              <a href={TOUR_VIDEO}>Open the campus tour video</a>.
            </video>
          ) : null}
          <div className="home-campus__tour-footer">
            <p>Discover our entrance, school grounds, classrooms and learning spaces.</p>
            <a href={TOUR_VIDEO} target="_blank" rel="noopener noreferrer">Open video separately ↗</a>
          </div>
        </div>
      </dialog>
    </>
  );
}
