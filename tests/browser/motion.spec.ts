import { expect, test } from "@playwright/test";

const localBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

async function computedTranslateY(locator: import("@playwright/test").Locator) {
  return locator.evaluate((element) => {
    const transform = getComputedStyle(element).transform;
    return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
  });
}

test("keeps admissions readable and navigable when hydration scripts fail", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.route("**/*.js", (route) => route.abort());
  await page.goto("/admissions", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { level: 1, name: /Admissions, made clearer/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Make an Enquiry", exact: true })).toBeVisible();
  await expect(page.locator(".mobile-menu-button")).toBeHidden();

  const fallback = page.locator(".static-navigation-fallback");
  await expect(fallback).toBeVisible();
  await fallback.locator("summary").click();
  await expect(page.getByRole("navigation", { name: "Primary navigation without JavaScript" })).toBeVisible();
  await expect(fallback.getByRole("link", { name: "Documents", exact: true }).first()).toBeVisible();

  const finalStates = await page.locator("[data-motion-hero-intro], [data-motion-step]").evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return { opacity: style.opacity, transform: style.transform };
    }),
  );
  expect(finalStates.every((state) => state.opacity === "1" && state.transform === "none")).toBe(true);
});

test("keeps the homepage narrative readable when hydration scripts fail", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.route("**/*.js", (route) => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { level: 1, name: /Here, possibility begins/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Enquire now/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Mandatory Public Disclosure", exact: true }).first()).toBeVisible();
  await expect(page.locator(".mobile-menu-button")).toBeHidden();

  const fallback = page.locator(".static-navigation-fallback");
  await expect(fallback).toBeVisible();
  await fallback.locator("summary").click();
  await expect(page.getByRole("navigation", { name: "Primary navigation without JavaScript" })).toBeVisible();

  const finalStates = await page.locator("[data-motion-home-hero-heading], [data-motion-home-campus-frame], [data-motion-home-achievement]").evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return { opacity: style.opacity, transform: style.transform, clipPath: style.clipPath };
    }),
  );
  expect(finalStates.every((state) => state.opacity === "1" && state.transform === "none" && state.clipPath === "none")).toBe(true);
});

test("provides the static navigation fallback when JavaScript is disabled", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 360, height: 740 },
  });
  const page = await context.newPage();
  await page.goto(`${localBaseUrl}/documents`);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const fallback = page.locator(".static-navigation-fallback");
  await expect(fallback).toBeVisible();
  await fallback.locator("summary").click();
  await expect(fallback.getByRole("link", { name: "Admissions", exact: true }).first()).toBeVisible();
  await expect(page.locator(".mobile-menu-button")).toBeHidden();

  await context.close();
});

test("reduced motion leaves every motion target in its final static state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/admissions");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const rootMotion = await page.evaluate(() => ({
    standard: getComputedStyle(document.documentElement).getPropertyValue("--motion-duration-standard").trim(),
    deliberate: getComputedStyle(document.documentElement).getPropertyValue("--motion-duration-deliberate").trim(),
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
  }));
  expect(rootMotion).toEqual({ standard: "0s", deliberate: "0s", scrollBehavior: "auto" });

  await page.locator("[data-motion-component='admissions-steps']").scrollIntoViewIfNeeded();
  const states = await page.locator("[data-motion-hero-intro], [data-motion-hero-mask], [data-motion-step]").evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return {
        opacity: style.opacity,
        transform: style.transform,
        clipPath: style.clipPath,
        animationDuration: style.animationDuration,
      };
    }),
  );
  expect(states.every((state) => state.opacity === "1")).toBe(true);
  expect(states.every((state) => state.transform === "none")).toBe(true);
  expect(states.every((state) => state.clipPath === "none")).toBe(true);
  expect(states.every((state) => state.animationDuration === "0s")).toBe(true);
});

test("reduced motion leaves the homepage story in its final static state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.locator("[data-motion-component='home-campus']").scrollIntoViewIfNeeded();
  await page.locator("[data-motion-component='home-achievements']").scrollIntoViewIfNeeded();
  const states = await page.locator("[data-motion-home-hero-heading], [data-motion-home-hero-accent], [data-motion-home-campus-copy], [data-motion-home-campus-frame], [data-motion-home-achievement]").evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return {
        opacity: style.opacity,
        transform: style.transform,
        clipPath: style.clipPath,
        willChange: style.willChange,
      };
    }),
  );

  expect(states.every((state) => state.opacity === "1")).toBe(true);
  expect(states.every((state) => state.transform === "none")).toBe(true);
  expect(states.every((state) => state.clipPath === "none")).toBe(true);
  expect(states.every((state) => state.willChange === "auto")).toBe(true);
});

test("fine-pointer hover stays inside the approved lift limits and focus does not move", async ({ page }) => {
  await page.goto("/");
  const button = page.locator(".header-cta");
  await button.hover();
  await expect.poll(() => computedTranslateY(button)).toBeCloseTo(-1, 1);

  await page.mouse.move(0, 0);
  await button.focus();
  const buttonFocus = await button.evaluate((element) => {
    const style = getComputedStyle(element);
    const transform = style.transform;
    return {
      outlineWidth: Number.parseFloat(style.outlineWidth),
      translateY: transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42,
    };
  });
  expect(buttonFocus.outlineWidth).toBeGreaterThanOrEqual(2);
  await expect.poll(() => computedTranslateY(button)).toBe(0);

  await page.goto("/admissions");
  const card = page.locator(".admissions-action").first();
  await card.hover();
  await expect.poll(() => computedTranslateY(card)).toBeCloseTo(-2, 1);

  await page.mouse.move(0, 0);
  await card.getByRole("link").focus();
  await expect.poll(() => computedTranslateY(card)).toBe(0);
  const outlineWidth = await card.getByRole("link").evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).outlineWidth),
  );
  expect(outlineWidth).toBeGreaterThanOrEqual(2);
});

test("touch mobile uses the non-hover motion substitution", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 360, height: 740 },
  });
  const page = await context.newPage();
  await page.goto(`${localBaseUrl}/admissions`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  expect(await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches)).toBe(false);
  const card = page.locator(".admissions-action").first();
  await card.getByRole("link").focus();
  expect(await computedTranslateY(card)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

  await context.close();
});

test("admissions reveals play once and clean up their inline animation state", async ({ page }) => {
  await page.goto("/admissions");
  const sequence = page.locator("[data-motion-component='admissions-steps']");
  await sequence.scrollIntoViewIfNeeded();

  await expect.poll(async () =>
    sequence.locator("[data-motion-step]").evaluateAll((items) =>
      items.every((item) => {
        const style = getComputedStyle(item);
        return style.opacity === "1" && style.transform === "none" && style.willChange === "auto";
      }),
    ),
  ).toBe(true);

  await page.evaluate(() => window.scrollTo(0, 0));
  await sequence.scrollIntoViewIfNeeded();
  expect(await sequence.locator("[data-motion-step]").evaluateAll((items) =>
    items.every((item) => getComputedStyle(item).opacity === "1" && getComputedStyle(item).transform === "none"),
  )).toBe(true);

  await page.goto("/documents");
  await expect(page.locator("[data-motion-component]")).toHaveCount(0);
  await page.goto("/admissions");
  await expect(page.locator("[data-motion-component='admissions-hero']")).toHaveCount(1);
  await expect(page.locator("[data-motion-component='admissions-steps']")).toHaveCount(1);
});
