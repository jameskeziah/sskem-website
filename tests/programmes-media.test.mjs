import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { privateProgrammeRouteShells } from "../app/data/programme-route-shells.ts";
import {
  PROGRAMME_MEDIA_ASPECT_RATIOS,
  validateProgrammePrototypeMedia,
} from "../lib/programmes-media.ts";
import { PROGRAMMES_PUBLICATION_ROUTES } from "../lib/programmes-publication-routes.ts";

const validImage = {
  scope: "private-prototype",
  kind: "image",
  id: "school-academics-hero-prototype",
  sourceRecordId: "media-campus-main",
  src: "/media/home/campus-main.jpeg",
  width: 1400,
  height: 500,
  aspectRatio: "panoramic",
  fit: "cover",
  alt: "SSKEMS campus exterior used as a private composition reference.",
  sizes: "(max-width: 63.999rem) 100vw, 42vw",
  loading: "eager",
  caption: "Campus exterior composition reference",
  captionDetail: "Private prototype only.",
};

const validVideo = {
  scope: "private-prototype",
  kind: "video",
  id: "campus-story-video-prototype",
  sourceRecordId: "media-campus-main",
  aspectRatio: "cinema",
  fit: "cover",
  alt: "A private campus walkthrough video showing the school exterior.",
  caption: "Campus walkthrough prototype",
  captionDetail: "Private prototype only.",
  poster: { src: "/media/home/campus-main.jpeg", width: 1600, height: 900 },
  sources: [
    { src: "/media/home/campus-walkthrough.webm", type: "video/webm" },
    { src: "/media/home/campus-walkthrough.mp4", type: "video/mp4" },
  ],
  sizes: "(max-width: 63.999rem) 100vw, 50vw",
  preload: "metadata",
  motionPolicy: "user-controlled",
  audio: "captioned",
  captionTrack: { src: "/media/home/campus-walkthrough.en.vtt", srcLang: "en", label: "English" },
};

test("validates every private Programme shell image against one responsive media contract", () => {
  assert.deepEqual(Object.keys(privateProgrammeRouteShells), PROGRAMMES_PUBLICATION_ROUTES);
  for (const route of PROGRAMMES_PUBLICATION_ROUTES) {
    const media = privateProgrammeRouteShells[route].media;
    assert.deepEqual(validateProgrammePrototypeMedia(media), [], route);
    assert.equal(media.scope, "private-prototype");
    assert.match(media.src, /^\/media\/home\//);
    assert.doesNotMatch(media.src, /\/production\//);
    assert.equal(media.width / media.height, PROGRAMME_MEDIA_ASPECT_RATIOS[media.aspectRatio]);
    assert.equal(media.loading, "eager");
  }
});

test("rejects public, external, distorted and inaccessible prototype images", () => {
  const cases = [
    [{ ...validImage, scope: "public" }, "INVALID_PRIVATE_SCOPE"],
    [{ ...validImage, src: "https://example.com/campus.jpeg" }, "INVALID_IMAGE_SOURCE"],
    [{ ...validImage, src: "/media/home/production/campus.jpeg" }, "INVALID_IMAGE_SOURCE"],
    [{ ...validImage, width: 1200, height: 800 }, "DIMENSION_RATIO_MISMATCH"],
    [{ ...validImage, alt: "Photo" }, "INVALID_ALT_TEXT"],
    [{ ...validImage, caption: "TBD" }, "INVALID_CAPTION"],
    [{ ...validImage, sizes: "" }, "INVALID_SIZES"],
  ];

  for (const [media, expectedCode] of cases) {
    assert.ok(validateProgrammePrototypeMedia(media).some((issue) => issue.code === expectedCode), expectedCode);
  }
});

test("requires private video sources, a matching poster and captions whenever audio is present", () => {
  assert.deepEqual(validateProgrammePrototypeMedia(validVideo), []);

  const missingCaptions = { ...validVideo, captionTrack: undefined };
  assert.ok(validateProgrammePrototypeMedia(missingCaptions).some((issue) => issue.code === "CAPTIONS_REQUIRED"));

  const externalSource = { ...validVideo, sources: [{ src: "https://example.com/video.mp4", type: "video/mp4" }] };
  assert.ok(validateProgrammePrototypeMedia(externalSource).some((issue) => issue.code === "INVALID_VIDEO_SOURCE"));

  const mismatchedType = { ...validVideo, sources: [{ src: "/media/home/video.mp4", type: "video/webm" }] };
  assert.ok(validateProgrammePrototypeMedia(mismatchedType).some((issue) => issue.code === "INVALID_VIDEO_SOURCE"));
});

test("implements loading, caption and reduced-motion behavior without a production-media fallback", async () => {
  const [slot, video, css, shell] = await Promise.all([
    readFile(new URL("../components/programmes/programme-media.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/programmes/programme-video-surface.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/programmes.css", import.meta.url), "utf8"),
    readFile(new URL("../components/programmes/private-programme-route-shell.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(slot, /validateProgrammePrototypeMedia\(media\)\.length\) return null/);
  assert.match(slot, /data-media-scope="private-prototype"/);
  assert.match(slot, /<figcaption/);
  assert.match(slot, /priority=\{media\.loading === "eager"\}/);
  assert.match(video, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(video, /reducedMotion !== false/);
  assert.match(video, /kind="captions"/);
  assert.match(video, /controls=\{!ambient\}/);
  assert.match(video, /autoPlay=\{ambient\}/);
  assert.match(css, /data-media-ratio="panoramic"[\s\S]*aspect-ratio:\s*14\s*\/\s*5/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(shell, /ProgrammeMediaSlot/);
  assert.doesNotMatch(shell, /CampusPicture/);
});
