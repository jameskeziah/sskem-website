import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const privateReviewHeaders = {
  "oai-authenticated-user-id": "local-private-review-test",
  "oai-authenticated-user-email": "reviewer@example.invalid",
};

const routes = [
  { path: "/school/academics", title: "School academics" },
  { path: "/junior-college", title: "Junior College" },
  { path: "/programmes/jee-neet", title: "JEE and NEET preparation" },
] as const;

async function pageOverflow(page: Page) {
  return page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
}

async function clippedCriticalElements(page: Page) {
  return page.locator([
    "main h1",
    ".private-programme-shell__routes",
    ".private-programme-shell__state",
    ".programme-media-slot",
    ".private-programme-shell__slots > li",
    ".private-programme-shell__actions-grid",
  ].join(", ")).evaluateAll((elements) => elements.flatMap((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1
      ? [{ tag: element.tagName, className: element.className, left: rect.left, right: rect.right }]
      : [];
  }));
}

for (const route of routes) {
  test(`${route.path} passes WCAG semantics and automated contrast checks`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.getByRole("heading", { level: 1, name: route.title })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);

    const contrast = await new AxeBuilder({ page })
      .include("main[data-private-programme-shell]")
      .withRules(["color-contrast"])
      .analyze();
    expect(contrast.violations, JSON.stringify(contrast.violations, null, 2)).toEqual([]);
    expect(
      contrast.incomplete.filter(({ id }) => id === "color-contrast"),
      "Automated contrast analysis must not leave Programme content unresolved.",
    ).toEqual([]);
  });

  test(`${route.path} exposes a coherent screen-reader structure`, async ({ page }) => {
    await page.goto(route.path);
    const main = page.getByRole("main");

    await expect(main).toHaveCount(1);
    await expect(main.getByRole("heading", { level: 1, name: route.title })).toHaveCount(1);
    await expect(main.getByRole("navigation", { name: "Private Programme route shells" })).toHaveCount(1);
    await expect(main.locator(".private-programme-shell__slots > li")).toHaveCount(10);

    const accessibilityTree = await main.ariaSnapshot();
    expect(accessibilityTree).toContain(`heading "${route.title}" [level=1]`);
    expect(accessibilityTree).toContain("navigation \"Private Programme route shells\"");
    expect(accessibilityTree).toContain("Private review only");
    expect(accessibilityTree).toContain("Awaiting approved source");

    const headingLevels = await main.locator("h1, h2, h3, h4, h5, h6").evaluateAll((headings) =>
      headings.map((heading) => Number(heading.tagName.slice(1))),
    );
    expect(headingLevels[0]).toBe(1);
    for (let index = 1; index < headingLevels.length; index += 1) {
      expect(headingLevels[index] - headingLevels[index - 1], "Heading levels must not skip downward.").toBeLessThanOrEqual(1);
    }

    const media = main.locator(".programme-media-slot");
    const alternative = await media.locator("img").getAttribute("alt");
    expect(alternative?.trim().length).toBeGreaterThanOrEqual(20);
    await expect(media.locator("figcaption")).toBeVisible();
  });
}

test("keyboard users can skip the header and traverse the Programme route switcher", async ({ page }) => {
  await page.goto("/school/academics");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();

  const routeLinks = page.getByRole("navigation", { name: "Private Programme route shells" }).getByRole("link");
  for (let index = 0; index < 3; index += 1) {
    await page.keyboard.press("Tab");
    await expect(routeLinks.nth(index)).toBeFocused();
    const focusStyle = await routeLinks.nth(index).evaluate((element) => {
      const style = getComputedStyle(element);
      return { outlineStyle: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth) };
    });
    expect(focusStyle.outlineStyle).not.toBe("none");
    expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(2);
  }
});

for (const width of [320, 360, 768]) {
  test(`all private Programme shells reflow without clipping at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { level: 1, name: route.title })).toBeVisible();
      const overflow = await pageOverflow(page);
      expect(overflow.scrollWidth - overflow.clientWidth, `${route.path} page-level overflow`).toBeLessThanOrEqual(1);
      expect(await clippedCriticalElements(page), `${route.path} clipped critical content`).toEqual([]);

      const routeLinkHeights = await page.locator(".private-programme-shell__routes a").evaluateAll((links) =>
        links.map((link) => link.getBoundingClientRect().height),
      );
      expect(routeLinkHeights.every((height) => height >= 44)).toBe(true);
    }
  });
}

test("Programme shells reflow at the 200-percent browser-zoom equivalent", async ({ page }) => {
  // Browser zoom reduces the CSS viewport. 640 CSS px represents a 1280 px desktop viewport at 200% zoom.
  await page.setViewportSize({ width: 640, height: 900 });

  for (const route of routes) {
    await page.goto(route.path);
    const overflow = await pageOverflow(page);
    expect(overflow.scrollWidth - overflow.clientWidth, `${route.path} at 200% zoom`).toBeLessThanOrEqual(1);
    expect(await clippedCriticalElements(page), `${route.path} clipping at 200% zoom`).toEqual([]);
    await expect(page.getByRole("heading", { level: 1, name: route.title })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open content package" })).toBeVisible();
  }
});

test("reduced motion leaves Programme content static and readable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const route of routes) {
    await page.goto(route.path);
    await expect(page.getByRole("heading", { level: 1, name: route.title })).toBeVisible();
    const motionState = await page.locator("main[data-private-programme-shell]").evaluate((main) => {
      const nonZero = (value: string) => value.split(",").some((part) => Number.parseFloat(part) > 0);
      const moving = Array.from(main.querySelectorAll("*"), (element) => {
        const style = getComputedStyle(element);
        return {
          className: element.className,
          animationDuration: style.animationDuration,
          transitionDuration: style.transitionDuration,
        };
      }).filter((state) => nonZero(state.animationDuration) || nonZero(state.transitionDuration));
      return {
        moving,
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        autoplayVideos: main.querySelectorAll("video[autoplay]").length,
      };
    });

    expect(motionState.scrollBehavior).toBe("auto");
    expect(motionState.moving).toEqual([]);
    expect(motionState.autoplayVideos).toBe(0);
  }
});

test("essential Programme content and navigation remain available without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({
    extraHTTPHeaders: privateReviewHeaders,
    javaScriptEnabled: false,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 360, height: 740 },
  });
  const page = await context.newPage();

  for (const route of routes) {
    const response = await page.goto(new URL(route.path, baseUrl).href, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: route.title })).toBeVisible();
    await expect(page.locator(".private-programme-shell__slots > li")).toHaveCount(10);
    await expect(page.locator(".programme-media-slot img")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open content package" })).toBeVisible();
    await expect(page.locator(".mobile-menu-button")).toBeHidden();

    const fallback = page.locator(".static-navigation-fallback");
    await expect(fallback).toBeVisible();
    await fallback.locator("summary").click();
    await expect(page.getByRole("navigation", { name: "Primary navigation without JavaScript" })).toBeVisible();

    const overflow = await pageOverflow(page);
    expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(1);
  }

  await context.close();
});
