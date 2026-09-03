import { SiteImage } from "@/components/media/SiteImage";

import { ProgrammeVideoSurface } from "@/components/programmes/programme-video-surface";
import {
  validateProgrammePrototypeMedia,
  type ProgrammePrototypeMedia,
} from "@/lib/programmes-media";

export function ProgrammeMediaSlot({
  media,
  className = "",
}: Readonly<{
  media: ProgrammePrototypeMedia;
  className?: string;
}>) {
  if (validateProgrammePrototypeMedia(media).length) return null;
  const captionId = `${media.id}-caption`;

  return (
    <figure
      aria-describedby={captionId}
      className={`programme-media-slot ${className}`.trim()}
      data-media-kind={media.kind}
      data-media-ratio={media.aspectRatio}
      data-media-scope="private-prototype"
    >
      <div className={`programme-media-slot__surface programme-media-slot__surface--${media.fit}`}>
        {media.kind === "image" ? (
          <SiteImage 
            alt={media.alt}
            decoding="async"
            height={media.height}
            loading={media.loading === "lazy" ? "lazy" : undefined}
            priority={media.loading === "eager"}
            sizes={media.sizes}
            src={media.src}
            unoptimized
            width={media.width}
          />
        ) : <ProgrammeVideoSurface media={media} />}
      </div>
      <figcaption id={captionId}>
        <span className="programme-media-slot__scope">Private prototype</span>
        <span className="programme-media-slot__caption">
          <strong>{media.caption}</strong>
          {media.captionDetail ? <small>{media.captionDetail}</small> : null}
        </span>
      </figcaption>
    </figure>
  );
}
