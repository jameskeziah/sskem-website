import { expect, test } from "@playwright/test";

// Run against a build with HOMEPAGE_PUBLIC_PRELOADER=true and
// HOMEPAGE_REVIEW_MODE=public. This is deliberately separate from the
// private-review suite so accidental private-content exposure is caught.
test("public visitors see the branded preloader and a synchronized hero handoff", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.addInitScript(() => {
    const seen = new Set<string>();
    const observer = new MutationObserver(() => {
      const state = document.querySelector<HTMLElement>(
        "[data-motion-component='home-preloader']",
      )?.dataset.state;
      if ((state === "loading" || state === "exit-reveal") && !seen.has(state)) {
        seen.add(state);
        performance.mark(`sskem-public-preloader-${state}`);
      }
    });
    observer.observe(document, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-state"],
    });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const preloader = page.locator("[data-motion-component='home-preloader']");
  await expect(preloader).toBeVisible();
  await expect(preloader).toHaveAttribute("data-state", "loading");
  await expect(preloader.locator(".home-preloader__meta")).toContainText("Welcome");
  await expect(preloader).not.toContainText("Private review");
  await expect(page.locator(".home-hero")).toHaveAttribute("data-homepage-review-mode", "public");
  await expect(page.locator(".home-hero__review-note")).toHaveCount(0);

  await expect(preloader).toHaveAttribute("data-state", "exit-reveal", { timeout: 6_000 });
  const visibleFor = await page.evaluate(() => {
    const started = performance.getEntriesByName("sskem-public-preloader-loading", "mark")[0];
    const exiting = performance.getEntriesByName("sskem-public-preloader-exit-reveal", "mark")[0];
    return started && exiting ? exiting.startTime - started.startTime : null;
  });
  expect(visibleFor).not.toBeNull();
  expect(visibleFor!).toBeGreaterThanOrEqual(1_400);
  await expect(preloader).toBeHidden({ timeout: 6_000 });
  await expect.poll(() => page.evaluate(
    () => document.documentElement.dataset.homeArrivalReady,
  )).toBe("true");
  await expect.poll(() => page.evaluate(
    () => document.body.dataset.homePreloader ?? null,
  )).toBeNull();

  // Re-entry must not replay automatically; visitors can request it explicitly.
  await page.goto("/admissions");
  await page.goto("/");
  await expect(preloader).toHaveAttribute("data-state", "complete");
  await expect(preloader).toBeHidden();
  await page.goto("/?replayPreloader=1", { waitUntil: "domcontentloaded" });
  await expect(preloader).toBeVisible();
  await expect(preloader).toHaveAttribute("data-state", "loading");
  await expect(preloader).toBeHidden({ timeout: 6_000 });
});

test("public preloader never blocks reduced-motion visitors", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?replayPreloader=1");
  await expect(page.locator("[data-motion-component='home-preloader']")).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: /Here, possibility begins/i })).toBeVisible();
  await expect.poll(() => page.evaluate(
    () => document.body.dataset.homePreloader ?? null,
  )).toBeNull();
});

test("public homepage stays readable without JavaScript", async ({ page }) => {
  await page.route("**/*.js", (route) => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-motion-component='home-preloader']")).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: /Here, possibility begins/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Enquire now/i }).first()).toBeVisible();
});

test("public preloader flag does not unlock private-review routes", async ({ request }) => {
  const response = await request.get("/publication-review");
  expect(response.status()).toBe(404);
});
