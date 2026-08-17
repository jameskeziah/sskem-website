import Image from "next/image";

import { resolveCampusMedia, type CampusRecordId } from "@/lib/campus-media-publication";

export function CampusPicture({
  recordId,
  fallbackSrc,
  alt,
  sizes,
  priority = false,
}: {
  recordId: CampusRecordId;
  fallbackSrc: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  const media = resolveCampusMedia({ recordId, fallbackSrc });
  if (media.mode === "prototype-review") {
    return (
      <picture className="campus-picture" data-campus-media-mode={media.mode} data-campus-media-record={recordId}>
        <Image src={media.fallbackSrc} alt={alt} width={1400} height={500} sizes={sizes} priority={priority} unoptimized />
      </picture>
    );
  }

  return (
    <picture className="campus-picture" data-campus-media-binding={media.bindingId} data-campus-media-mode={media.mode} data-campus-media-record={recordId}>
      <source type="image/avif" srcSet={media.sources.avif} sizes={sizes} />
      <source type="image/webp" srcSet={media.sources.webp} sizes={sizes} />
      <source type="image/jpeg" srcSet={media.sources.jpeg} sizes={sizes} />
      <Image
        src={media.fallback.src}
        alt={alt}
        width={media.fallback.width}
        height={media.fallback.height}
        sizes={sizes}
        priority={priority}
        unoptimized
      />
    </picture>
  );
}
