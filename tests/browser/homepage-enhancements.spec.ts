import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const viewports = [
  { width: 320, height: 720 },
  { width: 375, height: 740 },
  { width: 768, height: 1024 },
  { width: 1024, height: 800 },
  { width: 1440, height: 900 },
] as const;

const scenes = ["campus", "entrance", "science", "skating", "digital", "culture", "sports"] as const;

async function openHomepage(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("[data-motion-component='home-preloader']")).toBeHidden({ timeout: 12_000 });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".site-header")).toHaveAttribute("data-navigation-enhanced", "true");
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(overflow.document, "document horizontal overflow").toBeLessThanOrEqual(1);
  expect(overflow.body, "body horizontal overflow").toBeLessThanOrEqual(1);
}

// Check actual text ranges as well as element boxes: overflow:clip can hide a
// too-wide heading while keeping document.scrollWidth deceptively correct.
async function expectHeroContentFits(hero: Locator) {
  const violations = await hero.evaluate((root) => {
    const viewport = root.querySelector<HTMLElement>(".zhero__viewport")!;
    const frame = viewport.getBoundingClientRect();
    const tolerance = 1;
    const fits = (rect: DOMRect) => rect.left >= frame.left - tolerance &&
      rect.right <= frame.right + tolerance && rect.top >= frame.top - tolerance &&
      rect.bottom <= frame.bottom + tolerance;
    const issues: string[] = [];
    for (const element of root.querySelectorAll<HTMLElement>(
      ".zhero__kicker, .zhero__heading-line, .zhero__summary, .zhero__actions a, .zhero__controls button",
    )) {
      const label = element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.className;
      if (!fits(element.getBoundingClientRect())) issues.push(`${label}: element leaves hero frame`);
      if (element.textContent?.trim()) {
        const range = document.createRange();
        range.selectNodeContents(element);
        for (const rect of range.getClientRects()) {
          if (rect.width > 0 && rect.height > 0 && !fits(rect)) {
            issues.push(`${label}: text leaves hero frame`);
            break;
          }
        }
      }
    }
    const copy = root.querySelector<HTMLElement>(".zhero__editorial")!.getBoundingClientRect();
    const controls = root.querySelector<HTMLElement>(".zhero__controls")!.getBoundingClientRect();
    if (Math.min(copy.right, controls.right) - Math.max(copy.left, controls.left) > tolerance &&
        Math.min(copy.bottom, controls.bottom) - Math.max(copy.top, controls.top) > tolerance) {
      issues.push("hero copy overlaps slide controls");
    }
    return issues;
  });
  expect(violations, `clipped content on ${await hero.getAttribute("data-active-slide")}`).toEqual([]);
}

async function expectSectionTextFits(page: Page) {
  const violations = await page.locator(
    ".home-pathways h2, .home-pathway-card h3, .home-pathway-card p, .home-pathway-card a, " +
    ".home-admissions-feature h2, .home-admissions-feature p, .home-admissions-feature strong, .home-admissions-feature a",
  ).evaluateAll((elements) => elements.flatMap((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const width = document.documentElement.clientWidth;
    const clipped = Array.from(range.getClientRects()).some((rect) => rect.left < -1 || rect.right > width + 1);
    return clipped ? [element.textContent?.trim()] : [];
  }));
  expect(violations, "programme/admissions text leaves the page").toEqual([]);
}

async function expectVisibleFocus(target: Locator) {
  await expect(target).toBeFocused();
  const focus = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: Number.parseFloat(style.outlineWidth), style: style.outlineStyle };
  });
  expect(focus.width, "keyboard focus outline thickness").toBeGreaterThanOrEqual(2);
  expect(focus.style).not.toBe("none");
}

