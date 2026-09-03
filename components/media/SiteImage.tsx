// components/media/SiteImage.tsx

import Image, {
  type ImageProps,
  type StaticImageData,
} from "next/image";

export type ImageVariant =
  | "hero"
  | "full"
  | "half"
  | "third"
  | "thumbnail";

export type SiteImageProps = Omit<
  ImageProps,
  "src" | "alt" | "sizes" | "priority" | "preload"
> & {
  src: string | StaticImageData;
  alt: string;

  /**
   * Provides the default responsive `sizes` value.
   * Explicit `sizes` always overrides the variant.
   */
  variant?: ImageVariant;

  /**
   * Use when the layout has more precise responsive requirements.
   */
  sizes?: string;

  /**
   * Compatibility alias for existing callers.
   * Internally translated to Next/Image `preload`.
   */
  priority?: boolean;

  /**
   * Explicit preload control.
   */
  preload?: boolean;
};

const sizesByVariant: Record<ImageVariant, string> = {
  hero: "100vw",
  full: "100vw",
  half: "(max-width: 768px) 100vw, 50vw",
  third:
    "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  thumbnail: "(max-width: 768px) 30vw, 15vw",
};

export function SiteImage({
  variant = "full",
  sizes,
  priority = false,
  preload,
  ...props
}: SiteImageProps) {
  const shouldPreload =
    preload ??
    priority ??
    variant === "hero";

  return (
    <Image
      {...props}
      sizes={sizes ?? sizesByVariant[variant]}
      preload={shouldPreload}
    />
  );
}