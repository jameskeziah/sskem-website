export const PROGRAMME_MEDIA_ASPECT_RATIOS = Object.freeze({
  square: 1,
  portrait: 4 / 5,
  landscape: 3 / 2,
  cinema: 16 / 9,
  panoramic: 14 / 5,
} as const);

export type ProgrammeMediaAspectRatio = keyof typeof PROGRAMME_MEDIA_ASPECT_RATIOS;
export type ProgrammeMediaFit = "cover" | "contain";

type ProgrammePrototypeMediaBase = Readonly<{
  scope: "private-prototype";
  id: string;
  sourceRecordId: string;
  aspectRatio: ProgrammeMediaAspectRatio;
  fit: ProgrammeMediaFit;
  caption: string;
  captionDetail?: string;
}>;

export type ProgrammePrototypeImage = ProgrammePrototypeMediaBase & Readonly<{
  kind: "image";
  src: string;
  width: number;
  height: number;
  alt: string;
  sizes: string;
  loading: "eager" | "lazy";
}>;

export type ProgrammePrototypeVideo = ProgrammePrototypeMediaBase & Readonly<{
  kind: "video";
  alt: string;
  poster: Readonly<{
    src: string;
    width: number;
    height: number;
  }>;
  sources: readonly Readonly<{
    src: string;
    type: "video/mp4" | "video/webm";
  }>[];
  sizes: string;
  preload: "none" | "metadata";
  motionPolicy: "user-controlled" | "ambient";
  audio: "none" | "captioned";
  captionTrack?: Readonly<{
    src: string;
    srcLang: string;
    label: string;
  }>;
}>;

export type ProgrammePrototypeMedia = ProgrammePrototypeImage | ProgrammePrototypeVideo;

export type ProgrammePrototypeMediaIssue = Readonly<{
  code:
    | "INVALID_PRIVATE_SCOPE"
    | "INVALID_ID"
    | "INVALID_SOURCE_RECORD"
    | "INVALID_ASPECT_RATIO"
    | "DIMENSION_RATIO_MISMATCH"
    | "INVALID_ALT_TEXT"
    | "INVALID_CAPTION"
    | "INVALID_IMAGE_SOURCE"
    | "INVALID_VIDEO_SOURCE"
    | "INVALID_POSTER"
    | "INVALID_SIZES"
    | "CAPTIONS_REQUIRED";
  path: string;
  message: string;
}>;

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sourceRecordPattern = /^media-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const placeholderPattern = /^(?:tbd|todo|n\/?a|not confirmed|pending|pending approval|placeholder|coming soon)$/i;
const genericAltPattern = /^(?:image|photo|picture|video|campus|school|school image|campus photo)$/i;
const imagePathPattern = /^\/media\/home\/(?!production\/)[a-z0-9][a-z0-9._/-]*\.(?:avif|jpe?g|png|webp)$/i;
const videoPathPattern = /^\/media\/home\/(?!production\/)[a-z0-9][a-z0-9._/-]*\.(?:mp4|webm)$/i;
const captionPathPattern = /^\/media\/home\/(?!production\/)[a-z0-9][a-z0-9._/-]*\.vtt$/i;
const languagePattern = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;

function completeText(value: unknown, minimum = 2) {
  return typeof value === "string" && value.trim().length >= minimum && !placeholderPattern.test(value.trim());
}

function safePrivatePath(value: unknown, pattern: RegExp) {
  return typeof value === "string"
    && pattern.test(value)
    && !value.includes("..")
    && !value.includes("\\")
    && !value.includes("?")
    && !value.includes("#");
}

function validDimensions(width: unknown, height: unknown) {
  return Number.isInteger(width) && Number(width) > 0 && Number.isInteger(height) && Number(height) > 0;
}

function add(
  issues: ProgrammePrototypeMediaIssue[],
  code: ProgrammePrototypeMediaIssue["code"],
  path: string,
  message: string,
) {
  issues.push({ code, path, message });
}

