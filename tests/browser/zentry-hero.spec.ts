import { expect, test } from "@playwright/test";

// This suite is built with HOMEPAGE_REVIEW_MODE=private and
// HOMEPAGE_ZENTRY_HERO=preview. Draft photos are copied locally and are
// intentionally NOT uploaded to public preview deployments.
test("Zentry preview expands the centre thumbnail and keeps admissions interactive", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 820 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const hero = page.locator("[data-motion-component='home-zentry-hero']");
  await expect(hero).toBeVisible();
  await expect(hero).toHaveAttribute("data-active-slide", "campus");
  await expect(hero.getByRole("heading", { level: 1 })).toHaveAccessibleName("Here, possibility begins.");
  await expect(hero.getByRole("link", { name: /Apply for Admission/i })).toHaveAttribute("href", "/admissions/enquire");
  await expect(hero.locator(".zhero__progress-item")).toHaveCount(7);

  // Hovering inside the hero pauses autoplay while the visitor considers a
  // click; the expansion is the intended primary action.
  const next = hero.getByRole("button", { name: /Expand next slide:/ });
  await expect(next).toBeVisible();
  await next.click();
  await expect(hero).toHaveAttribute("data-active-slide", "entrance", { timeout: 8_000 });
  await expect(hero.getByRole("heading", { level: 1 })).toHaveAccessibleName("Where journeys begin.");
  await expect(hero.locator(".zhero__transition-layer")).toHaveCount(0);

  await hero.getByRole("button", { name: "Previous slide" }).click();
  await expect(hero).toHaveAttribute("data-active-slide", "campus", { timeout: 8_000 });
  await hero.getByRole("button", { name: "Pause automatic slides" }).click();
  await expect(hero.getByRole("button", { name: "Resume automatic slides" })).toHaveAttribute("aria-pressed", "true");
});

test("Zentry preview supports mobile tap with accessible navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const hero = page.locator("[data-motion-component='home-zentry-hero']");
  await expect(hero).toBeVisible();
  await hero.getByRole("button", { name: /Expand next slide:/ }).tap();
  await expect(hero).toHaveAttribute("data-active-slide", "entrance", { timeout: 8_000 });
  await expect(hero.getByRole("link", { name: /Apply for Admission/i })).toBeVisible();
});

test("reduced motion changes images without a blocking expansion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const hero = page.locator("[data-motion-component='home-zentry-hero']");
  await expect(hero).toBeVisible();
  await hero.getByRole("button", { name: "Next slide" }).click();
  await expect(hero).toHaveAttribute("data-active-slide", "entrance");
  await expect(hero.locator(".zhero__transition-layer")).toHaveCount(0);
});

test("all seven V2 compositions keep meaningful navigation and decorative motifs", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 820 });
  await page.goto("/");
  const hero = page.locator("[data-motion-component='home-zentry-hero']");
  const scenes = [
    ["01", "campus", "slash", "architecture", "architectural", "vibrant", "centre-right"],
    ["02", "entrance", "curve", "pathway", "architectural", "warm", "upper-right"],
    ["03", "science", "frame", "science", "editorial", "clean", "lower-right"],
    ["04", "skating", "chevron", "motion", "kinetic", "warm", "lower-right"],
    ["05", "digital", "grid", "digital", "editorial", "clean", "lower-right"],
    ["06", "culture", "ribbon", "culture", "showcase", "vibrant", "upper-right"],
    ["07", "sports", "sport", "sport", "kinetic", "warm", "lower-right"],
  ] as const;
  for (const [chapter, id, layout, motif, family, treatment, preview] of scenes) {
    await hero.getByRole("button", { name: new RegExp(`Show slide ${chapter}:`) }).click();
    await expect(hero).toHaveAttribute("data-active-slide", id);
    await expect(hero).toHaveAttribute("data-visual-layout", layout);
    await expect(hero).toHaveAttribute("data-composition-family", family);
    await expect(hero).toHaveAttribute("data-photo-treatment", treatment);
    await expect(hero.locator(".zhero__preview-wrap")).toHaveAttribute("data-preview-position", preview);
    await expect(hero).toHaveAttribute("data-visual-review", "pending");
    await expect(hero.locator(`.zhero__motif--${motif}`)).toHaveCount(1);
    await expect(hero.getByRole("link", { name: /Apply for Admission/i })).toHaveAttribute("href", "/admissions/enquire");
    await expect(hero.locator(".zhero__transition-layer")).toHaveCount(0);
  }
});

test("configured campus crop tracks all three responsive breakpoints", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 820 });
  await page.goto("/");
  const hero = page.locator("[data-motion-component='home-zentry-hero']");
  const photo = hero.locator(".zhero__photograph");
  await expect(hero).toHaveAttribute("data-active-slide", "campus");
  await expect(photo).toHaveCSS("object-position", "58% 48%");
  await expect(hero.locator(".zhero__preview-wrap")).toHaveAttribute("style", /left: 66%/);

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(photo).toHaveCSS("object-position", "60% 48%");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(photo).toHaveCSS("object-position", "34% 50%");
  await expect(hero.getByRole("button", { name: /Expand next slide:/ })).toBeVisible();
});
