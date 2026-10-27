"use client";

import { useState } from "react";
import { siteFacts } from "@/app/data/site";

// Uploads playlist for the school channel at @sskemschoolveral.
// The visitor must opt in before any YouTube iframe is mounted.
const SCHOOL_UPLOADS_PLAYLIST = "UUNfsMmmnubHQVr1mAYWHJbw";
const SCHOOL_PLAYER_URL = `https://www.youtube-nocookie.com/embed/videoseries?list=${SCHOOL_UPLOADS_PLAYLIST}&rel=0`;

export function HomepageYoutubeVideos() {
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  return (
    <section className="home-campus__youtube" aria-labelledby="home-campus-youtube-title">
      <div className="home-campus__youtube-copy">
        <p className="home-campus__youtube-eyebrow">SSKEMS · Official YouTube channel</p>
        <h3 id="home-campus-youtube-title">School stories. On screen.</h3>
        <p>
          Explore our school events, celebrations and student activities.
          Watch videos from the school channel here, or visit YouTube to see every upload.
        </p>
        <div className="home-campus__youtube-actions">
          <button
            type="button"
            aria-expanded={isPlayerOpen}
            aria-controls="home-campus-youtube-player"
            onClick={() => setIsPlayerOpen((value) => !value)}
          >
            {isPlayerOpen ? "Hide YouTube videos" : "Play school YouTube videos"}
            <span aria-hidden="true">{isPlayerOpen ? " −" : " ▶"}</span>
          </button>
          <a href={siteFacts.youtubeUrl} target="_blank" rel="noopener noreferrer">
            Visit our YouTube channel <span aria-hidden="true">↗</span>
          </a>
        </div>
        <p className="home-campus__youtube-note">
          Videos load from YouTube only after you select Play.
        </p>
      </div>
      <div
        id="home-campus-youtube-player"
        className="home-campus__youtube-player"
        aria-label="SSKEMS school YouTube videos"
      >
        {isPlayerOpen ? (
          <iframe
            title="SSKEMS School Veral YouTube uploads playlist"
            src={SCHOOL_PLAYER_URL}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            allowFullScreen
          />
        ) : (
          <div className="home-campus__youtube-placeholder">
            <span aria-hidden="true" className="home-campus__youtube-play-symbol">▶</span>
            <strong>Videos from SSKEMS</strong>
            <span>Select Play to watch our public YouTube uploads.</span>
          </div>
        )}
      </div>
    </section>
  );
}