for (const viewport of viewports) {
  test(`homepage content and all available scenes fit at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openHomepage(page);
    await expectNoHorizontalOverflow(page);
    await expectSectionTextFits(page);

    const hero = page.locator("[data-motion-component='home-zentry-hero']");
    // Publication approval can legitimately select the static fallback. Do not
    // force-enable draft media just to run the seven-scene geometry checks.
    if (await hero.count()) {
      await expect(hero.locator(".zhero__progress-item")).toHaveCount(scenes.length);
      for (const [index, id] of scenes.entries()) {
        const selector = hero.getByRole("button", { name: new RegExp(`^Show slide ${String(index + 1).padStart(2, "0")}:`) });
        await selector.click();
        await expect(hero).toHaveAttribute("data-active-slide", id);
        await expect(selector).toHaveAttribute("aria-current", "true");
        await expect(hero.locator(".zhero__progress-item[aria-current='true']")).toHaveCount(1);
        if (process.env.HOMEPAGE_REVIEW_MODE !== "private") {
          const photograph = hero.locator(".zhero__photograph");
          await expect(photograph).toHaveAttribute("src", new RegExp(`/media/home/production/hero/${id}/full-`));
          await expect.poll(() => photograph.evaluate((image) =>
            (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
          ), { message: `approved ${id} photograph loads` }).toBe(true);
        }
        await expectHeroContentFits(hero);
        await expectNoHorizontalOverflow(page);
        await expect(hero.getByRole("link", { name: /Apply for Admission/i })).toHaveAttribute("href", "/admissions/enquire");
      }
    } else {
      await expect(page.locator(".home-hero")).toBeVisible();
    }

    const menu = page.getByRole("button", { name: "Open navigation" });
    if (await menu.isVisible()) {
      await menu.focus();
      await page.keyboard.press("Enter");
      const drawer = page.getByRole("dialog", { name: "Site navigation" });
      await expect(drawer).toBeVisible();
      await expectNoHorizontalOverflow(page);
      const drawerBounds = await drawer.boundingBox();
      expect(drawerBounds!.x).toBeGreaterThanOrEqual(-1);
      expect(drawerBounds!.x + drawerBounds!.width).toBeLessThanOrEqual(viewport.width + 1);
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
      await expectVisibleFocus(menu);
    } else {
      await expect(page.getByRole("navigation", { name: "Primary navigation", exact: true })).toBeVisible();
    }
  });
}

test("hero controls, programme links and admissions CTAs work with a keyboard", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHomepage(page);

  const hero = page.locator("[data-motion-component='home-zentry-hero']");
  if (await hero.count()) {
    const next = hero.getByRole("button", { name: "Next slide", exact: true });
    await next.focus();
    await expectVisibleFocus(next);
    await page.keyboard.press("Enter");
    await expect(hero).toHaveAttribute("data-active-slide", "entrance");
    await expect(next).toBeFocused();
    await page.keyboard.press("Tab");
    const pause = hero.getByRole("button", { name: "Pause automatic slides" });
    await expectVisibleFocus(pause);
    await page.keyboard.press("Space");
    await expect(hero.getByRole("button", { name: "Resume automatic slides" })).toHaveAttribute("aria-pressed", "true");
    await expect(hero.locator(".zhero__status")).toHaveAttribute("aria-live", "polite");
  }

  const programmeLinks = page.locator(".home-pathway-card a[href]");
  expect(await programmeLinks.count(), "approved programme links remain available").toBeGreaterThan(0);
  for (const link of await programmeLinks.all()) {
    await link.scrollIntoViewIfNeeded();
    await link.focus();
    await expectVisibleFocus(link);
    const href = await link.getAttribute("href");
    const response = await request.get(href!);
    expect(response.ok(), `programme route ${href}`).toBe(true);
  }

  const enquiry = page.locator(".home-admissions-feature a[href='/admissions/enquire']");
  await enquiry.scrollIntoViewIfNeeded();
  await enquiry.focus();
  await expectVisibleFocus(enquiry);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/admissions\/enquire$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await openHomepage(page);
  const process = page.locator(".home-admissions-feature a[href='/admissions/process']");
  await process.scrollIntoViewIfNeeded();
  await process.focus();
  await expectVisibleFocus(process);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/admissions\/process$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("mobile menu keeps its keyboard trap and follows admissions links at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHomepage(page);
  const menu = page.getByRole("button", { name: "Open navigation" });
  await menu.focus();
  await page.keyboard.press("Enter");
  const drawer = page.getByRole("dialog", { name: "Site navigation" });
  await expect(drawer).toBeVisible();
  await expect(page.locator("#main-content")).toHaveAttribute("inert", "");
  const admission = drawer.locator("a[href='/admissions/apply']").last();
  await admission.focus();
  await page.keyboard.press("Tab");
  await expect(drawer.getByRole("link", { name: "SSKEMS home" })).toBeFocused();
  await admission.focus();
  await expectVisibleFocus(admission);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/admissions\/(?:apply|enquire)$/);
  await expect(drawer).toBeHidden();
  await expect(page.locator("#main-content")).not.toHaveAttribute("inert", "");
});

test("programme cards and admissions buttons give bounded hover and stationary focus feedback", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHomepage(page);
  const card = page.locator(".home-pathway-card--approved-public-subset").first();
  const button = page.locator(".home-admissions-feature .home-button").first();
  for (const [target, maximumLift] of [[card, 2], [button, 1]] as const) {
    await target.scrollIntoViewIfNeeded();
    await expect.poll(() => target.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
    // Buttons inherit the intro panel's reveal. Its moving parent must also
    // finish before a pointer position can represent sustained hover.
    await expect.poll(() => target.evaluate((element) => {
      const panel = element.closest("[data-home-section-reveal]");
      if (!panel) return true;
      const style = getComputedStyle(panel);
      return style.opacity === "1" && style.transform === "none";
    })).toBe(true);
    // A one-time reveal may still be clearing its transform after opacity
    // reaches one. Start the hover measurement only from its resting state.
    await page.mouse.move(0, 0);
    await expect.poll(() => target.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
    const before = await target.boundingBox();
    const resting = await target.evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, shadow: style.boxShadow, border: style.borderColor };
    });
    await target.hover();
    await expect.poll(() => target.evaluate((element) => element.matches(":hover"))).toBe(true);
    await expect.poll(() => target.evaluate((element, baseline) => {
      const style = getComputedStyle(element);
      const lift = style.transform === "none" ? 0 : new DOMMatrixReadOnly(style.transform).m42;
      return {
        bounded: lift >= -baseline.maximumLift - 0.1 && lift <= 0.1,
        feedback: lift < -0.1 || style.backgroundColor !== baseline.resting.background ||
          style.boxShadow !== baseline.resting.shadow || style.borderColor !== baseline.resting.border,
      };
    }, { resting, maximumLift })).toEqual({ bounded: true, feedback: true });
    const after = await target.boundingBox();
    expect(Math.abs(after!.width - before!.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(1);
    await page.mouse.move(0, 0);
    const link = target === card ? card.getByRole("link") : button;
    await link.focus();
    await expectVisibleFocus(link);
    await expect.poll(() => target.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  }
});

test.describe("homepage touch interaction", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 740 } });

  test("375px slide selectors remain usable without hover", async ({ page }) => {
    await openHomepage(page);
    const hero = page.locator("[data-motion-component='home-zentry-hero']");
    test.skip(!(await hero.count()), "Publication gate selected the static hero fallback.");
    expect(await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches)).toBe(false);
    for (const selector of await hero.locator(".zhero__progress-item").all()) {
      const bounds = await selector.boundingBox();
      expect(bounds!.height, "slide selector touch height").toBeGreaterThanOrEqual(44);
      expect(bounds!.width, "slide selector touch width").toBeGreaterThanOrEqual(24);
    }
    await hero.getByRole("button", { name: /Expand next slide:/ }).tap();
    await expect(hero).toHaveAttribute("data-active-slide", "entrance");
    await expect(hero.locator(".zhero__transition-layer")).toHaveCount(0);
    await hero.getByRole("button", { name: "Previous slide" }).tap();
    await expect(hero).toHaveAttribute("data-active-slide", "campus");
    await expect(hero.getByRole("link", { name: /Apply for Admission/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

for (const width of [375, 1440]) {
  test(`homepage and seven-scene contrast remain accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openHomepage(page);
    const homepage = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(homepage.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);

    const hero = page.locator("[data-motion-component='home-zentry-hero']");
    if (await hero.count()) {
      for (const [index, id] of scenes.entries()) {
        await hero.locator(".zhero__progress-item").nth(index).click();
        await expect(hero).toHaveAttribute("data-active-slide", id);
        const scene = await new AxeBuilder({ page }).include(".zhero").withTags(["wcag2a", "wcag2aa"]).analyze();
        expect(scene.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical"), id).toEqual([]);
      }
    }
  });
}

