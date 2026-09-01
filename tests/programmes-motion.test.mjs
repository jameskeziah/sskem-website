import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, projectRoot), "utf8");
}

test("keeps the Programmes art-direction prototype private and approval-safe", async () => {
  const [page, sitemap, dashboard] = await Promise.all([
    source("app/publication-review/programmes-preview/page.tsx"),
    source("app/sitemap.ts"),
    source("app/publication-review/page.tsx"),
  ]);

  assert.match(page, /process\.env\.HOMEPAGE_REVIEW_MODE !== ["']private["'][\s\S]*?notFound\(\)/);
  assert.match(page, /requireChatGPTUser\(["']\/publication-review\/programmes-preview["']\)/);
  assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*nocache:\s*true\s*\}/);
  assert.match(page, /Not approved for public use/);
  assert.match(page, /Source labels describe where the draft came from\. They are not publication approvals\./);
  assert.match(page, /no draft claim, image, route or navigation item is activated by this prototype/);
  assert.equal((page.match(/number:\s*["']\d{2}["']/g) ?? []).length, 9);
  assert.doesNotMatch(page, /VERIFIED\s*[—-]\s*PUBLIC/i);
  assert.doesNotMatch(sitemap, /programmes-preview|publication-review/);
  assert.match(dashboard, /href=["']\/publication-review\/programmes-preview["']/);
});

test("uses bounded GSAP recipes and the shared motion tokens", async () => {
  const [hero, grid] = await Promise.all([
    source("components/motion/programmes-hero-motion.tsx"),
    source("components/motion/programmes-grid-motion.tsx"),
  ]);

  for (const code of [hero, grid]) {
    assert.match(code, /^"use client";/);
    assert.match(code, /useGSAP\s*\(/);
    assert.match(code, /gsap\.matchMedia\(\)/);
    assert.match(code, /conditions\.reduce/);
    assert.match(code, /clearProps:\s*["']all["']/);
    assert.match(code, /scope:\s*root/);
    assert.match(code, /media\.revert\(\)/);
    assert.doesNotMatch(code, /document\.querySelectorAll|useEffect\s*\(/);
    assert.doesNotMatch(code, /duration:\s*[\d.]|stagger:\s*[\d.]|delay:\s*[\d.]/);
    assert.doesNotMatch(code, /\bpin\s*:\s*true|\bscrub\s*:|repeat\s*:\s*-?1|\byoyo\s*:/i);
  }

  assert.match(hero, /data-motion-component="programmes-hero"/);
  assert.match(hero, /motionDistancePixels\.revealMobile/);
  assert.match(hero, /motionDurationSeconds\.slow/);
  assert.match(grid, /data-motion-component="programmes-grid"/);
  assert.match(grid, /ScrollTrigger/);
  assert.match(grid, /cards\.slice\(index, index \+ 4\)/);
  assert.match(grid, /motionStaggerSeconds\.mobile/);
  assert.match(grid, /motionStaggerSeconds\.cards/);
});
