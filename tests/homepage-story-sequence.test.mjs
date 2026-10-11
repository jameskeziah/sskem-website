import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("homepage storyline reuses the authorized public hero projection", async () => {
  const [page, story, publication] = await Promise.all([
    source("app/page.tsx"),
    source("components/home/homepage-story-sequence.tsx"),
    source("content/home-zentry-publication.json"),
  ]);
  assert.match(page, /approvedHeroMedia = getPublicHeroPublication\(\)/);
  assert.match(page, /<HomepageStorySequence slides=\{approvedHeroMedia\.ready \? approvedHeroMedia\.slides : \[\]\} \/>/);
  assert.match(story, /if \(scenes\.length !== chapters\.length\) return null/);
  assert.match(story, /src=\{slide\.image\}/);
  assert.match(story, /alt=\{slide\.alt\}/);
  assert.doesNotMatch(story, /hero-drafts|campus-main\.jpeg|approvalManifest\.records/);
  const published = JSON.parse(publication);
  for (const id of ["science", "digital", "skating", "culture"]) {
    const slide = published.slides.find((item) => item.id === id);
    assert.ok(slide, \`Missing published story image: \${id}\`);
    assert.equal(slide.decision, "approved");
    assert.equal(slide.visualReviewStatus, "approved");
    assert.equal(slide.approvedAlt, true);
    assert.match(slide.full, /^\/media\/home\/production\/hero\/[a-z]+\/full-[a-f0-9]{12}\.webp$/);
  }
});

test("photographic story keeps motion optional and the hero unchanged", async () => {
  const [page, motion, stylesheet] = await Promise.all([
    source("app/page.tsx"),
    source("components/home/homepage-story-motion.tsx"),
    source("app/homepage-story.css"),
  ]);
  assert.match(page, /<HomeZentryHero slides=\{publishedHero\.slides\} fallbackPhoto=\{publishedHero\.slides\[0\]\.image\} \/>/);
  assert.match(motion, /"use client";/);
  assert.match(motion, /gsap\.matchMedia\(\)/);
  assert.match(motion, /conditions\.reduce/);
  assert.match(motion, /media\.revert\(\)/);
  assert.match(motion, /scope: root/);
  assert.match(motion, /data-motion-component="home-story"/);
  assert.match(stylesheet, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(stylesheet, /display:\s*none/);
});
