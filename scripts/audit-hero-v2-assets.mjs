import { stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { homeZentrySlides } from "../lib/home-zentry-slides.ts";

// Manual PRIVATE review check. The image directory is intentionally gitignored
// and this audit must never become a public-build prerequisite.
const publicRoot = fileURLToPath(new URL("../public/", import.meta.url));
const expectedPrefix = "/media/home/hero-drafts/";
const errors = [];
const warnings = [];
const seen = new Set();

for (const slide of homeZentrySlides) {
  for (const [kind, url] of [["full", slide.image], ["preview", slide.preview]]) {
    const label = `${slide.chapter} ${slide.id} ${kind}`;
    if (!url.startsWith(expectedPrefix) || url.includes("..") || !url.endsWith(".webp")) {
      errors.push(`${label}: expected a local .webp under ${expectedPrefix}`);
      continue;
    }
    if (seen.has(url)) {
      errors.push(`${label}: duplicate path ${url}`);
      continue;
    }
    seen.add(url);
    const file = join(publicRoot, url.slice(1));
    let size;
    let metadata;
    try {
      [size, metadata] = await Promise.all([stat(file), sharp(file).metadata()]);
    } catch {
      errors.push(`${label}: missing or unreadable ${url}`);
      continue;
    }
    if (metadata.format !== "webp" || !metadata.width || !metadata.height) {
      errors.push(`${label}: invalid WebP metadata`);
      continue;
    }
    const minWidth = kind === "full" ? 1400 : 320;
    const suggestedBytes = kind === "full" ? 1_500_000 : 110_000;
    if (metadata.width < minWidth) {
      warnings.push(`${label}: width ${metadata.width}px; recommend >= ${minWidth}px`);
    }
    if (kind === "full" && metadata.width / metadata.height < 1.4) {
      warnings.push(`${label}: portrait-like aspect; inspect all mobile/desktop crops`);
    }
    if (size.size > suggestedBytes) {
      warnings.push(`${label}: ${size.size} bytes; optimize towards <= ${suggestedBytes}`);
    }
    console.log(`OK ${label}: ${metadata.width}x${metadata.height}, ${size.size} bytes`);
  }
}
if (homeZentrySlides.length !== 7) errors.push("Expected exactly seven hero slides.");
for (const item of warnings) console.warn("WARN", item);
for (const item of errors) console.error("FAIL", item);
console.log(`Hero V2 local media audit: ${seen.size}/14 unique paths; ${errors.length} errors; ${warnings.length} warnings.`);
if (errors.length > 0) process.exitCode = 1;
