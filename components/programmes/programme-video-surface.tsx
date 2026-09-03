"use client";

import { SiteImage } from "@/components/media/SiteImage";
import { useEffect, useState } from "react";

import type { ProgrammePrototypeVideo } from "@/lib/programmes-media";

function VideoPoster({ media, state }: { media: ProgrammePrototypeVideo; state: "initial" | "reduced" }) {
  return (
    <div className="programme-media-slot__poster" data-motion-fallback={state}>
      <SiteImage 
        alt={media.alt}
        decoding="async"
        height={media.poster.height}
        loading="lazy"
        sizes={media.sizes}
        src={media.poster.src}
        unoptimized
        width={media.poster.width}
      />
      <span>Static poster shown</span>
    </div>
  );
}

export function ProgrammeVideoSurface({ media }: { media: ProgrammePrototypeVideo }) {
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(
    media.motionPolicy === "ambient" ? null : false,
  );

  useEffect(() => {
    if (media.motionPolicy !== "ambient") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [media.motionPolicy]);

  if (media.motionPolicy === "ambient" && reducedMotion !== false) {
    return <VideoPoster media={media} state={reducedMotion ? "reduced" : "initial"} />;
  }

  const ambient = media.motionPolicy === "ambient";
  return (
    <video
      aria-label={media.alt}
      autoPlay={ambient}
      controls={!ambient}
      loop={ambient}
      muted={ambient || media.audio === "none"}
      playsInline
      poster={media.poster.src}
      preload={media.preload}
    >
      {media.sources.map((source) => <source key={source.src} src={source.src} type={source.type} />)}
      {media.captionTrack ? (
        <track
          default
          kind="captions"
          label={media.captionTrack.label}
          src={media.captionTrack.src}
          srcLang={media.captionTrack.srcLang}
        />
      ) : null}
      Your browser does not support embedded video.
    </video>
  );
}
