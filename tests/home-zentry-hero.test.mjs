import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Zentry hero is preview-only and does not change public preloader or fallback", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /privateHomepageReview && process\.env\.HOMEPAGE_ZENTRY_HERO === "preview"/);
  assert.match(page, /zentryHeroPreview \? \(/);
  assert.match(page, /<HomeZentryHero \/>/);
  assert.match(page, /<HomeHeroMotion\s+reviewMode=/);
  assert.match(page, /showHomePreloader = privateHomepageReview \|\| publicHomepagePreloader/);
});

test("editorial content remains live DOM and concept-poster text is not baked into navigation", async () => {
  const hero = await read("components/motion/home-zentry-hero.tsx");
  const slides = await read("lib/home-zentry-slides.ts");
  assert.match(hero, /<h1 id="home-title" aria-label=\{slide\.headline\}/);
  assert.match(hero, /href="\/admissions\/enquire"/);
  assert.match(hero, /href="\/school"/);
  assert.match(hero, /Expand next slide/);
  assert.match(hero, /aria-label="Previous slide"/);
  assert.match(hero, /aria-label="Next slide"/);
  assert.match(hero, /Pause automatic slides/);
  assert.match(hero, /onClick=\{\(\) => void goTo\(nextIndex/);
  for (const id of ["campus","entrance","science","skating","digital","culture","sports"]) {
    assert.match(slides, new RegExp(`id: "${id}"`));
  }
  assert.match(slides, /\/media\/home\/hero-drafts\//);
  assert.doesNotMatch(slides, /promotional_poster_banner|wide_graphic_modern/);
});

test("transition is a single expansion and reduced-motion/mobile autoplay is gated", async () => {
  const hero = await read("components/motion/home-zentry-hero.tsx");
  const styles = await read("app/zentry-hero.css");
  assert.match(hero, /gsap\.timeline/);
  assert.match(hero, /x: previewOrigin \?/);
  assert.match(hero, /scaleX: previewOrigin \?/);
  assert.match(hero, /scaleX: 1/);
  assert.match(hero, /flushSync/);
  assert.match(hero, /prefers-reduced-motion: reduce/);
  assert.match(hero, /min-width: 64rem\) and \(prefers-reduced-motion: no-preference/);
  assert.match(hero, /root\?\.matches\(":hover, :focus-within"\)/);
  assert.match(hero, /ScrollTrigger/);
  assert.doesNotMatch(hero, /pin:\s*true|autoPlay|video\.play\(/);
  assert.match(styles, /@media \(max-width: 40rem\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /\.zhero\[data-visual-layout="curve"\]/);
  assert.match(styles, /\.zhero\[data-visual-layout="ribbon"\]/);
});

test("unapproved student media remains ignored by Git", async () => {
  const ignore = await read(".gitignore");
  assert.match(ignore, /\/public\/media\/home\/hero-drafts\//);
});



test("V2 has seven distinct scene illustrations", async () => {
  const slides = await read("lib/home-zentry-slides.ts");
  const motifs = await read("components/motion/home-zentry-motifs.tsx");
  const css = await read("app/zentry-hero.css");
  const hero = await read("components/motion/home-zentry-hero.tsx");
  const scenePairs = [
    ["campus", "slash", "architecture"],
    ["entrance", "curve", "pathway"],
    ["science", "frame", "science"],
    ["skating", "chevron", "motion"],
    ["digital", "grid", "digital"],
    ["culture", "ribbon", "culture"],
    ["sports", "sport", "sport"],
  ];
  for (const [id, layout, motif] of scenePairs) {
    const block = slides.split(`id: "${id}"`)[1]?.split("  },")[0];
    assert.ok(block, `missing scene: ${id}`);
    assert.ok(block.includes(`layout: "${layout}"`), `layout mismatch: ${id}`);
    assert.ok(block.includes(`motif: "${motif}"`), `motif mismatch: ${id}`);
    assert.ok(motifs.includes(`${motif}: (`), `missing illustration: ${motif}`);
    assert.ok(css.includes(`data-visual-layout="${layout}"`), `missing style: ${layout}`);
  }
  assert.ok(hero.includes("<ZentryMotif kind={slide.motif} />"));
  assert.ok(hero.includes("data-visual-layout={slide.layout}"));
  assert.ok(hero.includes("data-composition-family={slide.compositionFamily}"));
  assert.ok(hero.includes("style={sceneStyles(slide)}"));
  assert.ok(hero.includes("style={previewStyles(slide)}"));
  assert.ok(css.includes("z-index: 9;"), "expanded photo must cover outgoing art");
  assert.ok(css.includes('data-active-slide="sports"] .zhero__count'));
});

test("V2 maintains privacy, motion preferences and truthful image sources", async () => {
  const slides = await read("lib/home-zentry-slides.ts");
  const hero = await read("components/motion/home-zentry-hero.tsx");
  const css = await read("app/zentry-hero.css");
  const page = await read("app/page.tsx");
  const motifs = await read("components/motion/home-zentry-motifs.tsx");
  assert.ok(slides.includes("Mobile focal candidates were selected from the privately supplied actual"));
  assert.ok(!slides.includes("images.openai.com"));
  assert.ok(motifs.includes('aria-hidden="true"'));
  assert.ok(motifs.includes('focusable="false"'));
  assert.ok(hero.includes('target.entrance === "energetic" ? 0.76'));
  assert.ok(hero.includes('profile === "graceful" ? 0.13'));
  assert.ok(hero.includes("prefers-reduced-motion: reduce"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(css.includes("clip-path: ellipse("));
  assert.ok(page.includes('privateHomepageReview && process.env.HOMEPAGE_ZENTRY_HERO === "preview"'));
});

test("V2 slide configuration defines usable layout, palette, art, crop and preview geometry", async () => {
  const { homeZentrySlides } = await import("../lib/home-zentry-slides.ts");
  const families = new Set();
  const layouts = new Set();
  const motifs = new Set();
  assert.equal(homeZentrySlides.length, 7);

  const validColor = /^#[a-f\d]{6}$/i;
  const validCrop = /^(?:\d{1,3})% (?:\d{1,3})%$/;
  for (const slide of homeZentrySlides) {
    families.add(slide.compositionFamily);
    layouts.add(slide.layout);
    motifs.add(slide.motif);
    assert.ok(slide.headline && slide.image && slide.preview);
    assert.equal(slide.focalMobile, slide.imageCrop.mobile, `mobile crop alias drifted: ${slide.id}`);
    assert.equal(slide.accentColor, slide.palette.accent, `accent alias drifted: ${slide.id}`);
    assert.equal(slide.visualReviewStatus, "pending", `photo approval must remain pending: ${slide.id}`);
    assert.ok(slide.image.startsWith("/media/home/hero-drafts/"));
    for (const value of Object.values(slide.palette)) {
      assert.match(value, validColor, `invalid palette in ${slide.id}`);
    }
    for (const [size, crop] of Object.entries(slide.imageCrop)) {
      assert.match(crop, validCrop, `invalid ${size} crop in ${slide.id}`);
      const [x, y] = crop.split(" ").map((part) => Number.parseInt(part, 10));
      assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100);
    }
    const pos = slide.previewPlacement.desktop;
    assert.equal(Number(Boolean(pos.left)) + Number(Boolean(pos.right)), 1, `preview horizontal placement: ${slide.id}`);
    assert.equal(Number(Boolean(pos.top)) + Number(Boolean(pos.bottom)), 1, `preview vertical placement: ${slide.id}`);
    assert.ok(pos.transform);
  }
  assert.equal(families.size, 4);
  assert.equal(layouts.size, 7);
  assert.equal(motifs.size, 7);
});

test("requested semantic visual settings match the seven chapter assignments", async () => {
  const { homeZentrySlides } = await import("../lib/home-zentry-slides.ts");
  const expected = {
    campus:   ["slash", "architecture", "vibrant", "centre-right"],
    entrance: ["curve", "pathway", "warm", "upper-right"],
    science:  ["frame", "science", "clean", "lower-right"],
    skating:  ["chevron", "motion", "warm", "lower-right"],
    digital:  ["grid", "digital", "clean", "lower-right"],
    culture:  ["ribbon", "culture", "vibrant", "upper-right"],
    sports:   ["sport", "sport", "warm", "lower-right"],
  };
  const reviewedMobile = {
    campus: "34% 50%",
    entrance: "75% 50%",
    science: "43% 46%",
    skating: "28% 44%",
    digital: "43% 47%",
    culture: "52% 48%",
    sports: "53% 48%",
  };
  for (const slide of homeZentrySlides) {
    assert.equal(slide.focalMobile, reviewedMobile[slide.id], `private source photo crop ${slide.id}`);
    if (slide.id === "skating") {
      assert.deepEqual(slide.imageCrop, { desktop: "50% 28%", tablet: "8% 44%", mobile: "28% 44%" });
      assert.match(slide.alt, /practising inline skating/);
      assert.equal(slide.visualReviewStatus, "pending");
    }
    assert.deepEqual(
      [slide.layout, slide.motif, slide.photoTreatment, slide.previewPosition],
      expected[slide.id],
      `incorrect settings for ${slide.id}`,
    );
  }

  const slides = await read("lib/home-zentry-slides.ts");
  const hero = await read("components/motion/home-zentry-hero.tsx");
  const css = await read("app/zentry-hero.css");
  for (const type of ["HeroMotif", "HeroPreviewPosition", "HeroPhotoTreatment", "HeroVisualSettings"]) {
    assert.ok(slides.includes(`export type ${type}`), `missing public type ${type}`);
  }
  assert.ok(hero.includes("slide.focalMobile"));
  assert.ok(hero.includes("slide.accentColor"));
  assert.ok(hero.includes("slide.previewPosition"));
  assert.ok(hero.includes("slide.photoTreatment"));
  assert.ok(hero.includes("layer.dataset.photoTreatment = target.photoTreatment"));
  for (const treatment of ["natural", "warm", "clean", "vibrant"]) {
    assert.ok(css.includes(`data-photo-treatment="${treatment}"`));
  }
});

test("preview photo is hidden until hover or visible keyboard focus, with touch fallback", async () => {
  const hero = await read("components/motion/home-zentry-hero.tsx");
  const css = await read("app/zentry-hero.css");
  assert.match(css, /\.zhero__preview img\s*\{[^}]*opacity:\s*0;/s);
  assert.match(css, /\.zhero__preview-wrap:hover \.zhero__preview img,/);
  assert.match(css, /\.zhero__preview:focus-visible img\s*\{[^}]*opacity:\s*1;/s);
  assert.match(css, /@media \(hover: none\)/);
  assert.match(css, /\.zhero__preview-symbol\s*\{[^}]*z-index:\s*1;/s);
  assert.match(hero, /const previewOrigin = origin/);
  assert.match(hero, /\(hover: hover\) and \(pointer: fine\)/);
  assert.match(hero, /origin\.matches\(":focus-visible"\)/);
  assert.match(hero, /const start = previewOrigin\?\.getBoundingClientRect\(\) \?\? frame;/);
  // Existing pointer/keyboard click and mobile tap still invoke the same controller.
  assert.match(hero, /onClick=\{\(\) => void goTo\(nextIndex\(activeIndexRef\.current\), previewRef\.current\)\}/);
});