test("reduced motion keeps all seven scenes and section reveals static", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHomepage(page);
  const hero = page.locator("[data-motion-component='home-zentry-hero']");
  test.skip(!(await hero.count()), "Publication gate selected the static hero fallback.");
  for (const [index, id] of scenes.entries()) {
    await hero.locator(".zhero__progress-item").nth(index).click();
    await expect(hero).toHaveAttribute("data-active-slide", id);
    await expect(hero.locator(".zhero__transition-layer")).toHaveCount(0);
    const intro = await hero.locator("[data-zhero-intro]").evaluateAll((elements) => elements.map((element) => {
      const style = getComputedStyle(element);
      return { opacity: style.opacity, transform: style.transform, transitionDuration: style.transitionDuration };
    }));
    expect(intro.every((state) => state.opacity === "1" && state.transform === "none"), id).toBe(true);
    expect(intro.every((state) => state.transitionDuration.split(", ").every((duration) => Number.parseFloat(duration) === 0)), id).toBe(true);
  }
  const staticTargets = page.locator("[data-motion-home-pathway-card], [data-home-section-reveal]");
  for (const target of await staticTargets.all()) {
    await target.scrollIntoViewIfNeeded();
    expect(await target.evaluate((element) => {
      const style = getComputedStyle(element);
      return style.opacity === "1" && style.transform === "none" && style.clipPath === "none";
    })).toBe(true);
  }
  await expectNoHorizontalOverflow(page);
});