export function validateProgrammePrototypeMedia(media: ProgrammePrototypeMedia): readonly ProgrammePrototypeMediaIssue[] {
  const issues: ProgrammePrototypeMediaIssue[] = [];
  if (media.scope !== "private-prototype") add(issues, "INVALID_PRIVATE_SCOPE", "scope", "Programme prototype media must remain private-review only.");
  if (!idPattern.test(media.id)) add(issues, "INVALID_ID", "id", "Prototype media requires a stable lowercase identifier.");
  if (!sourceRecordPattern.test(media.sourceRecordId)) add(issues, "INVALID_SOURCE_RECORD", "sourceRecordId", "Prototype media requires one canonical source record ID.");
  if (!(media.aspectRatio in PROGRAMME_MEDIA_ASPECT_RATIOS)) add(issues, "INVALID_ASPECT_RATIO", "aspectRatio", "Media aspect ratio is not supported.");
  if (!completeText(media.alt, 12) || genericAltPattern.test(media.alt.trim())) add(issues, "INVALID_ALT_TEXT", "alt", "Media alt text must describe the visible content and purpose.");
  if (!completeText(media.caption, 3)) add(issues, "INVALID_CAPTION", "caption", "A visible media caption is required.");
  if (media.captionDetail !== undefined && !completeText(media.captionDetail, 3)) add(issues, "INVALID_CAPTION", "captionDetail", "Caption detail must be meaningful when supplied.");

  const dimensions = media.kind === "image" ? { width: media.width, height: media.height } : media.poster;
  if (!validDimensions(dimensions.width, dimensions.height)) {
    add(issues, "INVALID_POSTER", media.kind === "image" ? "dimensions" : "poster", "Positive intrinsic media dimensions are required.");
  } else if (media.aspectRatio in PROGRAMME_MEDIA_ASPECT_RATIOS) {
    const actual = dimensions.width / dimensions.height;
    const expected = PROGRAMME_MEDIA_ASPECT_RATIOS[media.aspectRatio];
    if (Math.abs(actual - expected) > 0.015) add(issues, "DIMENSION_RATIO_MISMATCH", "aspectRatio", "Intrinsic dimensions must match the declared presentation ratio.");
  }

  if (media.kind === "image") {
    if (!safePrivatePath(media.src, imagePathPattern)) add(issues, "INVALID_IMAGE_SOURCE", "src", "Image source must use the private prototype media directory.");
    if (!completeText(media.sizes, 3) || media.sizes.includes("javascript:")) add(issues, "INVALID_SIZES", "sizes", "A responsive image sizes expression is required.");
  } else {
    if (!safePrivatePath(media.poster.src, imagePathPattern)) add(issues, "INVALID_POSTER", "poster.src", "Video poster must use a private prototype image.");
    if (!completeText(media.sizes, 3) || media.sizes.includes("javascript:")) add(issues, "INVALID_SIZES", "sizes", "A responsive poster sizes expression is required.");
    if (!media.sources.length) add(issues, "INVALID_VIDEO_SOURCE", "sources", "At least one private prototype video source is required.");
    for (const [index, source] of media.sources.entries()) {
      if (!safePrivatePath(source.src, videoPathPattern)) add(issues, "INVALID_VIDEO_SOURCE", `sources.${index}.src`, "Video source must use the private prototype media directory.");
      const expectedType = source.src.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4";
      if (source.type !== expectedType) add(issues, "INVALID_VIDEO_SOURCE", `sources.${index}.type`, "Video MIME type must match its extension.");
    }
    if (media.audio === "captioned") {
      if (!media.captionTrack) {
        add(issues, "CAPTIONS_REQUIRED", "captionTrack", "Videos with audio require a WebVTT captions track.");
      } else {
        if (!safePrivatePath(media.captionTrack.src, captionPathPattern)) add(issues, "CAPTIONS_REQUIRED", "captionTrack.src", "Caption track must be a private prototype WebVTT file.");
        if (!languagePattern.test(media.captionTrack.srcLang)) add(issues, "CAPTIONS_REQUIRED", "captionTrack.srcLang", "Caption track requires a valid language tag.");
        if (!completeText(media.captionTrack.label, 2)) add(issues, "CAPTIONS_REQUIRED", "captionTrack.label", "Caption track requires a public label.");
      }
    }
  }

  return Object.freeze(issues.map((issue) => Object.freeze(issue)));
}

export function isValidProgrammePrototypeMedia(media: ProgrammePrototypeMedia) {
  return validateProgrammePrototypeMedia(media).length === 0;
}
