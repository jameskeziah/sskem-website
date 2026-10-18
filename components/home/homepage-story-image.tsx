"use client";

import { useState } from "react";

import { SiteImage } from "@/components/media/SiteImage";

/** New school photographs load when installed. Earlier approved media remains
 * visible as a safe fallback until the optimized WebP files reach public/. */
export function HomepageStoryImage({
  newSrc,
  src,
  alt,
  className,
  sizes,
  width,
  height,
}: {
  newSrc: string;
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  width: number;
  height: number;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const activeSrc = failedSource === newSrc ? src : newSrc;

  return (
    <SiteImage
      src={activeSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      sizes={sizes}
      loading="lazy"
      unoptimized
      onError={() => setFailedSource(newSrc)}
    />
  );
}
