/**
 * Local-only photographic placement capture. Never upload the screenshots:
 * they contain unapproved draft student photography.
 *
 * Start the private hero dev server first, then run npm run hero:v2:mobile-review.
 */
import { access, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";
import { homeZentrySlides } from "../lib/home-zentry-slides.ts";

const url = new URL(process.env.HERO_REVIEW_URL ?? "http://127.0.0.1:3000/");
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname) || !["http:", "https:"].includes(url.protocol)) {
  throw new Error("Mobile review captures must run against a locally hosted private preview.");
}

for (const slide of homeZentrySlides) {
  for (const image of [slide.image, slide.preview]) {
    const file = new URL(`../public${image}`, import.meta.url);
    await access(file).catch(() => { throw new Error(`Missing private review asset: ${image}`); });
  }
}
const output = resolve("test-results/hero-v2-mobile-review");
await mkdir(output, { recursive: true });

const browser = await chromium.launch();
try {
  for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
      deviceScaleFactor: 1,
    });
    try {
      const page = await context.newPage();
      await page.goto(url.href, { waitUntil: "domcontentloaded" });
      const hero = page.locator('[data-motion-component="home-zentry-hero"]');
      await expect(hero).toBeVisible();
      await page.evaluate(async () => { await document.fonts.ready; });

      for (const slide of homeZentrySlides) {
        await hero.getByRole("button", { name: `Show slide ${slide.chapter}: ${slide.headline}` }).click();
        await expect(hero).toHaveAttribute("data-active-slide", slide.id);
        const media = await hero.locator(".zhero__photograph").evaluate(async (image) => {
          if (!image.complete) await new Promise((resolve) => {
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener("error", resolve, { once: true });
          });
          return { url: image.currentSrc || image.src, width: image.naturalWidth };
        });
        if (!media.url.includes(slide.image) || media.width === 0) {
          throw new Error(`Source image missing or fell back for ${slide.id}: ${media.url}`);
        }
        const screenshot = resolve(output, `${viewport.width}x${viewport.height}-${slide.chapter}-${slide.id}.png`);
        await hero.screenshot({ path: screenshot, animations: "disabled" });
        console.log(`Review ${slide.id} at ${viewport.width}x${viewport.height}: ${screenshot}`);
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log("Captured 14 LOCAL private review screenshots. Visually inspect faces, signage, equipment, copy and thumbnails before approving any focalMobile or previewPosition value.");
