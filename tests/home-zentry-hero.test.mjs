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
  assert.match(hero, /x: origin \?/);
  assert.match(hero, /scaleX: origin \?/);
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
