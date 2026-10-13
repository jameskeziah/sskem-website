"use client";

import { useRef, useState } from "react";

const TOUR_VIDEO = "/media/home/video/sskem-campus-showcase.mp4";
const TOUR_POSTER = "/media/home/campus-clear/entrance.webp";

/**
 * A visitor-initiated campus tour. Neither video nor audio downloads or plays
 * on initial page load; it is mounted only when the user opens the dialog.
 */
export function HomepageCampusVideoTour() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openTour = () => {
    if (!dialogRef.current || dialogRef.current.open) return;
    dialogRef.current.showModal();
    setIsOpen(true);
  };

  const closeTour = () => {
    dialogRef.current?.close();
  };

  const resetTour = () => {
    videoRef.current?.pause();
    if (videoRef.current) videoRef.current.currentTime = 0;
    setIsOpen(false);
  };

  return (
    <>
      <button
        className="home-campus__tour-button"
        type="button"
        onClick={openTour}
        aria-haspopup="dialog"
      >
        <span className="home-campus__tour-play" aria-hidden="true">▶</span>
        <span>Watch the campus tour</span>
        <span className="home-campus__tour-duration">31 sec</span>
      </button>

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

          {isOpen ? (
            <video
              ref={videoRef}
              className="home-campus__tour-player"
              controls
              playsInline
              preload="none"
              poster={TOUR_POSTER}
              aria-label="Thirty-one-second SSKEMS school campus showcase video"
            >
              <source src={TOUR_VIDEO} type="video/mp4" />
              Your browser cannot play this video.
              <a href={TOUR_VIDEO}>Open the campus tour video</a>.
            </video>
          ) : null}

          <div className="home-campus__tour-footer">
            <p>Discover the school entrance, grounds, classrooms and learning spaces.</p>
            <a href={TOUR_VIDEO} target="_blank" rel="noopener noreferrer">Open video separately ↗</a>
          </div>
        </div>
      </dialog>
    </>
  );
}