for (const width of [375, 1440]) {
  test(`animated scene changes keep the page geometry stable at ${width}px`, async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await openHomepage(page);
    const hero = page.locator("[data-motion-component='home-zentry-hero']");
    test.skip(!(await hero.count()), "Publication gate selected the static hero fallback.");
    const pause = hero.getByRole("button", { name: "Pause automatic slides" });
    if (await pause.isVisible()) await pause.click();
    // Wait for entrance targets to clear their transient GSAP styles before
    // measuring. Subsequent copy animations may transform, but must not reflow.
    await expect.poll(() => hero.locator("[data-zhero-intro]").evaluateAll((elements) =>
      elements.every((element) => getComputedStyle(element).opacity === "1" && getComputedStyle(element).transform === "none"),
    )).toBe(true);
    const geometry = () => hero.evaluate((root) => {
      const frame = root.getBoundingClientRect();
      const next = root.nextElementSibling?.getBoundingClientRect();
      return { height: frame.height, nextTop: (next?.top ?? frame.bottom) + window.scrollY };
    });
    const before = await geometry();
    await page.evaluate(() => {
      const state = { total: 0, external: 0, essential: 0, unexpected: 0, entries: [] as {
        value: number; hadRecentInput: boolean; time: number; sources: string[];
      }[] };
      (window as unknown as { homepageShift: typeof state }).homepageShift = state;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            value: number; hadRecentInput: boolean;
            sources: { node: Node | null }[];
          };
          const elements = shift.sources.map(({ node }) => node instanceof Element ? node : node?.parentElement);
          state.total += shift.value;
          if (elements.some((element) => !element?.closest(".zhero"))) state.external += shift.value;
          if (elements.some((element) => element?.closest(".zhero__editorial, .zhero__controls"))) state.essential += shift.value;
          if (elements.some((element) => !element?.closest(
            ".zhero__shade, .zhero__brand-accent, .zhero__scene-art, .zhero__preview-wrap",
          ))) state.unexpected += shift.value;
          state.entries.push({
            value: shift.value,
            hadRecentInput: shift.hadRecentInput,
            time: shift.startTime,
            sources: elements.map((element) => element?.getAttribute("class") ?? element?.tagName ?? "unknown"),
          });
        }
      }).observe({ type: "layout-shift" });
    });
    for (let index = 1; index <= scenes.length; index++) {
      const id = scenes[index % scenes.length];
      await hero.getByRole("button", { name: "Next slide", exact: true }).click();
      await expect(hero).toHaveAttribute("data-active-slide", id);
      await expect(hero.locator(".zhero__transition-layer")).toHaveCount(0);
      await expect.poll(() => hero.locator("[data-zhero-intro]").evaluateAll((elements) =>
        elements.every((element) => getComputedStyle(element).opacity === "1" && getComputedStyle(element).transform === "none"),
      )).toBe(true);
      const after = await geometry();
      expect(Math.abs(after.height - before.height), `${id} hero height change`).toBeLessThanOrEqual(1);
      expect(Math.abs(after.nextTop - before.nextTop), `${id} following section shift`).toBeLessThanOrEqual(1);
      await expectHeroContentFits(hero);
      await expectNoHorizontalOverflow(page);
    }
    const shifts = await page.evaluate(() => {
      const measured = (window as unknown as { homepageShift: {
        total: number; external: number; essential: number; unexpected: number;
        entries: { value: number; hadRecentInput: boolean; time: number; sources: string[] }[];
      } }).homepageShift;
      let rawCls = 0;
      let sessionValue = 0;
      let sessionStart = -Infinity;
      let lastShift = -Infinity;
      for (const entry of measured.entries) {
        if (entry.hadRecentInput) continue;
        if (entry.time - lastShift > 1_000 || entry.time - sessionStart > 5_000) {
          sessionStart = entry.time;
          sessionValue = 0;
        }
        sessionValue += entry.value;
        lastShift = entry.time;
        rawCls = Math.max(rawCls, sessionValue);
      }
      return { ...measured, rawCls };
    });
    await test.info().attach("homepage-scene-layout-shifts", {
      body: JSON.stringify(shifts, null, 2), contentType: "application/json",
    });
    // Seven approved compositions intentionally reposition decorative motifs,
    // shade shapes and the next-scene preview. Track those raw browser entries
    // for review, while guarding document reflow and essential interactive copy.
    expect(shifts.external, "layout shift outside the carousel, including recent-input entries").toBeLessThanOrEqual(0.01);
    expect(shifts.essential, "layout shift in hero copy or controls, including recent-input entries").toBeLessThanOrEqual(0.01);
    expect(shifts.unexpected, "layout shift beyond explicitly composed hero artwork/preview").toBeLessThanOrEqual(0.01);
  });
}
